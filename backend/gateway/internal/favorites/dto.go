/**
 * DOMAIN LAYER - Favorites Data Transfer Objects
 * 
 * Favorites DTOs: The bookmark contracts - defining favorite data structures
 * 
 * Architecture Layer: Domain (Layer 4)
 * Responsibility: Define data contracts for favorites operations
 */

package favorites

import "time"

// FavoriteResponse: Result of add/remove operation
type FavoriteResponse struct {
	EventID   string    `json:"event_id"`
	Favorited bool      `json:"favorited"`      // true = added, false = removed
	CreatedAt time.Time `json:"created_at,omitempty"`
}

// FavoriteEventResponse: Event details for favorited events
// Subset of full event details (optimized for list view)
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
