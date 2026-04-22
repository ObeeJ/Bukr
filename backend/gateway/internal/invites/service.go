package invites

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5/pgxpool"
)

// rewardDiscountPct is the discount percentage granted to a referrer on their next ticket.
const rewardDiscountPct = 10

// maxGuestsPerUpload caps a single bulk upload to prevent abuse.
const maxGuestsPerUpload = 2000

type Service struct {
	repo   *Repository
	mailer *Mailer
	db     *pgxpool.Pool // kept for ownership checks — avoids circular import
}

func NewService(repo *Repository, mailer *Mailer, db *pgxpool.Pool) *Service {
	return &Service{repo: repo, mailer: mailer, db: db}
}

// ── Access mode ───────────────────────────────────────────────────────────────

// SetAccessMode lets an organizer flip an event to invite_only and optionally
// set an RSVP deadline. Verifies ownership before writing.
func (s *Service) SetAccessMode(ctx context.Context, eventID, organizerID, mode string, deadline *time.Time) error {
	if mode != "public" && mode != "invite_only" {
		return fmt.Errorf("access_mode must be 'public' or 'invite_only'")
	}
	if err := s.verifyOwner(ctx, eventID, organizerID); err != nil {
		return err
	}
	return s.repo.SetEventAccessMode(ctx, eventID, mode, deadline)
}

// ── Bulk upload ───────────────────────────────────────────────────────────────

// BulkUploadFile parses a multipart file (CSV / JSON / DOCX / PDF),
// validates each row, inserts valid guests, and dispatches invite emails.
func (s *Service) BulkUploadFile(
	ctx context.Context,
	eventID, organizerID string,
	file multipart.File,
	header *multipart.FileHeader,
	rsvpDeadline *time.Time,
) (BulkInviteResult, error) {
	if err := s.verifyOwner(ctx, eventID, organizerID); err != nil {
		return BulkInviteResult{}, err
	}

	raw, err := io.ReadAll(io.LimitReader(file, 10<<20)) // 10 MB hard cap
	if err != nil {
		return BulkInviteResult{}, fmt.Errorf("read file: %w", err)
	}

	ext := strings.ToLower(fileExt(header.Filename))
	var guests []GuestEntry

	switch ext {
	case ".csv":
		guests, err = parseCSV(raw)
	case ".json":
		guests, err = parseJSON(raw)
	case ".docx":
		guests, err = parseDOCX(raw)
	case ".pdf":
		guests, err = parsePDF(raw)
	default:
		return BulkInviteResult{}, fmt.Errorf("unsupported file type %q — use csv, json, docx, or pdf", ext)
	}
	if err != nil {
		return BulkInviteResult{}, fmt.Errorf("parse %s: %w", ext, err)
	}

	return s.processBulk(ctx, eventID, guests, rsvpDeadline)
}

// BulkUploadJSON handles a direct JSON body upload (no file).
func (s *Service) BulkUploadJSON(
	ctx context.Context,
	eventID, organizerID string,
	req BulkInviteRequest,
) (BulkInviteResult, error) {
	if err := s.verifyOwner(ctx, eventID, organizerID); err != nil {
		return BulkInviteResult{}, err
	}

	var deadline *time.Time
	if req.RSVPDeadline != nil {
		t, err := time.Parse(time.RFC3339, *req.RSVPDeadline)
		if err != nil {
			return BulkInviteResult{}, fmt.Errorf("rsvp_deadline must be RFC3339: %w", err)
		}
		deadline = &t
	}

	return s.processBulk(ctx, eventID, req.Guests, deadline)
}

