/**
 * USE CASE LAYER - User Profile Business Logic
 * 
 * User Service: The profile orchestrator - managing user account operations
 * 
 * Architecture Layer: Use Case (Layer 3)
 * Dependencies: Repository (database operations)
 * Responsibility: User profile business logic and validation
 * 
 * Business Rules:
 * 1. user_type must be "user" or "organizer"
 * 2. Organizers must provide org_name
 * 3. Profile completion is one-time operation
 * 4. Deactivation is soft delete (is_active = false)
 * 
 * Operations:
 * - Get user profile
 * - Update profile fields
 * - Complete profile after signup
 * - Deactivate account
 */

package users

import (
	"context"

	"github.com/bukr/gateway/internal/shared"
)

/**
 * Service: User profile business logic
 * 
 * Handles user operations with validation
 * Delegates data access to repository layer
 */
type Service struct {
	repo *Repository    // Data access layer
}

/**
 * NewService: Constructor for user service
 * 
 * @param repo - User repository instance
 * @returns Service instance
 */
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

/**
 * GetProfile: Retrieve user profile by ID
 * 
 * @param ctx - Request context
 * @param userID - User ID
 * @returns User profile or ErrNotFound
 */
func (s *Service) GetProfile(ctx context.Context, userID string) (*UserResponse, error) {
	// Fetch user from repository
	user, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, shared.ErrNotFound
	}
	// Convert to response DTO
	resp := user.ToResponse()
	return &resp, nil
}

/**
 * UpdateProfile: Update user profile fields
 * 
 * Partial update: only provided fields are updated
 * Uses COALESCE in SQL to preserve existing values
 * 
 * @param ctx - Request context
 * @param userID - User ID
 * @param req - Update request with optional fields
 * @returns Updated user profile or ErrNotFound
 */
func (s *Service) UpdateProfile(ctx context.Context, userID string, req UpdateProfileRequest) (*UserResponse, error) {
	// Update via repository
	user, err := s.repo.UpdateProfile(ctx, userID, req)
	if err != nil {
		return nil, shared.ErrNotFound
	}
	// Convert to response DTO
	resp := user.ToResponse()
	return &resp, nil
}

/**
 * CompleteProfile: Complete profile after Supabase signup
 * 
 * Business Rules:
 * 1. user_type must be "user" or "organizer"
 * 2. Organizers must provide org_name
 * 
 * This is called once after user signs up via Supabase
 * Sets user_type which determines permissions
 * 
 * @param ctx - Request context
 * @param userID - User ID
 * @param req - Profile completion request
 * @returns Completed user profile or validation error
 */
func (s *Service) CompleteProfile(ctx context.Context, userID string, req CompleteProfileRequest) (*UserResponse, error) {
	// Validate user_type
	if req.UserType != "user" && req.UserType != "organizer" {
		return nil, shared.ErrValidation
	}

	// Validate organizer has org_name
	if req.UserType == "organizer" && (req.OrgName == nil || *req.OrgName == "") {
		return nil, shared.ErrValidation
	}

	// Complete profile via repository
	user, err := s.repo.CompleteProfile(ctx, userID, req)
	if err != nil {
		return nil, shared.ErrNotFound
	}
	// Convert to response DTO
	resp := user.ToResponse()
	return &resp, nil
}

/**
 * DeactivateAccount: Soft delete user account
 * 
 * Sets is_active = false
 * User can no longer login or access resources
 * Data retained for audit and compliance
 * 
 * @param ctx - Request context
 * @param userID - User ID
 * @returns Error if operation fails
 */
func (s *Service) DeactivateAccount(ctx context.Context, userID string) error {
	return s.repo.Deactivate(ctx, userID)
}
