/**
 * DOMAIN LAYER - User Data Transfer Objects
 * 
 * User DTOs: The data contracts - defining user data structures
 * 
 * Architecture Layer: Domain (Layer 4)
 * Responsibility: Define data contracts for user operations
 * 
 * DTO Types:
 * 1. Request DTOs: Data coming from clients
 * 2. Response DTOs: Data sent to clients
 * 3. Internal Models: Database entities
 * 
 * Why separate DTOs from models?
 * - API stability: Change database without breaking API
 * - Security: Hide sensitive fields (passwords, internal IDs)
 * - Flexibility: Different representations for different contexts
 */

package users

import "time"

/**
 * REQUEST DTOs - Data from clients
 */

// UpdateProfileRequest: Partial profile update
// All fields optional (nil = no change)
type UpdateProfileRequest struct {
	Name    *string `json:"name"`
	Phone   *string `json:"phone"`
	OrgName *string `json:"org_name"`
}

// CompleteProfileRequest: Called after Supabase signup
// Sets user_type and required fields
type CompleteProfileRequest struct {
	UserType string  `json:"user_type" validate:"required,oneof=user organizer"`
	OrgName  *string `json:"org_name"`
	Name     string  `json:"name" validate:"required,min=2"`
}

/**
 * RESPONSE DTOs - Data to clients
 */

// UserResponse: Public user profile
// Excludes sensitive fields (supabase_uid, is_active)
type UserResponse struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Phone     *string   `json:"phone,omitempty"`
	UserType  string    `json:"user_type"`
	OrgName   *string   `json:"org_name,omitempty"`
	AvatarURL *string   `json:"avatar_url,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

/**
 * INTERNAL MODELS - Database entities
 */

// User: Complete user entity from database
// Includes all fields including sensitive ones
type User struct {
	ID          string
	SupabaseUID string    // Supabase auth user ID
	Email       string
	Name        string
	Phone       *string
	UserType    string    // "user" or "organizer"
	OrgName     *string
	AvatarURL   *string
	IsActive    bool      // Soft delete flag
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

/**
 * ToResponse: Convert internal model to public response
 * 
 * Filters out sensitive fields
 * Maps database entity to API contract
 * 
 * @returns UserResponse for API
 */
func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:        u.ID,
		Email:     u.Email,
		Name:      u.Name,
		Phone:     u.Phone,
		UserType:  u.UserType,
		OrgName:   u.OrgName,
		AvatarURL: u.AvatarURL,
		CreatedAt: u.CreatedAt,
	}
}
