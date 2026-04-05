/**
 * USE CASE LAYER - Event Business Logic
 * 
 * Event Service: The event manager - orchestrating event operations
 * 
 * Architecture Layer: Use Case (Layer 3)
 * Dependencies: Repository (database operations)
 * Responsibility: Event business logic, validation, pagination
 * 
 * Business Rules:
 * - Required fields: title, date, time, location, total_tickets
 * - Default currency: NGN
 * - Default status: active
 * - Pagination: max 50 items per page
 * - Only organizers can create/update/delete events
 * - Only owners can modify their events
 */

package events

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/bukr/gateway/internal/shared"
	"github.com/redis/go-redis/v9"
)

const (
	eventListCacheTTL = 30 * time.Second
	eventItemCacheTTL = 60 * time.Second
)

// CreditConsumer is the minimal interface the event service needs from the
// credits package. Using an interface avoids a circular import.
type CreditConsumer interface {
	ConsumeCredit(ctx context.Context, organizerID string) error
}

type Service struct {
	repo    *Repository
	rdb     *redis.Client
	credits CreditConsumer // nil = credits not enforced (dev / free tier)
}

func NewService(repo *Repository, rdb ...*redis.Client) *Service {
	s := &Service{repo: repo}
	if len(rdb) > 0 {
		s.rdb = rdb[0]
	}
	return s
}

// WithCredits wires in the credit enforcement dependency.
// Called from main.go after both services are constructed.
func (s *Service) WithCredits(c CreditConsumer) {
	s.credits = c
}

func (s *Service) GetByID(ctx context.Context, id string) (*EventResponse, error) {
	cacheKey := "event:id:" + id
	if resp := s.getCachedEvent(ctx, cacheKey); resp != nil {
		return resp, nil
	}
	ev, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, shared.ErrNotFound
	}
	resp := ev.ToResponse()
	s.setCachedEvent(ctx, cacheKey, &resp, eventItemCacheTTL)
	return &resp, nil
}

func (s *Service) GetByEventKey(ctx context.Context, eventKey string) (*EventResponse, error) {
	cacheKey := "event:key:" + eventKey
	if resp := s.getCachedEvent(ctx, cacheKey); resp != nil {
		return resp, nil
	}
	ev, err := s.repo.GetByEventKey(ctx, eventKey)
	if err != nil {
		return nil, shared.ErrNotFound
	}
	resp := ev.ToResponse()
	s.setCachedEvent(ctx, cacheKey, &resp, eventItemCacheTTL)
	return &resp, nil
}

func (s *Service) List(ctx context.Context, q ListEventsQuery) (*EventListResponse, error) {
	// Generation counter makes cache busting O(1).
	// Incrementing the generation key instantly orphans all old list cache
	// entries — no SCAN needed. Old keys expire naturally via their TTL.
	gen := s.listGeneration(ctx)
	cacheKey := fmt.Sprintf("events:list:g%d:%s:%s:%s:%s:%d:%d",
		gen, q.Category, q.Status, q.City, q.EventType, q.Page, q.Limit)

	if s.rdb != nil {
		if cached, err := s.rdb.Get(ctx, cacheKey).Bytes(); err == nil {
			var result EventListResponse
			if json.Unmarshal(cached, &result) == nil {
				return &result, nil
			}
		}
	}

	// Search queries are never cached — too many unique keys, low reuse.
	events, total, err := s.repo.List(ctx, q)
	if err != nil {
		return nil, err
	}

	limit := q.Limit
	if limit < 1 {
		limit = 20
	}
	page := q.Page
	if page < 1 {
		page = 1
	}

	responses := make([]EventResponse, len(events))
	for i, ev := range events {
		responses[i] = ev.ToResponse()
	}

	result := &EventListResponse{
		Events: responses,
		Pagination: PaginationMeta{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: TotalPages(total, limit),
		},
	}

	// Only cache non-search results — search results are too varied to be useful.
	if s.rdb != nil && q.Search == "" {
		if b, err := json.Marshal(result); err == nil {
			go s.rdb.Set(context.Background(), cacheKey, b, eventListCacheTTL)
		}
	}

	return result, nil
}

func (s *Service) ListByOrganizer(ctx context.Context, organizerID string, page, limit int) (*EventListResponse, error) {
	events, total, err := s.repo.ListByOrganizer(ctx, organizerID, page, limit)
	if err != nil {
		return nil, err
	}
	if limit < 1 {
		limit = 20
	}
	if page < 1 {
		page = 1
	}
	responses := make([]EventResponse, len(events))
	for i, ev := range events {
		responses[i] = ev.ToResponse()
	}
	return &EventListResponse{
		Events: responses,
		Pagination: PaginationMeta{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: TotalPages(total, limit),
		},
	}, nil
}