// processBulk validates, deduplicates within the upload, inserts, and fires emails.
func (s *Service) processBulk(
	ctx context.Context,
	eventID string,
	guests []GuestEntry,
	deadline *time.Time,
) (BulkInviteResult, error) {
	result := BulkInviteResult{Errors: []string{}}

	if len(guests) > maxGuestsPerUpload {
		return result, fmt.Errorf("upload exceeds %d guest limit per batch", maxGuestsPerUpload)
	}

	// Validate + deduplicate within the upload itself before hitting the DB
	seen := make(map[string]struct{}, len(guests))
	var valid []GuestEntry

	for i, g := range guests {
		g.Email = strings.ToLower(strings.TrimSpace(g.Email))
		g.Name = strings.TrimSpace(g.Name)
		if g.TicketType == "" {
			g.TicketType = "General Admission"
		}
		if !isValidEmail(g.Email) {
			result.Invalid++
			if len(result.Errors) < 20 {
				result.Errors = append(result.Errors, fmt.Sprintf("row %d: invalid email %q", i+1, g.Email))
			}
			continue
		}
		if _, dup := seen[g.Email]; dup {
			result.Skipped++
			continue
		}
		seen[g.Email] = struct{}{}
		valid = append(valid, g)
	}

	if len(valid) == 0 {
		return result, nil
	}

	// Persist RSVP deadline + ensure event is invite_only
	if deadline != nil {
		_ = s.repo.SetEventAccessMode(ctx, eventID, "invite_only", deadline)
	}

	inserted, err := s.repo.BulkCreate(ctx, eventID, valid)
	if err != nil {
		return result, fmt.Errorf("db insert: %w", err)
	}

	// Rows that passed validation but already existed in DB
	result.Skipped += len(valid) - inserted
	result.Created = inserted

	// Fetch event metadata for the email template
	var eventTitle, eventDate string
	_ = s.db.QueryRow(ctx,
		`SELECT title, date::text FROM events WHERE id = $1::uuid`, eventID,
	).Scan(&eventTitle, &eventDate)

	// Fire-and-forget — mail failure never blocks the API response
	go s.dispatchInviteEmails(context.Background(), eventID, eventTitle, eventDate)

	return result, nil
}

// dispatchInviteEmails fetches all unsent invites for an event and emails them.
func (s *Service) dispatchInviteEmails(ctx context.Context, eventID, eventTitle, eventDate string) {
	invites, err := s.repo.GetUnsentByEvent(ctx, eventID)
	if err != nil {
		return
	}
	for _, inv := range invites {
		if err := s.mailer.SendInvite(inv.Email, inv.Name, eventTitle, eventDate, inv.Token); err != nil {
			continue
		}
		_ = s.repo.MarkSent(ctx, inv.ID)
	}
}

// ── Booking gate ──────────────────────────────────────────────────────────────

// CheckAccess is called by the booking middleware before any ticket purchase or claim.
// userEmail MUST come from the verified JWT claims — never from the request body.
// Returns nil if the user is allowed to proceed.
func (s *Service) CheckAccess(ctx context.Context, eventID, userEmail string) error {
	mode, err := s.repo.GetEventAccessMode(ctx, eventID)
	if err != nil {
		return fmt.Errorf("event not found")
	}
	if mode == "public" {
		return nil // fast path — O(1) index read, no further work
	}
	// invite_only: authenticated user's email must be on the guest list
	_, err = s.repo.GetPendingByEventEmail(ctx, eventID, strings.ToLower(userEmail))
	if err != nil {
		return fmt.Errorf("this event is by invitation only — your email is not on the guest list")
	}
	return nil
}

// ── Token redemption ──────────────────────────────────────────────────────────

// RedeemToken is called when a guest taps their invite link.
// Identity gate: token email must match the authenticated user's email.
// This is what makes link-sharing useless — the link only works for its owner.
func (s *Service) RedeemToken(ctx context.Context, token, userID, userEmail string) (*RedeemResponse, error) {
	inv, err := s.repo.GetByToken(ctx, token)
	if err != nil {
		// Generic message — never reveal whether a token exists
		return nil, fmt.Errorf("invalid or expired invitation")
	}

	switch inv.Status {
	case "revoked":
		return nil, fmt.Errorf("this invitation has been revoked by the organizer")
	case "expired":
		return nil, fmt.Errorf("this invitation has expired")
	case "redeemed":
		return nil, fmt.Errorf("this invitation has already been used")
	}

	// The identity lock — email on the invite must match the logged-in user
	if !strings.EqualFold(inv.Email, userEmail) {
		return nil, fmt.Errorf("this invitation was sent to a different email address")
	}

	if err := s.repo.Redeem(ctx, inv.ID, userID); err != nil {
		return nil, fmt.Errorf("redeem: %w", err)
	}

	return &RedeemResponse{
		InviteID:   inv.ID,
		EventID:    inv.EventID,
		TicketType: inv.TicketType,
		Message:    "Invitation accepted. Proceed to book your ticket.",
	}, nil
}

// ── Organizer management ──────────────────────────────────────────────────────

