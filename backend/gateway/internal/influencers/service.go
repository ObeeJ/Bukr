package influencers

import (
	"context"
	"fmt"

	"github.com/bukr/gateway/internal/shared"
)

type Service struct {
	repo    *Repository
	baseURL string
}

func NewService(repo *Repository, baseURL string) *Service {
	return &Service{repo: repo, baseURL: baseURL}
}

func (s *Service) List(ctx context.Context, organizerID string) ([]InfluencerResponse, error) {
	influencers, err := s.repo.List(ctx, organizerID)
	if err != nil {
		return nil, err
	}

	responses := make([]InfluencerResponse, len(influencers))
	for i, inf := range influencers {
		responses[i] = inf.ToResponse()
	}
	return responses, nil
}

func (s *Service) GetByID(ctx context.Context, id, organizerID string) (*InfluencerResponse, error) {
	inf, err := s.repo.GetByID(ctx, id, organizerID)
	if err != nil {
		return nil, shared.ErrNotFound
	}
	resp := inf.ToResponse()
	return &resp, nil
}

func (s *Service) Create(ctx context.Context, organizerID string, req CreateInfluencerRequest) (*InfluencerResponse, error) {
	if req.Name == "" || req.Email == "" {
		return nil, shared.ErrValidation
	}

	inf, err := s.repo.Create(ctx, organizerID, req)
	if err != nil {
		return nil, err
	}
	resp := inf.ToResponse()
	return &resp, nil
}

func (s *Service) Update(ctx context.Context, id, organizerID string, req UpdateInfluencerRequest) (*InfluencerResponse, error) {
	inf, err := s.repo.Update(ctx, id, organizerID, req)
	if err != nil {
		return nil, shared.ErrNotFound
	}
	resp := inf.ToResponse()
	return &resp, nil
}

func (s *Service) Delete(ctx context.Context, id, organizerID string) error {
	return s.repo.Delete(ctx, id, organizerID)
}

func (s *Service) GetReferralLink(ctx context.Context, id, organizerID string) (*ReferralLinkResponse, error) {
	inf, err := s.repo.GetByID(ctx, id, organizerID)
	if err != nil {
		return nil, shared.ErrNotFound
	}

	return &ReferralLinkResponse{
		ReferralCode: inf.ReferralCode,
		ReferralLink: fmt.Sprintf("%s?ref=%s", s.baseURL, inf.ReferralCode),
	}, nil
}
