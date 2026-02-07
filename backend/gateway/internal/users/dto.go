package users

import "time"

// --- Request DTOs ---

type UpdateProfileRequest struct {
	Name    *string `json:"name"`
	Phone   *string `json:"phone"`
	OrgName *string `json:"org_name"`
}

// CompleteProfileRequest is called after Supabase signup to set user_type and org_name.
type CompleteProfileRequest struct {
	UserType string  `json:"user_type" validate:"required,oneof=user organizer"`
	OrgName  *string `json:"org_name"`
	Name     string  `json:"name" validate:"required,min=2"`
}

// --- Response DTOs ---

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

// --- Internal model ---

type User struct {
	ID          string
	SupabaseUID string
	Email       string
	Name        string
	Phone       *string
	UserType    string
	OrgName     *string
	AvatarURL   *string
	IsActive    bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

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