// ListInvites returns all invites for an event (organizer dashboard).
func (s *Service) ListInvites(ctx context.Context, eventID, organizerID string) ([]InviteResponse, error) {
	if err := s.verifyOwner(ctx, eventID, organizerID); err != nil {
		return nil, err
	}
	invites, err := s.repo.ListByEvent(ctx, eventID)
	if err != nil {
		return nil, err
	}
	out := make([]InviteResponse, len(invites))
	for i, inv := range invites {
		out[i] = inv.ToResponse()
	}
	return out, nil
}

// RevokeInvite revokes a single invite. Verifies event ownership.
func (s *Service) RevokeInvite(ctx context.Context, inviteID, eventID, organizerID string) error {
	if err := s.verifyOwner(ctx, eventID, organizerID); err != nil {
		return err
	}
	return s.repo.Revoke(ctx, inviteID, eventID)
}

// ── Referral rewards ──────────────────────────────────────────────────────────

// GrantReferralReward is called after a new user registers via an invite link.
// BFS cycle guard: walks the referral ancestry chain before granting to ensure
// the referrer is not already in the new user's chain (prevents reward loops).
func (s *Service) GrantReferralReward(ctx context.Context, sourceInviteID string) {
	var referrerUserID, referrerType string
	err := s.db.QueryRow(ctx,
		`SELECT ei.redeemed_by::text, u.user_type
		 FROM event_invites ei
		 JOIN users u ON u.id = ei.redeemed_by
		 WHERE ei.id = $1::uuid AND ei.redeemed_by IS NOT NULL`,
		sourceInviteID,
	).Scan(&referrerUserID, &referrerType)
	if err != nil {
		return
	}

	// BFS: walk up the referral chain from the referrer.
	// If we encounter the referrer again (cycle), abort — no reward granted.
	// Max depth 10 prevents runaway queries on deep legitimate chains.
	const maxDepth = 10
	visited := map[string]struct{}{referrerUserID: {}}
	current := referrerUserID
	for depth := 0; depth < maxDepth; depth++ {
		var parentID string
		err := s.db.QueryRow(ctx,
			`SELECT ei.redeemed_by::text
			 FROM event_invites ei
			 WHERE ei.redeemed_by = $1::uuid
			   AND ei.referred_by_invite_id IS NOT NULL
			 LIMIT 1`,
			current,
		).Scan(&parentID)
		if err != nil || parentID == "" {
			break // reached root of chain
		}
		if _, seen := visited[parentID]; seen {
			// Cycle detected — abort reward grant
			return
		}
		visited[parentID] = struct{}{}
		current = parentID
	}

	rewardType := "ticket_discount"
	if referrerType == "organizer" {
		rewardType = "both"
	}
	_ = s.repo.CreateReward(ctx, referrerUserID, sourceInviteID, rewardType, rewardDiscountPct)
}

// GetUnusedReward returns the first unapplied reward for a user.
func (s *Service) GetUnusedReward(ctx context.Context, userID string) (*RewardRow, error) {
	return s.repo.GetUnusedReward(ctx, userID)
}

// ApplyReward marks a reward as consumed. Called at checkout.
func (s *Service) ApplyReward(ctx context.Context, rewardID string) error {
	return s.repo.ApplyReward(ctx, rewardID)
}

// ExpireStaleInvites is called by the notification worker on a schedule.
func (s *Service) ExpireStaleInvites(ctx context.Context) (int64, error) {
	return s.repo.ExpireStale(ctx)
}

// ── Ownership helper ──────────────────────────────────────────────────────────

func (s *Service) verifyOwner(ctx context.Context, eventID, organizerID string) error {
	var ownerID string
	err := s.db.QueryRow(ctx,
		`SELECT organizer_id::text FROM events WHERE id = $1::uuid`, eventID,
	).Scan(&ownerID)
	if err != nil {
		return fmt.Errorf("event not found")
	}
	if ownerID != organizerID {
		return fmt.Errorf("forbidden")
	}
	return nil
}

// ── File parsers ──────────────────────────────────────────────────────────────

