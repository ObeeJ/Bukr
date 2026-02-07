package users

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

func (s *Service) GetProfile(ctx context.Context, userID string) (*UserResponse, error) {
	user, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, shared.ErrNotFound
	}
	resp := user.ToResponse()
	return &resp, nil
}

func (s *Service) UpdateProfile(ctx context.Context, userID string, req UpdateProfileRequest) (*UserResponse, error) {
	user, err := s.repo.UpdateProfile(ctx, userID, req)
	if err != nil {
		return nil, shared.ErrNotFound
	}
	resp := user.ToResponse()
	return &resp, nil
}

func (s *Service) CompleteProfile(ctx context.Context, userID string, req CompleteProfileRequest) (*UserResponse, error) {
	if req.UserType != "user" && req.UserType != "organizer" {
		return nil, shared.ErrValidation
	}

	if req.UserType == "organizer" && (req.OrgName == nil || *req.OrgName == "") {
		return nil, shared.ErrValidation
	}

	user, err := s.repo.CompleteProfile(ctx, userID, req)
	if err != nil {
		return nil, shared.ErrNotFound
	}
	resp := user.ToResponse()
	return &resp, nil
}

func (s *Service) DeactivateAccount(ctx context.Context, userID string) error {
	return s.repo.Deactivate(ctx, userID)
}
