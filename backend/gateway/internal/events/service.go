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

	"github.com/bukr/gateway/internal/shared"
)

/**
 * Service: Event business logic
 */
type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

/**
 * GetByID: Get event by UUID
 */
func (s *Service) GetByID(ctx context.Context, id string) (*EventResponse, error) {
	ev, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, shared.ErrNotFound
	}
	resp := ev.ToResponse()
	return &resp, nil
}

/**
 * GetByEventKey: Get event by URL slug
 */
func (s *Service) GetByEventKey(ctx context.Context, eventKey string) (*EventResponse, error) {
	ev, err := s.repo.GetByEventKey(ctx, eventKey)
	if err != nil {
		return nil, shared.ErrNotFound
	}
	resp := ev.ToResponse()
	return &resp, nil
}

/**
 * List: List events with filtering and pagination
 * 
 * Validates and normalizes pagination params
 * Defaults: page=1, limit=20, status=active
 */
func (s *Service) List(ctx context.Context, q ListEventsQuery) (*EventListResponse, error) {
	events, total, err := s.repo.List(ctx, q)
	if err != nil {
		return nil, err
	}

	// Normalize pagination params
	limit := q.Limit
	if limit < 1 {
		limit = 20
	}
	page := q.Page
	if page < 1 {
		page = 1
	}

	// Convert to response DTOs
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

/**
 * ListByOrganizer: List organizer's events
 * 
 * Only returns events owned by organizer
 */
func (s *Service) ListByOrganizer(ctx context.Context, organizerID string, page, limit int) (*EventListResponse, error) {
	events, total, err := s.repo.ListByOrganizer(ctx, organizerID, page, limit)
	if err != nil {
		return nil, err
	}

	// Normalize pagination
	if limit < 1 {
		limit = 20
	}
	if page < 1 {
		page = 1
	}

	// Convert to response DTOs
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

/**
 * Create: Create new event
 * 
 * Validates required fields
 * Generates unique event_key from title
 */
func (s *Service) Create(ctx context.Context, organizerID string, req CreateEventRequest) (*EventResponse, error) {
	// Validate required fields
	if req.Title == "" {
		return nil, shared.ErrValidation
	}
	if req.Date == "" || req.Time == "" {
		return nil, shared.ErrValidation
	}
	if req.Location == "" {
		return nil, shared.ErrValidation
	}
	if req.TotalTickets <= 0 {
		return nil, shared.ErrValidation
	}

	ev, err := s.repo.Create(ctx, organizerID, req)
	if err != nil {
		return nil, err
	}
	resp := ev.ToResponse()
	return &resp, nil
}

/**
 * Update: Update event details
 * 
 * Partial update (only provided fields)
 * Only owner can update
 */
func (s *Service) Update(ctx context.Context, id, organizerID string, req UpdateEventRequest) (*EventResponse, error) {
	ev, err := s.repo.Update(ctx, id, organizerID, req)
	if err != nil {
		return nil, shared.ErrNotFound
	}
	resp := ev.ToResponse()
	return &resp, nil
}

/**
 * Delete: Delete event
 * 
 * Only owner can delete
 */
func (s *Service) Delete(ctx context.Context, id, organizerID string) error {
	return s.repo.Delete(ctx, id, organizerID)
}

/**
 * GetCategories: Get distinct event categories
 * 
 * Returns list of active event categories
 */
func (s *Service) GetCategories(ctx context.Context) ([]string, error) {
	return s.repo.GetCategories(ctx)
}
