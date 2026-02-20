/**
 * USE CASE LAYER - Influencer Business Logic
 * 
 * Influencer Service: The affiliate orchestrator - managing referral partners
 * 
 * Architecture Layer: Use Case (Layer 3)
 * Dependencies: Repository (database operations)
 * Responsibility: Influencer business logic, referral link generation
 * 
 * Business Rules:
 * - Name and email required for creation
 * - Unique referral codes generated automatically
 * - Referral links include base URL + code
 * - Track referrals and revenue per influencer
 */

package influencers

import (
	"context"
	"fmt"

	"github.com/bukr/gateway/internal/shared"
)

/**
 * Service: Influencer business logic
 */
type Service struct {
	repo    *Repository
	baseURL string    // Base URL for referral links
}

func NewService(repo *Repository, baseURL string) *Service {
	return &Service{repo: repo, baseURL: baseURL}
}

/**
 * List: Get organizer's influencers
 * 
 * Only returns influencers owned by organizer
 */
func (s *Service) List(ctx context.Context, organizerID string) ([]InfluencerResponse, error) {
	influencers, err := s.repo.List(ctx, organizerID)
	if err != nil {
		return nil, err
	}

	// Convert to response DTOs
	responses := make([]InfluencerResponse, len(influencers))
	for i, inf := range influencers {
		responses[i] = inf.ToResponse()
	}
	return responses, nil
}

/**
 * GetByID: Get influencer details
 * 
 * Includes referral stats (clicks, conversions, revenue)
 */
func (s *Service) GetByID(ctx context.Context, id, organizerID string) (*InfluencerResponse, error) {
	inf, err := s.repo.GetByID(ctx, id, organizerID)
	if err != nil {
		return nil, shared.ErrNotFound
	}
	resp := inf.ToResponse()
	return &resp, nil
}

/**
 * Create: Create new influencer
 * 
 * Validates required fields
 * Generates unique referral code
 */
func (s *Service) Create(ctx context.Context, organizerID string, req CreateInfluencerRequest) (*InfluencerResponse, error) {
	// Validate required fields
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

/**
 * Update: Update influencer details
 * 
 * Partial update (only provided fields)
 */
func (s *Service) Update(ctx context.Context, id, organizerID string, req UpdateInfluencerRequest) (*InfluencerResponse, error) {
	inf, err := s.repo.Update(ctx, id, organizerID, req)
	if err != nil {
		return nil, shared.ErrNotFound
	}
	resp := inf.ToResponse()
	return &resp, nil
}

/**
 * Delete: Delete influencer
 * 
 * Only owner can delete
 */
func (s *Service) Delete(ctx context.Context, id, organizerID string) error {
	return s.repo.Delete(ctx, id, organizerID)
}

/**
 * GetReferralLink: Generate shareable referral link
 * 
 * Format: {baseURL}?ref={referralCode}
 * Example: https://bukr.app/events?ref=INF-johndoe3a2f1b
 * 
 * Used by influencers to share and track conversions
 */
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
