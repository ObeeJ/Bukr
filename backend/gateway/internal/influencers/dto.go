/**
 * DOMAIN LAYER - Influencer Data Transfer Objects
 * 
 * Influencer DTOs: The affiliate contracts - defining influencer data structures
 * 
 * Architecture Layer: Domain (Layer 4)
 * Responsibility: Define data contracts for influencer operations
 */

package influencers

import "time"

/**
 * REQUEST DTOs
 */

// CreateInfluencerRequest: Create new influencer
type CreateInfluencerRequest struct {
	Name         string  `json:"name" validate:"required,min=2"`
	Email        string  `json:"email" validate:"required,email"`
	SocialHandle string  `json:"social_handle"`
	Bio          string  `json:"bio"`
}

// UpdateInfluencerRequest: Partial influencer update
type UpdateInfluencerRequest struct {
	Name         *string `json:"name"`
	Email        *string `json:"email"`
	SocialHandle *string `json:"social_handle"`
	Bio          *string `json:"bio"`
	IsActive     *bool   `json:"is_active"`
}

/**
 * RESPONSE DTOs
 */

// InfluencerResponse: Public influencer details
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

// ReferralLinkResponse: Shareable referral link
type ReferralLinkResponse struct {
	ReferralCode string `json:"referral_code"`
	ReferralLink string `json:"referral_link"`    // Full URL with code
}

/**
 * INTERNAL MODELS
 */

// Influencer: Complete influencer entity from database
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

/**
 * ToResponse: Convert internal model to public response
 * 
 * Excludes organizer_id and updated_at
 */
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
