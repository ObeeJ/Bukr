package influencers

import "time"

// --- Request DTOs ---

type CreateInfluencerRequest struct {
	Name         string  `json:"name" validate:"required,min=2"`
	Email        string  `json:"email" validate:"required,email"`
	SocialHandle string  `json:"social_handle"`
	Bio          string  `json:"bio"`
}

type UpdateInfluencerRequest struct {
	Name         *string `json:"name"`
	Email        *string `json:"email"`
	SocialHandle *string `json:"social_handle"`
	Bio          *string `json:"bio"`
	IsActive     *bool   `json:"is_active"`
}

// --- Response DTOs ---

type InfluencerResponse struct {
	ID               string    `json:"id"`
	Name             string    `json:"name"`
	Email            string    `json:"email"`
	SocialHandle     string    `json:"social_handle"`
	Bio              string    `json:"bio"`
	ReferralCode     string    `json:"referral_code"`
	ReferralDiscount float64   `json:"referral_discount"`
	TotalReferrals   int       `json:"total_referrals"`
	TotalRevenue     float64   `json:"total_revenue"`
	IsActive         bool      `json:"is_active"`
	CreatedAt        time.Time `json:"created_at"`
}

type ReferralLinkResponse struct {
	ReferralCode string `json:"referral_code"`
	ReferralLink string `json:"referral_link"`
}

// --- Internal model ---

type Influencer struct {
	ID               string
	OrganizerID      string
	Name             string
	Email            string
	Bio              string
	SocialHandle     string
	ReferralCode     string
	ReferralDiscount float64
	TotalReferrals   int
	TotalRevenue     float64
	IsActive         bool
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

func (i *Influencer) ToResponse() InfluencerResponse {
	return InfluencerResponse{
		ID:               i.ID,
		Name:             i.Name,
		Email:            i.Email,
		SocialHandle:     i.SocialHandle,
		Bio:              i.Bio,
		ReferralCode:     i.ReferralCode,
		ReferralDiscount: i.ReferralDiscount,
		TotalReferrals:   i.TotalReferrals,
		TotalRevenue:     i.TotalRevenue,
		IsActive:         i.IsActive,
		CreatedAt:        i.CreatedAt,
	}
}
