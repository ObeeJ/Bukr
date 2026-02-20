/**
 * USE CASE LAYER - Favorites Business Logic
 * 
 * Favorites Service: The bookmark keeper - managing saved events
 * 
 * Architecture Layer: Use Case (Layer 3)
 * Dependencies: Repository (database operations)
 * Responsibility: Favorites business logic
 * 
 * Business Rules:
 * - Operations are idempotent (add/remove twice = same as once)
 * - Returns empty array if no favorites (not null)
 * - Favorites are user-specific (no sharing)
 */

package favorites

import "context"

/**
 * Service: Favorites business logic
 */
type Service struct {
	repo *Repository
}

/**
 * NewService: Constructor
 */
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

/**
 * List: Get user's favorited events
 * 
 * Returns full event details (not just IDs)
 * Empty array if no favorites (never null)
 */
func (s *Service) List(ctx context.Context, userID string) ([]FavoriteEventResponse, error) {
	events, err := s.repo.List(ctx, userID)
	if err != nil {
		return nil, err
	}
	// Ensure empty array instead of null
	if events == nil {
		events = []FavoriteEventResponse{}
	}
	return events, nil
}

/**
 * Add: Add event to favorites
 * 
 * Idempotent: adding twice has same effect as once
 * Uses ON CONFLICT DO NOTHING in database
 */
func (s *Service) Add(ctx context.Context, userID, eventID string) (*FavoriteResponse, error) {
	if err := s.repo.Add(ctx, userID, eventID); err != nil {
		return nil, err
	}
	return &FavoriteResponse{EventID: eventID, Favorited: true}, nil
}

/**
 * Remove: Remove event from favorites
 * 
 * Idempotent: removing twice has same effect as once
 * No error if favorite doesn't exist
 */
func (s *Service) Remove(ctx context.Context, userID, eventID string) (*FavoriteResponse, error) {
	if err := s.repo.Remove(ctx, userID, eventID); err != nil {
		return nil, err
	}
	return &FavoriteResponse{EventID: eventID, Favorited: false}, nil
}

/**
 * IsFavorited: Check if event is favorited
 * 
 * Used by UI to show heart icon state
 * Returns false if not favorited (not error)
 */
func (s *Service) IsFavorited(ctx context.Context, userID, eventID string) (bool, error) {
	return s.repo.IsFavorited(ctx, userID, eventID)
}
