package favorites

import "context"

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, userID string) ([]FavoriteEventResponse, error) {
	events, err := s.repo.List(ctx, userID)
	if err != nil {
		return nil, err
	}
	if events == nil {
		events = []FavoriteEventResponse{}
	}
	return events, nil
}

func (s *Service) Add(ctx context.Context, userID, eventID string) (*FavoriteResponse, error) {
	if err := s.repo.Add(ctx, userID, eventID); err != nil {
		return nil, err
	}
	return &FavoriteResponse{EventID: eventID, Favorited: true}, nil
}

func (s *Service) Remove(ctx context.Context, userID, eventID string) (*FavoriteResponse, error) {
	if err := s.repo.Remove(ctx, userID, eventID); err != nil {
		return nil, err
	}
	return &FavoriteResponse{EventID: eventID, Favorited: false}, nil
}

func (s *Service) IsFavorited(ctx context.Context, userID, eventID string) (bool, error) {
	return s.repo.IsFavorited(ctx, userID, eventID)
}
