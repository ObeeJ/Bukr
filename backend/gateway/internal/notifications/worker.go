/**
 * Notification Worker
 *
 * Two goroutines, one responsibility each:
 *
 * 1. Scheduler (runs every SchedulerInterval):
 *    - Queries DB for events starting in the next 25 hours
 *    - For each event × reminder window (24h, 1h, 10min):
 *      - Computes the exact fire_at timestamp
 *      - Enqueues a job into a Redis sorted set (score = Unix timestamp)
 *      - Uses NX so re-runs never create duplicates
 *
 * 2. Worker (runs every WorkerInterval):
 *    - Pops all jobs whose score <= now from the sorted set
 *    - Dispatches each notification (email / push stub — swap in real provider)
 *    - Marks job as done by moving it to a completed set (for audit)
 *
 * Redis key layout:
 *   bukr:reminders:pending   — ZSET, score = fire_at Unix timestamp
 *   bukr:reminders:done      — ZSET, score = processed_at Unix timestamp (TTL 7 days)
 *
 * Job payload (JSON stored as ZSET member):
 *   { "job_id", "event_id", "event_title", "event_starts_at", "user_id",
 *     "user_email", "reminder_type" }
 *
 * Graceful degradation:
 *   If Redis is nil, the worker logs a warning and exits immediately.
 *   The rest of the application is unaffected.
 */

package notifications

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// ── Constants ─────────────────────────────────────────────────────────────────

const (
	pendingKey        = "bukr:reminders:pending"
	doneKey           = "bukr:reminders:done"
	SchedulerInterval = 15 * time.Minute // How often the scheduler scans the DB
	WorkerInterval    = 30 * time.Second // How often the worker drains the queue
	doneTTL           = 7 * 24 * time.Hour
)

// reminderWindows defines when before an event each reminder fires.
// The label is included in the notification so users know which reminder it is.
var reminderWindows = []struct {
	before time.Duration
	label  string
}{
	{24 * time.Hour, "24h"},
	{1 * time.Hour, "1h"},
	{10 * time.Minute, "10min"},
}

// ── Job payload ───────────────────────────────────────────────────────────────

type ReminderJob struct {
	JobID          string    `json:"job_id"`           // Unique: eventID:userID:reminderType
	EventID        string    `json:"event_id"`
	EventTitle     string    `json:"event_title"`
	EventStartsAt  time.Time `json:"event_starts_at"`
	UserID         string    `json:"user_id"`
	UserEmail      string    `json:"user_email"`
	ReminderType   string    `json:"reminder_type"`    // "24h" | "1h" | "10min"
}

// ── Worker ────────────────────────────────────────────────────────────────────

type Worker struct {
	db    *pgxpool.Pool
	redis *redis.Client
}

func NewWorker(db *pgxpool.Pool, rdb *redis.Client) *Worker {
	return &Worker{db: db, redis: rdb}
}

// Start launches the scheduler and worker goroutines.
// Call this once from main after all dependencies are ready.
// Both goroutines respect ctx cancellation for clean shutdown.
func (w *Worker) Start(ctx context.Context) {
	if w.redis == nil {
		log.Println("notifications: Redis unavailable — reminder worker disabled")
		return
	}
	if w.db == nil {
		log.Println("notifications: DB unavailable — reminder worker disabled")
		return
	}

	log.Println("notifications: worker started")

	go w.runScheduler(ctx)
	go w.runWorker(ctx)
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

func (w *Worker) runScheduler(ctx context.Context) {
	// Run immediately on start, then on every tick.
	w.schedule(ctx)

	ticker := time.NewTicker(SchedulerInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("notifications: scheduler stopped")
			return
		case <-ticker.C:
			w.schedule(ctx)
		}
	}
}