func (s *Service) Create(ctx context.Context, organizerID string, req CreateEventRequest) (*EventResponse, error) {
	if req.Title == "" || req.Date == "" || req.Time == "" || req.Location == "" || req.TotalTickets <= 0 {
		return nil, shared.ErrValidation
	}
	eventType := req.EventType
	if eventType == "" {
		eventType = "physical"
	}
	if (eventType == "online" || eventType == "hybrid") &&
		(req.OnlineLink == nil || *req.OnlineLink == "") {
		return nil, fmt.Errorf("%w: online_link is required for online and hybrid events", shared.ErrValidation)
	}

	// Deduct one event credit before writing to DB.
	// If the organizer has no credits the event is not created.
	// credits == nil means enforcement is disabled (dev / migration period).
	if s.credits != nil {
		if err := s.credits.ConsumeCredit(ctx, organizerID); err != nil {
			return nil, fmt.Errorf("%w: no event credits remaining — purchase a pack to publish more events", shared.ErrValidation)
		}
	}

	ev, err := s.repo.Create(ctx, organizerID, req)
	if err != nil {
		return nil, err
	}
	s.bustListCache(ctx)
	resp := ev.ToResponse()
	return &resp, nil
}

func (s *Service) Update(ctx context.Context, id, organizerID string, req UpdateEventRequest) (*EventResponse, error) {
	ev, err := s.repo.Update(ctx, id, organizerID, req)
	if err != nil {
		return nil, shared.ErrNotFound
	}
	// Invalidate both the item cache and list cache.
	if s.rdb != nil {
		go func() {
			s.rdb.Del(context.Background(), "event:id:"+id)
			s.bustListCache(context.Background())
		}()
	}
	resp := ev.ToResponse()
	return &resp, nil
}

func (s *Service) Delete(ctx context.Context, id, organizerID string) error {
	err := s.repo.Delete(ctx, id, organizerID)
	if err != nil {
		return err
	}
	if s.rdb != nil {
		go func() {
			s.rdb.Del(context.Background(), "event:id:"+id)
			s.bustListCache(context.Background())
		}()
	}
	return nil
}

func (s *Service) GetCategories(ctx context.Context) ([]string, error) {
	const cacheKey = "events:categories"
	if s.rdb != nil {
		if cached, err := s.rdb.Get(ctx, cacheKey).Bytes(); err == nil {
			var cats []string
			if json.Unmarshal(cached, &cats) == nil {
				return cats, nil
			}
		}
	}
	cats, err := s.repo.GetCategories(ctx)
	if err != nil {
		return nil, err
	}
	if s.rdb != nil {
		if b, err := json.Marshal(cats); err == nil {
			go s.rdb.Set(context.Background(), cacheKey, b, 5*time.Minute)
		}
	}
	return cats, nil
}

// getCachedEvent retrieves a single event from Redis. Returns nil on miss.
func (s *Service) getCachedEvent(ctx context.Context, key string) *EventResponse {
	if s.rdb == nil {
		return nil
	}
	b, err := s.rdb.Get(ctx, key).Bytes()
	if err != nil {
		return nil
	}
	var resp EventResponse
	if json.Unmarshal(b, &resp) != nil {
		return nil
	}
	return &resp
}

// setCachedEvent writes a single event to Redis. Fire-and-forget.
func (s *Service) setCachedEvent(ctx context.Context, key string, resp *EventResponse, ttl time.Duration) {
	if s.rdb == nil {
		return
	}
	if b, err := json.Marshal(resp); err == nil {
		go s.rdb.Set(context.Background(), key, b, ttl)
	}
}

// listGeneration reads the current cache generation counter.
// Returns 0 when Redis is unavailable — caching degrades gracefully.
func (s *Service) listGeneration(ctx context.Context) int64 {
	if s.rdb == nil {
		return 0
	}
	val, err := s.rdb.Get(ctx, "events:list:gen").Int64()
	if err != nil {
		return 0
	}
	return val
}

// bustListCache increments the generation counter by 1 — O(1), atomic.
// All existing list cache keys embed the old generation so they become
// unreachable instantly. They expire naturally via TTL, keeping Redis lean.
func (s *Service) bustListCache(ctx context.Context) {
	if s.rdb == nil {
		return
	}
	// INCR is atomic — safe under concurrent mutations.
	s.rdb.Incr(ctx, "events:list:gen")
}
