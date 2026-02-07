package favorites

import "time"

type FavoriteResponse struct {
	EventID   string    `json:"event_id"`
	Favorited bool      `json:"favorited"`
	CreatedAt time.Time `json:"created_at,omitempty"`
}

type FavoriteEventResponse struct {
	ID               string  `json:"id"`
	Title            string  `json:"title"`
	Date             string  `json:"date"`
	Time             string  `json:"time"`
	Location         string  `json:"location"`
	Price            float64 `json:"price"`
	Currency         string  `json:"currency"`
	Category         string  `json:"category"`
	Emoji            *string `json:"emoji,omitempty"`
	EventKey         string  `json:"event_key"`
	ThumbnailURL     *string `json:"thumbnail_url,omitempty"`
	AvailableTickets int     `json:"available_tickets"`
	OrganizerName    string  `json:"organizer_name"`
}