// schedule queries for events starting within the next 25 hours and enqueues
// reminder jobs for every attendee × reminder window combination.
// 25h lookahead ensures the 24h reminder is always enqueued before it fires.
func (w *Worker) schedule(ctx context.Context) {
	rows, err := w.db.Query(ctx, `
		SELECT
			e.id::text,
			e.title,
			(e.date + e.time) AS starts_at,
			t.user_id::text,
			u.email
		FROM events e
		JOIN tickets t ON t.event_id = e.id AND t.status = 'valid'
		JOIN users u   ON u.id = t.user_id
		WHERE e.status = 'active'
		  AND (e.date + e.time) BETWEEN NOW() AND NOW() + INTERVAL '25 hours'
	`)
	if err != nil {
		log.Printf("notifications: scheduler query failed: %v", err)
		return
	}
	defer rows.Close()

	enqueued := 0
	for rows.Next() {
		var eventID, title, userID, email string
		var startsAt time.Time

		if err := rows.Scan(&eventID, &title, &startsAt, &userID, &email); err != nil {
			log.Printf("notifications: row scan failed: %v", err)
			continue
		}

		for _, window := range reminderWindows {
			fireAt := startsAt.Add(-window.before)

			// Skip if the fire time is already in the past.
			if fireAt.Before(time.Now()) {
				continue
			}

			job := ReminderJob{
				JobID:         fmt.Sprintf("%s:%s:%s", eventID, userID, window.label),
				EventID:       eventID,
				EventTitle:    title,
				EventStartsAt: startsAt,
				UserID:        userID,
				UserEmail:     email,
				ReminderType:  window.label,
			}

			payload, err := json.Marshal(job)
			if err != nil {
				continue
			}

			// ZADD NX: only add if this job_id is not already in the set.
			// This makes the scheduler idempotent — safe to re-run every 15 minutes.
			w.redis.ZAddNX(ctx, pendingKey, redis.Z{
				Score:  float64(fireAt.Unix()),
				Member: string(payload),
			})
			enqueued++
		}
	}

	if enqueued > 0 {
		log.Printf("notifications: scheduler enqueued %d reminder jobs", enqueued)
	}
}

// ── Worker ────────────────────────────────────────────────────────────────────

func (w *Worker) runWorker(ctx context.Context) {
	ticker := time.NewTicker(WorkerInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("notifications: worker stopped")
			return
		case <-ticker.C:
			w.drain(ctx)
		}
	}
}

// drainScript atomically fetches and removes all jobs due by `now`.
// ZRANGEBYSCORE + ZREMRANGEBYSCORE in a single Lua call — no two worker
// instances can claim the same job, preventing duplicate notifications.
var drainScript = redis.NewScript(`
	local jobs = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
	if #jobs > 0 then
		redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
	end
	return jobs
`)

// drain atomically claims all due jobs and dispatches them.
func (w *Worker) drain(ctx context.Context) {
	now := fmt.Sprintf("%d", time.Now().Unix())

	result, err := drainScript.Run(ctx, w.redis, []string{pendingKey}, now).StringSlice()
	if err != nil || len(result) == 0 {
		return
	}

	for _, payload := range result {
		var job ReminderJob
		if err := json.Unmarshal([]byte(payload), &job); err != nil {
			// Malformed job — already removed by the script, nothing to do
			continue
		}

		if err := dispatch(ctx, job); err != nil {
			log.Printf("notifications: dispatch failed for job %s: %v", job.JobID, err)
			// Re-enqueue so it retries on next drain cycle
			w.redis.ZAdd(ctx, pendingKey, redis.Z{
				Score:  float64(job.EventStartsAt.Add(-time.Minute).Unix()),
				Member: payload,
			})
			continue
		}

		// Record in done set for audit (fire-and-forget)
		pipe := w.redis.Pipeline()
		pipe.ZAdd(ctx, doneKey, redis.Z{
			Score:  float64(time.Now().Unix()),
			Member: job.JobID,
		})
		pipe.Expire(ctx, doneKey, doneTTL)
		pipe.Exec(ctx)
	}
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

// dispatch sends the actual notification.
// Currently logs to stdout — swap in Resend / SendGrid / FCM here.
// The interface is intentionally minimal: one job in, error out.
func dispatch(ctx context.Context, job ReminderJob) error {
	timeUntil := time.Until(job.EventStartsAt).Round(time.Minute)

	log.Printf(
		"notifications: [%s reminder] user=%s email=%s event=%q starts_in=%s",
		job.ReminderType, job.UserID, job.UserEmail, job.EventTitle, timeUntil,
	)

	// ── Swap this block for a real email/push provider ────────────────────
	// Example with Resend:
	//
	// _, err := resendClient.Emails.Send(&resend.SendEmailRequest{
	//     From:    "Bukr <reminders@bukr.app>",
	//     To:      []string{job.UserEmail},
	//     Subject: fmt.Sprintf("Your event starts in %s: %s", job.ReminderType, job.EventTitle),
	//     Html:    buildReminderHTML(job),
	// })
	// return err
	// ─────────────────────────────────────────────────────────────────────

	return nil
}
