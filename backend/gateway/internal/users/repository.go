package users

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

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

func (r *Repository) Deactivate(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE users SET is_active = false WHERE id = $1`, id,
	)
	return err
}
