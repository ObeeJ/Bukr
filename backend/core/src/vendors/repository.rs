/**
 * REPOSITORY LAYER — Vendor Data Access
 *
 * All SQL for the vendor marketplace: vendors, hires, reviews, availability, invitations.
 * Follows the same patterns as TicketRepository — runtime sqlx queries, no macros.
 */

use chrono::NaiveDate;
use rust_decimal::Decimal;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use super::dto::{
    CreateVendorRequest, EventForMatch, HireResponse, InviteResponse,
    ReviewResponse, VendorListResponse, VendorResponse, VendorRow, VendorSearchParams,
};

pub struct VendorRepository {
    pool: PgPool,
}

impl VendorRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    // ── VENDOR CRUD ───────────────────────────────────────────────────────────

    /// Create a new vendor profile linked to an existing user account.
    pub async fn create(
        &self,
        user_id: Uuid,
        req: &CreateVendorRequest,
    ) -> Result<VendorRow, sqlx::Error> {
        // Commission rate: free/commission-only tier = 8%, others = 5%
        let commission_rate = if req.commission_only {
            Decimal::new(80, 3) // 0.080
        } else {
            Decimal::new(50, 3) // 0.050
        };
        let tier = if req.commission_only { "free" } else { "free" }; // starts free; upgraded after payment

        let portfolio = req.portfolio_urls.clone().unwrap_or_default();

        let row = sqlx::query(
            r#"INSERT INTO vendors
               (user_id, business_name, category, bio, location, city,
                serves_nationwide, portfolio_urls, tier, commission_rate)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, user_id, business_name, category, bio, location, city,
                      serves_nationwide, portfolio_urls, tier, commission_rate,
                      rating, bayesian_rating, review_count, hire_count,
                      completion_rate, response_rate, is_verified, is_available,
                      profile_views, last_active_at, created_at, updated_at"#,
        )
        .bind(user_id)
        .bind(&req.business_name)
        .bind(&req.category)
        .bind(&req.bio)
        .bind(&req.location)
        .bind(&req.city)
        .bind(req.serves_nationwide)
        .bind(&portfolio)
        .bind(tier)
        .bind(commission_rate)
        .fetch_one(&self.pool)
        .await?;

        Ok(row_to_vendor(&row))
    }

    /// Fetch a single vendor by their UUID.
    pub async fn get_by_id(&self, id: Uuid) -> Result<Option<VendorRow>, sqlx::Error> {
        let row = sqlx::query(
            r#"SELECT id, user_id, business_name, category, bio, location, city,
                      serves_nationwide, portfolio_urls, tier, commission_rate,
                      rating, bayesian_rating, review_count, hire_count,
                      completion_rate, response_rate, is_verified, is_available,
                      profile_views, last_active_at, created_at, updated_at
               FROM vendors WHERE id = $1"#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.as_ref().map(row_to_vendor))
    }

    /// Fetch vendor profile by user_id (for the vendor's own dashboard).
    pub async fn get_by_user_id(&self, user_id: Uuid) -> Result<Option<VendorRow>, sqlx::Error> {
        let row = sqlx::query(
            r#"SELECT id, user_id, business_name, category, bio, location, city,
                      serves_nationwide, portfolio_urls, tier, commission_rate,
                      rating, bayesian_rating, review_count, hire_count,
                      completion_rate, response_rate, is_verified, is_available,
                      profile_views, last_active_at, created_at, updated_at
               FROM vendors WHERE user_id = $1"#,
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.as_ref().map(row_to_vendor))
    }

    /// Paginated vendor search with optional filters.
    pub async fn search(&self, params: &VendorSearchParams) -> Result<VendorListResponse, sqlx::Error> {
        let page  = params.page.unwrap_or(1).max(1);
        let limit = params.limit.unwrap_or(20).clamp(1, 50);
        let offset = (page - 1) * limit;

        // Build WHERE clause fragments — filter only when param is provided
        // Using a fixed query with NULLable conditions avoids dynamic SQL
        let rows = sqlx::query(
            r#"SELECT id, user_id, business_name, category, bio, location, city,
                      serves_nationwide, portfolio_urls, tier, commission_rate,
                      rating, bayesian_rating, review_count, hire_count,
                      completion_rate, response_rate, is_verified, is_available,
                      profile_views, last_active_at, created_at, updated_at
               FROM vendors
               WHERE is_available = true
                 AND ($1::text IS NULL OR category = $1)
                 AND ($2::text IS NULL OR LOWER(city) = LOWER($2) OR serves_nationwide = true)
                 AND ($3::text IS NULL OR tier = $3)
                 AND ($4::float8 IS NULL OR bayesian_rating >= $4)
                 AND ($5::date IS NULL OR NOT EXISTS (
                       SELECT 1 FROM vendor_availability va
                       WHERE va.vendor_id = vendors.id
                         AND va.date = $5::date
                         AND va.is_booked = true
                 ))
               ORDER BY is_verified DESC, bayesian_rating DESC, tier DESC, review_count DESC
               LIMIT $6 OFFSET $7"#,
        )
        .bind(&params.category)
        .bind(&params.city)
        .bind(&params.tier)
        .bind(params.min_rating)
        .bind(params.date.as_ref().and_then(|d| d.parse::<NaiveDate>().ok()))
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        // Count total for pagination
        let total: i64 = sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM vendors
               WHERE is_available = true
                 AND ($1::text IS NULL OR category = $1)
                 AND ($2::text IS NULL OR LOWER(city) = LOWER($2) OR serves_nationwide = true)
                 AND ($3::text IS NULL OR tier = $3)
                 AND ($4::float8 IS NULL OR bayesian_rating >= $4)"#,
        )
        .bind(&params.category)
        .bind(&params.city)
        .bind(&params.tier)
        .bind(params.min_rating)
        .fetch_one(&self.pool)
        .await?;

        let vendors: Vec<VendorResponse> = rows.iter()
            .map(|row| VendorResponse::from(row_to_vendor(row)))
            .collect();
        Ok(VendorListResponse { vendors, total, page, limit })
    }

    /// Fetch available vendors for AI matchmaking — filters by date and city eagerly.
    /// Returns all matching candidates; scoring is done in the service layer.
    pub async fn get_candidates_for_match(
        &self,
        date: NaiveDate,
        city: &str,
    ) -> Result<Vec<VendorRow>, sqlx::Error> {
        let rows = sqlx::query(
            r#"SELECT id, user_id, business_name, category, bio, location, city,
                      serves_nationwide, portfolio_urls, tier, commission_rate,
                      rating, bayesian_rating, review_count, hire_count,
                      completion_rate, response_rate, is_verified, is_available,
                      profile_views, last_active_at, created_at, updated_at
               FROM vendors
               WHERE is_available = true
                 AND (LOWER(city) = LOWER($1) OR serves_nationwide = true)
                 AND NOT EXISTS (
                       SELECT 1 FROM vendor_availability va
                       WHERE va.vendor_id = vendors.id
                         AND va.date = $2
                         AND va.is_booked = true
                 )
               ORDER BY bayesian_rating DESC"#,
        )
        .bind(city)
        .bind(date)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(row_to_vendor).collect())
    }

    /// Fetch event info needed for matchmaking (category, city, date).
    /// city is now a first-class indexed column (migration 016) — no string splitting.
    pub async fn get_event_for_match(&self, event_id: Uuid) -> Result<Option<EventForMatch>, sqlx::Error> {
        let row = sqlx::query(
            "SELECT id, category, city, date FROM events WHERE id = $1 AND status = 'active'"
        )
        .bind(event_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| EventForMatch {
            id:       r.get("id"),
            category: r.get("category"),
            city:     r.get("city"),
            date:     r.get("date"),
        }))
    }

    /// Increment a vendor's profile view counter (fire-and-forget OK).
    pub async fn increment_views(&self, vendor_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE vendors SET profile_views = profile_views + 1 WHERE id = $1")
            .bind(vendor_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Update a vendor's tier and commission rate after payment.
    pub async fn upgrade_tier(
        &self,
        vendor_id: Uuid,
        tier: &str,
        commission_rate: Decimal,
        subscription_expires_at: Option<chrono::DateTime<chrono::Utc>>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE vendors SET tier = $2, commission_rate = $3, subscription_expires_at = $4,
             verification_paid_at = CASE WHEN $2 IN ('verified','pro') THEN NOW() ELSE verification_paid_at END
             WHERE id = $1"
        )
        .bind(vendor_id)
        .bind(tier)
        .bind(commission_rate)
        .bind(subscription_expires_at)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // ── AVAILABILITY ──────────────────────────────────────────────────────────

    /// Bulk upsert availability for a list of dates.
    pub async fn set_availability(
        &self,
        vendor_id: Uuid,
        dates: &[NaiveDate],
        is_booked: bool,
    ) -> Result<(), sqlx::Error> {
        for date in dates {
            sqlx::query(
                r#"INSERT INTO vendor_availability (vendor_id, date, is_booked)
                   VALUES ($1, $2, $3)
                   ON CONFLICT (vendor_id, date) DO UPDATE SET is_booked = EXCLUDED.is_booked"#,
            )
            .bind(vendor_id)
            .bind(date)
            .bind(is_booked)
            .execute(&self.pool)
            .await?;
        }
        Ok(())
    }

    // ── HIRE REQUESTS ─────────────────────────────────────────────────────────

    /// Create a new hire request from organizer to vendor.
    pub async fn create_hire(
        &self,
        event_id: Uuid,
        vendor_id: Uuid,
        organizer_id: Uuid,
        proposed_amount: Option<Decimal>,
        commission_rate: Decimal,
        message: Option<&str>,
    ) -> Result<HireResponse, sqlx::Error> {
        let row = sqlx::query(
            r#"INSERT INTO vendor_hires
               (event_id, vendor_id, organizer_id, proposed_amount, commission_rate, message)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, event_id, vendor_id, organizer_id, proposed_amount, agreed_amount,
                      bukr_commission, commission_rate, status, message, counter_amount,
                      payment_ref, paid_at, created_at, updated_at"#,
        )
        .bind(event_id)
        .bind(vendor_id)
        .bind(organizer_id)
        .bind(proposed_amount)
        .bind(commission_rate)
        .bind(message)
        .fetch_one(&self.pool)
        .await?;

        Ok(row_to_hire(&row))
    }

    /// Fetch a hire by its ID.
    pub async fn get_hire(&self, hire_id: Uuid) -> Result<Option<HireResponse>, sqlx::Error> {
        let row = sqlx::query(
            r#"SELECT id, event_id, vendor_id, organizer_id, proposed_amount, agreed_amount,
                      bukr_commission, commission_rate, status, message, counter_amount,
                      payment_ref, paid_at, created_at, updated_at
               FROM vendor_hires WHERE id = $1"#,
        )
        .bind(hire_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.as_ref().map(row_to_hire))
    }

    /// Get all hires for a specific vendor (their incoming job offers).
    pub async fn get_vendor_hires(&self, vendor_id: Uuid) -> Result<Vec<HireResponse>, sqlx::Error> {
        let rows = sqlx::query(
            r#"SELECT id, event_id, vendor_id, organizer_id, proposed_amount, agreed_amount,
                      bukr_commission, commission_rate, status, message, counter_amount,
                      payment_ref, paid_at, created_at, updated_at
               FROM vendor_hires WHERE vendor_id = $1 ORDER BY created_at DESC"#,
        )
        .bind(vendor_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(row_to_hire).collect())
    }

    /// Get all hires placed by a specific organizer.
    pub async fn get_organizer_hires(&self, organizer_id: Uuid) -> Result<Vec<HireResponse>, sqlx::Error> {
        let rows = sqlx::query(
            r#"SELECT id, event_id, vendor_id, organizer_id, proposed_amount, agreed_amount,
                      bukr_commission, commission_rate, status, message, counter_amount,
                      payment_ref, paid_at, created_at, updated_at
               FROM vendor_hires WHERE organizer_id = $1 ORDER BY created_at DESC"#,
        )
        .bind(organizer_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(row_to_hire).collect())
    }

    /// Update hire status + optional fields.
    pub async fn update_hire_status(
        &self,
        hire_id: Uuid,
        status: &str,
        agreed_amount: Option<Decimal>,
        counter_amount: Option<Decimal>,
        bukr_commission: Option<Decimal>,
    ) -> Result<HireResponse, sqlx::Error> {
        let row = sqlx::query(
            r#"UPDATE vendor_hires
               SET status          = $2,
                   agreed_amount   = COALESCE($3, agreed_amount),
                   counter_amount  = COALESCE($4, counter_amount),
                   bukr_commission = COALESCE($5, bukr_commission)
               WHERE id = $1
               RETURNING id, event_id, vendor_id, organizer_id, proposed_amount, agreed_amount,
                         bukr_commission, commission_rate, status, message, counter_amount,
                         payment_ref, paid_at, created_at, updated_at"#,
        )
        .bind(hire_id)
        .bind(status)
        .bind(agreed_amount)
        .bind(counter_amount)
        .bind(bukr_commission)
        .fetch_one(&self.pool)
        .await?;

        Ok(row_to_hire(&row))
    }

    // ── REVIEWS ───────────────────────────────────────────────────────────────

    /// Create a review for a completed hire. DB trigger auto-recomputes vendor rating.
    pub async fn create_review(
        &self,
        vendor_id: Uuid,
        reviewer_id: Uuid,
        hire_id: Uuid,
        event_id: Option<Uuid>,
        rating: i32,
        review: Option<&str>,
    ) -> Result<ReviewResponse, sqlx::Error> {
        let row = sqlx::query(
            r#"INSERT INTO vendor_reviews (vendor_id, reviewer_id, hire_id, event_id, rating, review)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING id, vendor_id, reviewer_id, hire_id, rating, review, created_at"#,
        )
        .bind(vendor_id)
        .bind(reviewer_id)
        .bind(hire_id)
        .bind(event_id)
        .bind(rating)
        .bind(review)
        .fetch_one(&self.pool)
        .await?;

        Ok(ReviewResponse {
            id:          row.get("id"),
            vendor_id:   row.get("vendor_id"),
            reviewer_id: row.get("reviewer_id"),
            hire_id:     row.get("hire_id"),
            rating:      row.get("rating"),
            review:      row.get("review"),
            created_at:  row.get("created_at"),
        })
    }

    /// Get all reviews for a vendor (for profile display).
    pub async fn get_vendor_reviews(&self, vendor_id: Uuid) -> Result<Vec<ReviewResponse>, sqlx::Error> {
        let rows = sqlx::query(
            r#"SELECT id, vendor_id, reviewer_id, hire_id, rating, review, created_at
               FROM vendor_reviews WHERE vendor_id = $1 ORDER BY created_at DESC"#,
        )
        .bind(vendor_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(|r| ReviewResponse {
            id:          r.get("id"),
            vendor_id:   r.get("vendor_id"),
            reviewer_id: r.get("reviewer_id"),
            hire_id:     r.get("hire_id"),
            rating:      r.get("rating"),
            review:      r.get("review"),
            created_at:  r.get("created_at"),
        }).collect())
    }

    // ── INVITATIONS ───────────────────────────────────────────────────────────

    /// Create a vendor invitation record and return the token to embed in email.
    pub async fn create_invitation(
        &self,
        organizer_id: Uuid,
        event_id: Option<Uuid>,
        email: &str,
    ) -> Result<InviteResponse, sqlx::Error> {
        let row = sqlx::query(
            r#"INSERT INTO vendor_invitations (organizer_id, event_id, email)
               VALUES ($1, $2, $3)
               ON CONFLICT (organizer_id, email, event_id) DO UPDATE
               SET sent_at = NOW(), expires_at = NOW() + INTERVAL '7 days', status = 'pending'
               RETURNING id, email, token, expires_at"#,
        )
        .bind(organizer_id)
        .bind(event_id)
        .bind(email)
        .fetch_one(&self.pool)
        .await?;

        Ok(InviteResponse {
            invitation_id: row.get("id"),
            email:         row.get("email"),
            token:         row.get("token"),
            expires_at:    row.get("expires_at"),
        })
    }

    /// Look up an invitation by token (for the claim flow).
    pub async fn get_invitation_by_token(
        &self,
        token: &str,
    ) -> Result<Option<serde_json::Value>, sqlx::Error> {
        let row = sqlx::query(
            r#"SELECT id, organizer_id, event_id, email, token, status, expires_at
               FROM vendor_invitations
               WHERE token = $1 AND status = 'pending' AND expires_at > NOW()"#,
        )
        .bind(token)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| serde_json::json!({
            "id":           r.get::<Uuid, _>("id"),
            "organizer_id": r.get::<Uuid, _>("organizer_id"),
            "event_id":     r.get::<Option<Uuid>, _>("event_id"),
            "email":        r.get::<String, _>("email"),
            "token":        r.get::<String, _>("token"),
        })))
    }

    /// Mark invitation as registered once vendor creates their account.
    pub async fn claim_invitation(&self, token: &str) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE vendor_invitations SET status = 'registered' WHERE token = $1")
            .bind(token)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}

