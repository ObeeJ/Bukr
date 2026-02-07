package events

import (
	"context"

	"github.com/bukr/gateway/internal/shared"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetByID(ctx context.Context, id string) (*EventResponse, error) {
	ev, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, shared.ErrNotFound
	}
	resp := ev.ToResponse()
	return &resp, nil
}

func (s *Service) GetByEventKey(ctx context.Context, eventKey string) (*EventResponse, error) {
	ev, err := s.repo.GetByEventKey(ctx, eventKey)
	if err != nil {
		return nil, shared.ErrNotFound
	}
	resp := ev.ToResponse()
	return &resp, nil
}

func (s *Service) List(ctx context.Context, q ListEventsQuery) (*EventListResponse, error) {
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

func (s *Service) Update(ctx context.Context, id, organizerID string, req UpdateEventRequest) (*EventResponse, error) {
	ev, err := s.repo.Update(ctx, id, organizerID, req)
	if err != nil {
		return nil, shared.ErrNotFound
	}
	resp := ev.ToResponse()
	return &resp, nil
}

func (s *Service) Delete(ctx context.Context, id, organizerID string) error {
	return s.repo.Delete(ctx, id, organizerID)
}

func (s *Service) GetCategories(ctx context.Context) ([]string, error) {
	return s.repo.GetCategories(ctx)
}
