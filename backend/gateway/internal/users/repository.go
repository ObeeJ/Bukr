/**
 * REPOSITORY LAYER - User Database Operations
 * 
 * User Repository: The user vault - storing and retrieving user data
 * 
 * Architecture Layer: Repository (Layer 5)
 * Dependencies: Database (PostgreSQL via pgx)
 * Responsibility: CRUD operations for users table
 * 
 * Database Table: users
 * Columns:
 * - id: UUID primary key
 * - supabase_uid: Supabase auth user ID
 * - email: User email (from Supabase)
 * - name: Display name
 * - phone: Phone number
 * - user_type: "user" or "organizer"
 * - org_name: Organization name (for organizers)
 * - avatar_url: Profile picture URL
 * - is_active: Soft delete flag
 * - created_at, updated_at: Timestamps
 * 
 * Operations:
 * - GetByID: Fetch user by internal ID
 * - GetBySupabaseUID: Fetch user by Supabase auth ID
 * - UpdateProfile: Partial update of profile fields
 * - CompleteProfile: Set user_type and required fields
 * - Deactivate: Soft delete user
 */

package users

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

/**
 * Repository: User data access layer
 * 
 * Handles all database operations for users
 */
type Repository struct {
	db *pgxpool.Pool    // Database connection pool
}

/**
 * NewRepository: Constructor for user repository
 * 
 * @param db - Database connection pool
 * @returns Repository instance
 */
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

/**
 * GetByID: Fetch user by internal ID
 * 
 * Used for profile retrieval and updates
 * Only returns active users (is_active = true)
 * 
 * @param ctx - Request context
 * @param id - User ID (UUID)
 * @returns User or error if not found
 */
func (r *Repository) GetByID(ctx context.Context, id string) (*User, error) {
	user := &User{}
	err := r.db.QueryRow(ctx,
		`SELECT id::text, supabase_uid, email, name, phone, user_type, org_name, avatar_url, is_active, created_at, updated_at
		 FROM users WHERE id = $1 AND is_active = true`, id,
	).Scan(
		&user.ID, &user.SupabaseUID, &user.Email, &user.Name, &user.Phone,
		&user.UserType, &user.OrgName, &user.AvatarURL, &user.IsActive,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

/**
 * GetBySupabaseUID: Fetch user by Supabase auth ID
 * 
 * Used by auth middleware for just-in-time user provisioning
 * Maps Supabase auth user to internal user record
 * 
 * @param ctx - Request context
 * @param supabaseUID - Supabase user ID from JWT
 * @returns User or error if not found
 */
func (r *Repository) GetBySupabaseUID(ctx context.Context, supabaseUID string) (*User, error) {
	user := &User{}
	err := r.db.QueryRow(ctx,
		`SELECT id::text, supabase_uid, email, name, phone, user_type, org_name, avatar_url, is_active, created_at, updated_at
		 FROM users WHERE supabase_uid = $1 AND is_active = true`, supabaseUID,
	).Scan(
		&user.ID, &user.SupabaseUID, &user.Email, &user.Name, &user.Phone,
		&user.UserType, &user.OrgName, &user.AvatarURL, &user.IsActive,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

/**
 * UpdateProfile: Partial update of profile fields
 * 
 * Uses COALESCE to only update provided fields
 * NULL values preserve existing data
 * 
 * Updatable fields:
 * - name: Display name
 * - phone: Phone number
 * - org_name: Organization name
 * 
 * @param ctx - Request context
 * @param id - User ID
 * @param req - Update request with optional fields
 * @returns Updated user or error
 */
func (r *Repository) UpdateProfile(ctx context.Context, id string, req UpdateProfileRequest) (*User, error) {
	user := &User{}
	err := r.db.QueryRow(ctx,
		`UPDATE users SET
			name = COALESCE($2, name),
			phone = COALESCE($3, phone),
			org_name = COALESCE($4, org_name)
		 WHERE id = $1 AND is_active = true
		 RETURNING id::text, supabase_uid, email, name, phone, user_type, org_name, avatar_url, is_active, created_at, updated_at`,
		id, req.Name, req.Phone, req.OrgName,
	).Scan(
		&user.ID, &user.SupabaseUID, &user.Email, &user.Name, &user.Phone,
		&user.UserType, &user.OrgName, &user.AvatarURL, &user.IsActive,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

/**
 * CompleteProfile: Set user_type and required fields
 * 
 * Called once after Supabase signup
 * Sets user_type which determines permissions:
 * - "user": Regular ticket buyer
 * - "organizer": Event creator
 * 
 * @param ctx - Request context
 * @param id - User ID
 * @param req - Profile completion request
 * @returns Completed user or error
 */
func (r *Repository) CompleteProfile(ctx context.Context, id string, req CompleteProfileRequest) (*User, error) {
	user := &User{}
	err := r.db.QueryRow(ctx,
		`UPDATE users SET
			name = $2,
			user_type = $3,
			org_name = $4
		 WHERE id = $1 AND is_active = true
		 RETURNING id::text, supabase_uid, email, name, phone, user_type, org_name, avatar_url, is_active, created_at, updated_at`,
		id, req.Name, req.UserType, req.OrgName,
	).Scan(
		&user.ID, &user.SupabaseUID, &user.Email, &user.Name, &user.Phone,
		&user.UserType, &user.OrgName, &user.AvatarURL, &user.IsActive,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

/**
 * Deactivate: Soft delete user account
 * 
 * Sets is_active = false
 * User can no longer login or access resources
 * Data retained for audit and compliance purposes
 * 
 * @param ctx - Request context
 * @param id - User ID
 * @returns Error if operation fails
 */
func (r *Repository) Deactivate(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE users SET is_active = false WHERE id = $1`, id,
	)
	return err
}
