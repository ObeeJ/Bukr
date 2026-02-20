/**
 * REPOSITORY LAYER - Influencer Database Operations
 * 
 * Influencer Repository: The affiliate vault - storing referral partners
 * 
 * Architecture Layer: Repository (Layer 5)
 * Dependencies: Database (PostgreSQL via pgx)
 * Responsibility: CRUD operations for influencers table
 * 
 * Database Table: influencers
 * Columns:
 * - id: UUID primary key
 * - organizer_id: Foreign key to users (owner)
 * - name: Influencer name
 * - email: Contact email
 * - bio: Description
 * - social_handle: Social media handle
 * - referral_code: Unique tracking code (INF-{name}{random})
 * - referral_discount: Discount percentage for referrals
 * - total_referrals: Count of successful referrals
 * - total_revenue: Revenue generated via referrals
 * - is_active: Enable/disable flag
 */

package influencers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

/**
 * Repository: Influencer data access
 */
type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Database column list for SELECT queries
const scanFields = `id::text, organizer_id::text, name, email, bio, social_handle, referral_code, referral_discount, total_referrals, total_revenue, is_active, created_at, updated_at`

/**
 * scanInfluencer: Helper to scan database row into Influencer struct
 */
func scanInfluencer(scan func(dest ...interface{}) error) (*Influencer, error) {
	inf := &Influencer{}
	err := scan(
		&inf.ID, &inf.OrganizerID, &inf.Name, &inf.Email, &inf.Bio,
		&inf.SocialHandle, &inf.ReferralCode, &inf.ReferralDiscount,
		&inf.TotalReferrals, &inf.TotalRevenue, &inf.IsActive,
		&inf.CreatedAt, &inf.UpdatedAt,
	)
	return inf, err
}

/**
 * List: Get organizer's influencers
 * 
 * Ordered by creation date (newest first)
 */
func (r *Repository) List(ctx context.Context, organizerID string) ([]Influencer, error) {
	rows, err := r.db.Query(ctx,
		fmt.Sprintf("SELECT %s FROM influencers WHERE organizer_id = $1 ORDER BY created_at DESC", scanFields),
		organizerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var influencers []Influencer
	for rows.Next() {
		inf, err := scanInfluencer(rows.Scan)
		if err != nil {
			return nil, err
		}
		influencers = append(influencers, *inf)
	}
	return influencers, nil
}

/**
 * GetByID: Get influencer by ID
 * 
 * Requires organizer_id for authorization
 */
func (r *Repository) GetByID(ctx context.Context, id, organizerID string) (*Influencer, error) {
	row := r.db.QueryRow(ctx,
		fmt.Sprintf("SELECT %s FROM influencers WHERE id = $1 AND organizer_id = $2", scanFields),
		id, organizerID,
	)
	return scanInfluencer(row.Scan)
}

/**
 * Create: Create new influencer
 * 
 * Generates unique referral code from name
 * Format: INF-{name}{random}
 */
func (r *Repository) Create(ctx context.Context, organizerID string, req CreateInfluencerRequest) (*Influencer, error) {
	// Generate unique referral code
	referralCode := generateReferralCode(req.Name)

	row := r.db.QueryRow(ctx,
		fmt.Sprintf(`INSERT INTO influencers (organizer_id, name, email, bio, social_handle, referral_code)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING %s`, scanFields),
		organizerID, req.Name, req.Email, req.Bio, req.SocialHandle, referralCode,
	)
	return scanInfluencer(row.Scan)
}

/**
 * Update: Update influencer details
 * 
 * Partial update using dynamic SET clause
 */
func (r *Repository) Update(ctx context.Context, id, organizerID string, req UpdateInfluencerRequest) (*Influencer, error) {
	var setClauses []string
	var args []interface{}
	argIdx := 1

	// Build dynamic SET clause
	addField := func(clause string, val interface{}) {
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", clause, argIdx))
		args = append(args, val)
		argIdx++
	}

	if req.Name != nil {
		addField("name", *req.Name)
	}
	if req.Email != nil {
		addField("email", *req.Email)
	}
	if req.SocialHandle != nil {
		addField("social_handle", *req.SocialHandle)
	}
	if req.Bio != nil {
		addField("bio", *req.Bio)
	}
	if req.IsActive != nil {
		addField("is_active", *req.IsActive)
	}

	// No changes, return existing
	if len(setClauses) == 0 {
		return r.GetByID(ctx, id, organizerID)
	}

	args = append(args, id, organizerID)

	query := fmt.Sprintf(
		`UPDATE influencers SET %s WHERE id = $%d AND organizer_id = $%d RETURNING %s`,
		strings.Join(setClauses, ", "), argIdx, argIdx+1, scanFields,
	)

	row := r.db.QueryRow(ctx, query, args...)
	return scanInfluencer(row.Scan)
}

/**
 * Delete: Delete influencer
 * 
 * Only owner can delete
 */
func (r *Repository) Delete(ctx context.Context, id, organizerID string) error {
	result, err := r.db.Exec(ctx,
		"DELETE FROM influencers WHERE id = $1 AND organizer_id = $2", id, organizerID,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("influencer not found")
	}
	return nil
}

/**
 * generateReferralCode: Create unique referral code
 * 
 * Format: INF-{name}{random}
 * Example: INF-johndoe3a2f1b
 * 
 * Steps:
 * 1. Clean name (lowercase, remove spaces)
 * 2. Truncate to 8 chars
 * 3. Add 6-char random hex suffix
 */
func generateReferralCode(name string) string {
	// Clean and truncate name
	clean := strings.ToLower(strings.ReplaceAll(name, " ", ""))
	if len(clean) > 8 {
		clean = clean[:8]
	}

	// Generate random suffix
	b := make([]byte, 3)
	rand.Read(b)
	suffix := hex.EncodeToString(b)

	return fmt.Sprintf("INF-%s%s", clean, suffix)
}
