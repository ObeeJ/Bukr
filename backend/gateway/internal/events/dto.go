/**
 * DOMAIN LAYER - Event Data Transfer Objects
 * 
 * Event DTOs: The event blueprints - defining event data structures
 * 
 * Architecture Layer: Domain (Layer 4)
 * Responsibility: Define data contracts for event operations
 * 
 * Event Lifecycle:
 * 1. Organizer creates event (CreateEventRequest)
 * 2. Event stored in database (Event model)
 * 3. Users browse events (EventResponse)
 * 4. Organizer updates event (UpdateEventRequest)
 * 
 * Key Concepts:
 * - event_key: URL-friendly slug (e.g., "summer-fest-2024-a3f2")
 * - Status: active, cancelled, completed
 * - Tickets: total vs available (sold = total - available)
 */

package events

import "time"

/**
 * REQUEST DTOs - Data from clients
 */

// CreateEventRequest: Organizer creates new event
type CreateEventRequest struct {
	Title           string   `json:"title" validate:"required,min=3"`
	Description     string   `json:"description"`
	Date            string   `json:"date" validate:"required"`          // YYYY-MM-DD
	Time            string   `json:"time" validate:"required"`          // HH:MM:SS
	EndDate         *string  `json:"end_date"`                          // Optional multi-day
	Location        string   `json:"location" validate:"required"`
	Price           float64  `json:"price" validate:"gte=0"`            // Free events = 0
	Currency        string   `json:"currency"`                          // NGN, USD, etc
	Category        string   `json:"category" validate:"required"`      // Music, Sports, etc
	Emoji           *string  `json:"emoji"`                             // Event icon
	TotalTickets    int      `json:"total_tickets" validate:"required,gt=0"`
	RequiresPayment *bool    `json:"requires_payment"`                  // If false, tickets are free to claim
	ThumbnailURL    *string  `json:"thumbnail_url"`
	VideoURL        *string  `json:"video_url"`
	FlierURL        *string  `json:"flier_url"`
}

// UpdateEventRequest: Partial event update
// All fields optional (nil = no change)
type UpdateEventRequest struct {
	Title           *string  `json:"title"`
	Description     *string  `json:"description"`
	Date            *string  `json:"date"`
	Time            *string  `json:"time"`
	EndDate         *string  `json:"end_date"`
	Location        *string  `json:"location"`
	Price           *float64 `json:"price"`
	Currency        *string  `json:"currency"`
	Category        *string  `json:"category"`
	Emoji           *string  `json:"emoji"`
	TotalTickets    *int     `json:"total_tickets"`
	Status          *string  `json:"status"`          // active, cancelled, completed
	RequiresPayment *bool    `json:"requires_payment"`
	ThumbnailURL    *string  `json:"thumbnail_url"`
	VideoURL        *string  `json:"video_url"`
	FlierURL        *string  `json:"flier_url"`
}

// ListEventsQuery: Event filtering and pagination
type ListEventsQuery struct {
	Page     int    `query:"page"`       // Page number (1-indexed)
	Limit    int    `query:"limit"`      // Items per page
	Category string `query:"category"`   // Filter by category
	Status   string `query:"status"`     // Filter by status
	Search   string `query:"search"`     // Search title/description/location
}

/**
 * RESPONSE DTOs - Data to clients
 */

// OrganizerInfo: Event organizer details
type OrganizerInfo struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	OrgName *string `json:"org_name,omitempty"`    // Organization name
}

// EventResponse: Public event details
type EventResponse struct {
	ID               string        `json:"id"`
	OrganizerID      string        `json:"organizer_id"`
	Title            string        `json:"title"`
	Description      string        `json:"description"`
	Date             string        `json:"date"`
	Time             string        `json:"time"`
	EndDate          *string       `json:"end_date,omitempty"`
	Location         string        `json:"location"`
	Price            float64       `json:"price"`
	Currency         string        `json:"currency"`
	Category         string        `json:"category"`
	Emoji            *string       `json:"emoji,omitempty"`
	EventKey         string        `json:"event_key"`           // URL slug
	Status           string        `json:"status"`
	TotalTickets     int           `json:"total_tickets"`
	AvailableTickets int           `json:"available_tickets"`
	SoldTickets      int           `json:"sold_tickets"`        // Calculated
	RequiresPayment  bool          `json:"requires_payment"`    // If false, free to claim
	ThumbnailURL     *string       `json:"thumbnail_url,omitempty"`
	VideoURL         *string       `json:"video_url,omitempty"`
	FlierURL         *string       `json:"flier_url,omitempty"`
	IsFeatured       bool          `json:"is_featured"`
	Organizer        *OrganizerInfo `json:"organizer,omitempty"`
	CreatedAt        time.Time     `json:"created_at"`
}

// EventListResponse: Paginated event list
type EventListResponse struct {
	Events     []EventResponse `json:"events"`
	Pagination PaginationMeta  `json:"pagination"`
}

// PaginationMeta: Pagination metadata
type PaginationMeta struct {
	Page       int `json:"page"`          // Current page
	Limit      int `json:"limit"`         // Items per page
	Total      int `json:"total"`         // Total items
	TotalPages int `json:"total_pages"`   // Total pages
}

/**
 * INTERNAL MODELS - Database entities
 */

// Event: Complete event entity from database
type Event struct {
	ID               string
	OrganizerID      string
	Title            string
	Description      string
	Date             string
	Time             string
	EndDate          *string
	Location         string
	Price            float64
	Currency         string
	Category         string
	Emoji            *string
	EventKey         string
	Status           string
	TotalTickets     int
	AvailableTickets int
	RequiresPayment  bool
	ThumbnailURL     *string
	VideoURL         *string
	FlierURL         *string
	IsFeatured       bool
	CreatedAt        time.Time
	UpdatedAt        time.Time
	// Joined fields from users table
	OrganizerName    string
	OrganizerOrgName *string
}

/**
 * ToResponse: Convert internal model to public response
 * 
 * Calculates derived fields:
 * - sold_tickets = total_tickets - available_tickets
 * - organizer info from joined fields
 * 
 * @returns EventResponse for API
 */
func (e *Event) ToResponse() EventResponse {
	// Calculate sold tickets
	sold := e.TotalTickets - e.AvailableTickets
	if sold < 0 {
		sold = 0
	}

	// Build response
	resp := EventResponse{
		ID:               e.ID,
		OrganizerID:      e.OrganizerID,
		Title:            e.Title,
		Description:      e.Description,
		Date:             e.Date,
		Time:             e.Time,
		EndDate:          e.EndDate,
		Location:         e.Location,
		Price:            e.Price,
		Currency:         e.Currency,
		Category:         e.Category,
		Emoji:            e.Emoji,
		EventKey:         e.EventKey,
		Status:           e.Status,
		TotalTickets:     e.TotalTickets,
		AvailableTickets: e.AvailableTickets,
		SoldTickets:      sold,
		RequiresPayment:  e.RequiresPayment,
		ThumbnailURL:     e.ThumbnailURL,
		VideoURL:         e.VideoURL,
		FlierURL:         e.FlierURL,
		IsFeatured:       e.IsFeatured,
		CreatedAt:        e.CreatedAt,
	}

	// Add organizer info if available (from JOIN)
	if e.OrganizerName != "" {
		resp.Organizer = &OrganizerInfo{
			ID:      e.OrganizerID,
			Name:    e.OrganizerName,
			OrgName: e.OrganizerOrgName,
		}
	}

	return resp
}