// ── ROW MAPPERS ───────────────────────────────────────────────────────────────

fn row_to_vendor(row: &sqlx::postgres::PgRow) -> VendorRow {
    VendorRow {
        id:                row.get("id"),
        user_id:           row.get("user_id"),
        business_name:     row.get("business_name"),
        category:          row.get("category"),
        bio:               row.get("bio"),
        location:          row.get("location"),
        city:              row.get("city"),
        serves_nationwide: row.get("serves_nationwide"),
        portfolio_urls:    row.get("portfolio_urls"),
        tier:              row.get("tier"),
        commission_rate:   row.get("commission_rate"),
        rating:            row.get("rating"),
        bayesian_rating:   row.get("bayesian_rating"),
        review_count:      row.get("review_count"),
        hire_count:        row.get("hire_count"),
        completion_rate:   row.get("completion_rate"),
        response_rate:     row.get("response_rate"),
        is_verified:       row.get("is_verified"),
        is_available:      row.get("is_available"),
        profile_views:     row.get("profile_views"),
        last_active_at:    row.get("last_active_at"),
        created_at:        row.get("created_at"),
        updated_at:        row.get("updated_at"),
    }
}

fn row_to_hire(row: &sqlx::postgres::PgRow) -> HireResponse {
    HireResponse {
        id:              row.get("id"),
        event_id:        row.get("event_id"),
        vendor_id:       row.get("vendor_id"),
        organizer_id:    row.get("organizer_id"),
        proposed_amount: row.get("proposed_amount"),
        agreed_amount:   row.get("agreed_amount"),
        bukr_commission: row.get("bukr_commission"),
        commission_rate: row.get("commission_rate"),
        status:          row.get("status"),
        message:         row.get("message"),
        counter_amount:  row.get("counter_amount"),
        created_at:      row.get("created_at"),
        updated_at:      row.get("updated_at"),
    }
}
