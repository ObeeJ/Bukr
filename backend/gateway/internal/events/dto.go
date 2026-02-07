package events

import "time"

// --- Request DTOs ---

type CreateEventRequest struct {
	Title        string   `json:"title" validate:"required,min=3"`
	Description  string   `json:"description"`
	Date         string   `json:"date" validate:"required"`
	Time         string   `json:"time" validate:"required"`
	EndDate      *string  `json:"end_date"`
	Location     string   `json:"location" validate:"required"`
	Price        float64  `json:"price" validate:"gte=0"`
	Currency     string   `json:"currency"`
	Category     string   `json:"category" validate:"required"`
	Emoji        *string  `json:"emoji"`
	TotalTickets int      `json:"total_tickets" validate:"required,gt=0"`
	ThumbnailURL *string  `json:"thumbnail_url"`
	VideoURL     *string  `json:"video_url"`
	FlierURL     *string  `json:"flier_url"`
}

type UpdateEventRequest struct {
	Title        *string  `json:"title"`
	Description  *string  `json:"description"`
	Date         *string  `json:"date"`
	Time         *string  `json:"time"`
	EndDate      *string  `json:"end_date"`
	Location     *string  `json:"location"`
	Price        *float64 `json:"price"`
	Currency     *string  `json:"currency"`
	Category     *string  `json:"category"`
	Emoji        *string  `json:"emoji"`
	TotalTickets *int     `json:"total_tickets"`
	Status       *string  `json:"status"`
	ThumbnailURL *string  `json:"thumbnail_url"`
	VideoURL     *string  `json:"video_url"`
	FlierURL     *string  `json:"flier_url"`
}

type ListEventsQuery struct {
	Page     int    `query:"page"`
	Limit    int    `query:"limit"`
	Category string `query:"category"`
	Status   string `query:"status"`
	Search   string `query:"search"`
}

// --- Response DTOs ---

type OrganizerInfo struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	OrgName *string `json:"org_name,omitempty"`
}

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
	EventKey         string        `json:"event_key"`
	Status           string        `json:"status"`
	TotalTickets     int           `json:"total_tickets"`
	AvailableTickets int           `json:"available_tickets"`
	SoldTickets      int           `json:"sold_tickets"`
	ThumbnailURL     *string       `json:"thumbnail_url,omitempty"`
	VideoURL         *string       `json:"video_url,omitempty"`
	FlierURL         *string       `json:"flier_url,omitempty"`
	IsFeatured       bool          `json:"is_featured"`
	Organizer        *OrganizerInfo `json:"organizer,omitempty"`
	CreatedAt        time.Time     `json:"created_at"`
}

type EventListResponse struct {
	Events     []EventResponse `json:"events"`
	Pagination PaginationMeta  `json:"pagination"`
}

type PaginationMeta struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

// --- Internal model ---

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
	ThumbnailURL     *string
	VideoURL         *string
	FlierURL         *string
	IsFeatured       bool
	CreatedAt        time.Time
	UpdatedAt        time.Time
	// Joined fields
	OrganizerName    string
	OrganizerOrgName *string
}

func (e *Event) ToResponse() EventResponse {
	sold := e.TotalTickets - e.AvailableTickets
	if sold < 0 {
		sold = 0
	}

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
		ThumbnailURL:     e.ThumbnailURL,
		VideoURL:         e.VideoURL,
		FlierURL:         e.FlierURL,
		IsFeatured:       e.IsFeatured,
		CreatedAt:        e.CreatedAt,
	}

	if e.OrganizerName != "" {
		resp.Organizer = &OrganizerInfo{
			ID:      e.OrganizerID,
			Name:    e.OrganizerName,
			OrgName: e.OrganizerOrgName,
		}
	}

	return resp
}