// parseCSV expects columns: name, email, ticket_type (header row optional).
// Column order is detected by header name; positional fallback if no header.
func parseCSV(raw []byte) ([]GuestEntry, error) {
	r := csv.NewReader(bytes.NewReader(raw))
	r.TrimLeadingSpace = true
	r.FieldsPerRecord = -1

	records, err := r.ReadAll()
	if err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return nil, nil
	}

	nameIdx, emailIdx, ttIdx := 0, 1, 2
	startRow := 0

	// Detect header row by looking for the word "email"
	if containsHeader(records[0]) {
		startRow = 1
		for i, h := range records[0] {
			switch strings.ToLower(strings.TrimSpace(h)) {
			case "name":
				nameIdx = i
			case "email":
				emailIdx = i
			case "ticket_type", "ticket type", "type":
				ttIdx = i
			}
		}
	}

	var out []GuestEntry
	for _, row := range records[startRow:] {
		g := GuestEntry{}
		if nameIdx < len(row) {
			g.Name = row[nameIdx]
		}
		if emailIdx < len(row) {
			g.Email = row[emailIdx]
		}
		if ttIdx < len(row) {
			g.TicketType = row[ttIdx]
		}
		if g.Email != "" {
			out = append(out, g)
		}
	}
	return out, nil
}

// parseJSON accepts either a JSON array or {"guests":[...]} wrapper.
func parseJSON(raw []byte) ([]GuestEntry, error) {
	var guests []GuestEntry
	if err := json.Unmarshal(raw, &guests); err == nil {
		return guests, nil
	}
	var wrapper struct {
		Guests []GuestEntry `json:"guests"`
	}
	if err := json.Unmarshal(raw, &wrapper); err != nil {
		return nil, fmt.Errorf("expected JSON array or {\"guests\":[...]} object")
	}
	return wrapper.Guests, nil
}

// parseDOCX extracts plain text from a .docx (ZIP of XML) then parses as CSV.
// Organizers are expected to have one guest per line: Name, email, TicketType
func parseDOCX(raw []byte) ([]GuestEntry, error) {
	zr, err := zip.NewReader(bytes.NewReader(raw), int64(len(raw)))
	if err != nil {
		return nil, fmt.Errorf("not a valid docx file")
	}
	var text strings.Builder
	for _, f := range zr.File {
		if f.Name != "word/document.xml" {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return nil, err
		}
		xmlBytes, _ := io.ReadAll(rc)
		rc.Close()
		text.WriteString(stripXMLTags(string(xmlBytes)))
	}
	if text.Len() == 0 {
		return nil, fmt.Errorf("no text content found in docx")
	}
	return parseCSV([]byte(text.String()))
}

// parsePDF does best-effort text extraction from simple unencrypted PDFs.
// Complex PDFs (scanned images, embedded fonts) will fail gracefully with
// a clear message telling the organizer to use CSV instead.
func parsePDF(raw []byte) ([]GuestEntry, error) {
	text := extractPDFText(raw)
	if text == "" {
		return nil, fmt.Errorf("could not extract text from PDF — use CSV or JSON for complex PDFs")
	}
	return parseCSV([]byte(text))
}

// ── Low-level helpers ─────────────────────────────────────────────────────────

func isValidEmail(e string) bool {
	at := strings.LastIndex(e, "@")
	if at < 1 {
		return false
	}
	domain := e[at+1:]
	return strings.Contains(domain, ".") && len(domain) > 2 && utf8.ValidString(e)
}

func containsHeader(row []string) bool {
	for _, cell := range row {
		if strings.ToLower(strings.TrimSpace(cell)) == "email" {
			return true
		}
	}
	return false
}

func fileExt(name string) string {
	idx := strings.LastIndex(name, ".")
	if idx < 0 {
		return ""
	}
	return name[idx:]
}

// stripXMLTags removes all XML tags, leaving only text nodes separated by newlines.
func stripXMLTags(s string) string {
	var b strings.Builder
	inTag := false
	for _, r := range s {
		switch {
		case r == '<':
			inTag = true
		case r == '>':
			inTag = false
			b.WriteRune('\n')
		case !inTag:
			b.WriteRune(r)
		}
	}
	return b.String()
}

// extractPDFText does best-effort extraction of parenthesised string literals
// from raw PDF bytes — works for simple text-based PDFs (Excel/Sheets exports).
func extractPDFText(raw []byte) string {
	content := string(raw)
	var b strings.Builder
	i := 0
	for i < len(content) {
		if content[i] != '(' {
			i++
			continue
		}
		j := i + 1
		for j < len(content) && content[j] != ')' {
			if content[j] == '\\' {
				j++
			}
			j++
		}
		if j < len(content) {
			for _, c := range content[i+1 : j] {
				if c >= 32 && c < 127 {
					b.WriteRune(c)
				}
			}
			b.WriteRune('\n')
		}
		i = j + 1
	}
	return b.String()
}
