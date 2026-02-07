package influencers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

const scanFields = `id::text, organizer_id::text, name, email, bio, social_handle, referral_code, referral_discount, total_referrals, total_revenue, is_active, created_at, updated_at`

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

func (r *Repository) GetByID(ctx context.Context, id, organizerID string) (*Influencer, error) {
	row := r.db.QueryRow(ctx,
		fmt.Sprintf("SELECT %s FROM influencers WHERE id = $1 AND organizer_id = $2", scanFields),
		id, organizerID,
	)
	return scanInfluencer(row.Scan)
}

func (r *Repository) Create(ctx context.Context, organizerID string, req CreateInfluencerRequest) (*Influencer, error) {
	referralCode := generateReferralCode(req.Name)

	row := r.db.QueryRow(ctx,
		fmt.Sprintf(`INSERT INTO influencers (organizer_id, name, email, bio, social_handle, referral_code)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING %s`, scanFields),
		organizerID, req.Name, req.Email, req.Bio, req.SocialHandle, referralCode,
	)
	return scanInfluencer(row.Scan)
}

func (r *Repository) Update(ctx context.Context, id, organizerID string, req UpdateInfluencerRequest) (*Influencer, error) {
	var setClauses []string
	var args []interface{}
	argIdx := 1

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

func generateReferralCode(name string) string {
	clean := strings.ToLower(strings.ReplaceAll(name, " ", ""))
	if len(clean) > 8 {
		clean = clean[:8]
	}

	b := make([]byte, 3)
	rand.Read(b)
	suffix := hex.EncodeToString(b)

	return fmt.Sprintf("INF-%s%s", clean, suffix)
}
