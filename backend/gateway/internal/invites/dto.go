package invites

import "time"

// ── Request DTOs ──────────────────────────────────────────────────────────────

// GuestEntry is one row in a bulk upload (CSV / JSON / parsed DOCX / PDF).
type GuestEntry struct {
	Name       string `json:"name"`
	Email      string `json:"email"`
	TicketType string `json:"ticket_type"` // defaults to "General Admission"
}

// BulkInviteRequest is the JSON body for the bulk-upload endpoint.
// Used when the organizer sends JSON directly (not a file upload).
type BulkInviteRequest struct {
	Guests      []GuestEntry `json:"guests"`
	RSVPDeadline *string     `json:"rsvp_deadline"` // RFC3339; nil = event start time
}

// RedeemRequest is sent by the guest when they tap the invite link.
type RedeemRequest struct {
	Token string `json:"token"`
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

// InviteResponse is the public view of a single invite (organizer dashboard).
type InviteResponse struct {
	ID         string  `json:"id"`
	Email      string  `json:"email"`
	Name       string  `json:"name"`
	TicketType string  `json:"ticket_type"`
	Status     string  `json:"status"`
	SentAt     *string `json:"sent_at,omitempty"`
	RedeemedAt *string `json:"redeemed_at,omitempty"`
	CreatedAt  string  `json:"created_at"`
}

// BulkInviteResult summarises a bulk upload operation.
type BulkInviteResult struct {
	Created  int      `json:"created"`
	Skipped  int      `json:"skipped"`  // duplicates already in DB
	Invalid  int      `json:"invalid"`  // rows that failed validation
	Errors   []string `json:"errors"`   // human-readable per-row errors (capped at 20)
}

// RedeemResponse is returned after a successful token redemption.
// The caller (booking flow) uses event_id + ticket_type to proceed.
type RedeemResponse struct {
	InviteID   string `json:"invite_id"`
	EventID    string `json:"event_id"`
	TicketType string `json:"ticket_type"`
	Message    string `json:"message"`
}

// ── Internal model ────────────────────────────────────────────────────────────

// Invite is the DB row — never returned directly to clients.
type Invite struct {
	ID                 string
	EventID            string
	Email              string
	Name               string
	TicketType         string
	Token              string
	Status             string
	RedeemedBy         *string
	RedeemedAt         *time.Time
	ReferredByInviteID *string
	SentAt             *time.Time
	CreatedAt          time.Time
}

func (i *Invite) ToResponse() InviteResponse {
	r := InviteResponse{
		ID:         i.ID,
		Email:      i.Email,
		Name:       i.Name,
		TicketType: i.TicketType,
		Status:     i.Status,
		CreatedAt:  i.CreatedAt.Format(time.RFC3339),
	}
	if i.SentAt != nil {
		s := i.SentAt.Format(time.RFC3339)
		r.SentAt = &s
	}
	if i.RedeemedAt != nil {
		s := i.RedeemedAt.Format(time.RFC3339)
		r.RedeemedAt = &s
	}
	return r
}
