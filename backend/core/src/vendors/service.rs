/**
 * USE CASE LAYER — Vendor Service
 *
 * Business logic for the vendor marketplace:
 * - Vendor registration and profile management
 * - Hire request lifecycle (request → accept/decline → complete)
 * - AI matchmaking: multi-factor scoring with BinaryHeap O(n log k) top-K selection
 * - Review submission (triggers DB-level Bayesian rating recompute)
 * - Vendor invitations
 */

use std::cmp::Reverse;
use std::collections::{BinaryHeap, HashMap};

use chrono::{NaiveDate, Utc};
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::error::{AppError, Result};

use super::dto::{
    AvailabilitySetRequest, CompleteHireRequest, CreateVendorRequest, HireRequest,
    HireRespondRequest, HireResponse, InviteResponse, InviteVendorRequest,
    ReviewRequest, ReviewResponse, ScoredVendor, VendorListResponse, VendorMatchResult,
    VendorResponse, VendorRow, VendorSearchParams,
};
use super::repository::VendorRepository;

pub struct VendorService {
    repo: VendorRepository,
}

impl VendorService {
    pub fn new(repo: VendorRepository) -> Self {
        Self { repo }
    }

    // ── VENDOR REGISTRATION ───────────────────────────────────────────────────

    pub async fn register(&self, user_id: Uuid, req: CreateVendorRequest) -> Result<VendorResponse> {
        // Check if this user already has a vendor profile
        if let Some(_) = self.repo.get_by_user_id(user_id).await.map_err(AppError::Database)? {
            return Err(AppError::Validation("You already have a vendor profile".into()));
        }
        let vendor = self.repo.create(user_id, &req).await.map_err(AppError::Database)?;
        Ok(VendorResponse::from(vendor))
    }

    pub async fn get_vendor(&self, vendor_id: Uuid, viewer_id: Option<Uuid>) -> Result<VendorResponse> {
        let vendor = self.repo.get_by_id(vendor_id).await.map_err(AppError::Database)?
            .ok_or_else(|| AppError::NotFound("Vendor not found".into()))?;

        // Increment profile views if the viewer is not the vendor themselves
        if viewer_id.map(|v| v != vendor.user_id).unwrap_or(true) {
            let _ = self.repo.increment_views(vendor_id).await;
        }
        Ok(VendorResponse::from(vendor))
    }

    pub async fn get_my_profile(&self, user_id: Uuid) -> Result<VendorResponse> {
        let vendor = self.repo.get_by_user_id(user_id).await.map_err(AppError::Database)?
            .ok_or_else(|| AppError::NotFound("Vendor profile not found. Register as a vendor first.".into()))?;
        Ok(VendorResponse::from(vendor))
    }

    pub async fn search(&self, params: VendorSearchParams) -> Result<VendorListResponse> {
        self.repo.search(&params).await.map_err(AppError::Database)
    }

    // ── AVAILABILITY ──────────────────────────────────────────────────────────

    pub async fn set_availability(&self, user_id: Uuid, req: AvailabilitySetRequest) -> Result<()> {
        let vendor = self.repo.get_by_user_id(user_id).await.map_err(AppError::Database)?
            .ok_or_else(|| AppError::NotFound("Vendor profile not found".into()))?;

        let dates: Vec<NaiveDate> = req.dates.iter()
            .filter_map(|d| d.parse::<NaiveDate>().ok())
            .collect();

        if dates.is_empty() {
            return Err(AppError::Validation("No valid dates provided (expected YYYY-MM-DD)".into()));
        }

        self.repo.set_availability(vendor.id, &dates, req.is_booked).await.map_err(AppError::Database)
    }

    // ── HIRE LIFECYCLE ────────────────────────────────────────────────────────

    pub async fn request_hire(&self, organizer_id: Uuid, req: HireRequest) -> Result<HireResponse> {
        // Verify vendor exists and is available
        let vendor = self.repo.get_by_id(req.vendor_id).await.map_err(AppError::Database)?
            .ok_or_else(|| AppError::NotFound("Vendor not found".into()))?;

        if !vendor.is_available {
            return Err(AppError::Validation("This vendor is currently unavailable".into()));
        }

        self.repo.create_hire(
            req.event_id,
            req.vendor_id,
            organizer_id,
            req.proposed_amount,
            vendor.commission_rate,
            req.message.as_deref(),
        ).await.map_err(AppError::Database)
    }

    pub async fn respond_hire(
        &self,
        vendor_user_id: Uuid,
        hire_id: Uuid,
        req: HireRespondRequest,
    ) -> Result<HireResponse> {
        // Verify this hire belongs to the responding vendor
        let hire = self.repo.get_hire(hire_id).await.map_err(AppError::Database)?
            .ok_or_else(|| AppError::NotFound("Hire request not found".into()))?;

        let vendor = self.repo.get_by_user_id(vendor_user_id).await.map_err(AppError::Database)?
            .ok_or_else(|| AppError::Unauthorized)?;

        if hire.vendor_id != vendor.id {
            return Err(AppError::Unauthorized);
        }

        if hire.status != "pending" {
            return Err(AppError::Validation("This hire request has already been responded to".into()));
        }

        let (new_status, agreed_amount, counter_amount) = if req.accept {
            ("accepted", hire.proposed_amount, None)
        } else if let Some(counter) = req.counter_amount {
            ("counter_offered", None, Some(counter))
        } else {
            ("declined", None, None)
        };

        self.repo.update_hire_status(hire_id, new_status, agreed_amount, counter_amount, None)
            .await.map_err(AppError::Database)
    }

    pub async fn complete_hire(
        &self,
        organizer_id: Uuid,
        hire_id: Uuid,
        req: CompleteHireRequest,
    ) -> Result<HireResponse> {
        let hire = self.repo.get_hire(hire_id).await.map_err(AppError::Database)?
            .ok_or_else(|| AppError::NotFound("Hire request not found".into()))?;

        if hire.organizer_id != organizer_id {
            return Err(AppError::Unauthorized);
        }

        if !["accepted", "counter_offered"].contains(&hire.status.as_str()) {
            return Err(AppError::Validation("Hire must be accepted before marking complete".into()));
        }

        // Calculate Bukr commission: commission_rate * agreed_amount
        let commission = req.agreed_amount * hire.commission_rate;

        let completed = self.repo.update_hire_status(
            hire_id,
            "completed",
            Some(req.agreed_amount),
            None,
            Some(commission),
        ).await.map_err(AppError::Database)?;

        // Record vendor commission in platform_revenue ledger (fire-and-forget)
        let _vendor = self.repo.get_by_id(hire.vendor_id).await.map_err(AppError::Database)?;
        let _ = sqlx::query(
            r#"INSERT INTO platform_revenue
               (source, reference_id, organizer_id, vendor_id, amount, currency, meta)
               VALUES ('vendor_commission', $1, $2, $3, $4, 'NGN', $5)"#,
        )
        .bind(hire_id)
        .bind(organizer_id)
        .bind(hire.vendor_id)
        .bind(commission)
        .bind(serde_json::json!({
            "agreed_amount": req.agreed_amount,
            "commission_rate": hire.commission_rate,
        }))
        .execute(self.repo.pool())
        .await;

        Ok(completed)
    }

    pub async fn get_my_hires_as_vendor(&self, user_id: Uuid) -> Result<Vec<HireResponse>> {
        let vendor = self.repo.get_by_user_id(user_id).await.map_err(AppError::Database)?
            .ok_or_else(|| AppError::NotFound("Vendor profile not found".into()))?;
        self.repo.get_vendor_hires(vendor.id).await.map_err(AppError::Database)
    }

    pub async fn get_my_hires_as_organizer(&self, organizer_id: Uuid) -> Result<Vec<HireResponse>> {
        self.repo.get_organizer_hires(organizer_id).await.map_err(AppError::Database)
    }

    // ── REVIEWS ───────────────────────────────────────────────────────────────

    pub async fn submit_review(&self, reviewer_id: Uuid, req: ReviewRequest) -> Result<ReviewResponse> {
        // Verify hire exists and belongs to reviewer
        let hire = self.repo.get_hire(req.hire_id).await.map_err(AppError::Database)?
            .ok_or_else(|| AppError::NotFound("Hire not found".into()))?;

        if hire.organizer_id != reviewer_id {
            return Err(AppError::Unauthorized);
        }

        if hire.status != "completed" {
            return Err(AppError::Validation("Reviews can only be submitted after the hire is marked complete".into()));
        }

        self.repo.create_review(
            hire.vendor_id,
            reviewer_id,
            req.hire_id,
            Some(hire.event_id),
            req.rating,
            req.review.as_deref(),
        ).await.map_err(AppError::Database)
    }

    pub async fn get_vendor_reviews(&self, vendor_id: Uuid) -> Result<Vec<ReviewResponse>> {
        self.repo.get_vendor_reviews(vendor_id).await.map_err(AppError::Database)
    }

    // ── INVITATIONS ───────────────────────────────────────────────────────────

    pub async fn send_invitation(
        &self,
        organizer_id: Uuid,
        req: InviteVendorRequest,
    ) -> Result<InviteResponse> {
        self.repo.create_invitation(organizer_id, req.event_id, &req.email)
            .await.map_err(AppError::Database)
    }

    pub async fn claim_invitation(&self, token: &str) -> Result<serde_json::Value> {
        let invite = self.repo.get_invitation_by_token(token).await.map_err(AppError::Database)?
            .ok_or_else(|| AppError::NotFound("Invitation not found or expired".into()))?;

        self.repo.claim_invitation(token).await.map_err(AppError::Database)?;
        Ok(invite)
    }

    // ── AI VENDOR MATCHMAKING ─────────────────────────────────────────────────
    //
    // Multi-factor scoring algorithm using a BinaryHeap for O(n log k) top-K selection.
    // Avoids sorting all n vendors; only maintains a min-heap of size k=5.
    //
    // Score breakdown (0–100):
    //   Category affinity    35 pts  — from compile-time affinity matrix
    //   Location match       25 pts  — graduated: city=1.0, same state=0.55, national=0.80
    //   Quality score        25 pts  — Bayesian rating (60%) + completion (25%) + response (15%)
    //   Tier bonus           10 pts  — pro=full, verified=partial, free=none
    //   Recency               5 pts  — penalise inactive vendors
    //   New vendor boost     +5 pts  — flat bonus for first 30 days (visibility seeding)

    pub async fn match_vendors_for_event(&self, event_id: Uuid) -> Result<Vec<VendorMatchResult>> {
        let event = self.repo.get_event_for_match(event_id).await.map_err(AppError::Database)?
            .ok_or_else(|| AppError::NotFound("Event not found or not active".into()))?;

        // Fetch all available vendors for this city on this date (hard filters applied in DB)
        let candidates = self.repo.get_candidates_for_match(event.date, &event.city)
            .await.map_err(AppError::Database)?;

        // Determine which vendor categories are relevant for this event type
        let relevant_categories = relevant_categories_for_event(&event.category);

        let mut results: Vec<VendorMatchResult> = Vec::new();

        for target_category in relevant_categories {
            // Filter candidates to this category
            let category_vendors: Vec<&VendorRow> = candidates.iter()
                .filter(|v| v.category.as_str() == *target_category)
                .collect();

            if category_vendors.is_empty() {
                continue;
            }

            const K: usize = 5;
            // Min-heap of size K using Reverse: the smallest score sits at the top.
            // When full, we only insert if new score > current minimum.
            // Score is stored as i64 (f64 * 1000) since f64 doesn't implement Ord.
            let mut heap: BinaryHeap<Reverse<(i64, Uuid)>> = BinaryHeap::new();

            // Also store full data for top vendors (keyed by UUID)
            let mut vendor_data: HashMap<Uuid, (&VendorRow, f64, Vec<String>)> = HashMap::new();

            for vendor in &category_vendors {
                let affinity = category_affinity(&event.category, &vendor.category);
                if affinity < 0.30 {
                    continue; // Prune irrelevant vendor categories early
                }

                let loc     = location_score(vendor, &event.city);
                let quality = quality_score(
                    vendor.bayesian_rating.to_string().parse::<f64>().unwrap_or(0.0),
                    vendor.completion_rate.to_string().parse::<f64>().unwrap_or(1.0),
                    vendor.response_rate.to_string().parse::<f64>().unwrap_or(1.0),
                );
                let tier    = tier_bonus(&vendor.tier);
                let recency = recency_score(&vendor.last_active_at);
                let new_boost = new_vendor_bonus(&vendor.created_at);

                // Composite score on 0–100 scale
                let score: f64 = (
                    affinity  * 35.0
                  + loc       * 25.0
                  + quality   * 25.0
                  + tier      * 10.0
                  + recency   *  5.0
                  + new_boost
                ).min(100.0);

                let score_key = (score * 1000.0) as i64; // integer for Ord

                // Build human-readable match reasons
                let mut reasons: Vec<String> = Vec::new();
                if loc >= 0.95       { reasons.push("City match".to_string()); }
                else if loc >= 0.5   { reasons.push("Nearby city".to_string()); }
                if vendor.is_verified { reasons.push("Bukr Verified".to_string()); }
                if vendor.tier == "pro" { reasons.push("Pro Vendor".to_string()); }
                if quality >= 0.8    { reasons.push("Highly rated".to_string()); }
                if vendor.completion_rate >= Decimal::new(9, 1) {
                    reasons.push("High reliability".to_string());
                }
                if new_boost > 0.0   { reasons.push("New to Bukr".to_string()); }

                vendor_data.insert(vendor.id, (vendor, score, reasons));

                // Min-heap maintenance: O(log k) per insertion
                if heap.len() < K {
                    heap.push(Reverse((score_key, vendor.id)));
                } else if let Some(&Reverse((min_key, _))) = heap.peek() {
                    if score_key > min_key {
                        heap.pop();
                        heap.push(Reverse((score_key, vendor.id)));
                    }
                }
            }

            // Drain heap in descending score order
            let mut top_ids: Vec<(i64, Uuid)> = heap.into_iter().map(|Reverse(x)| x).collect();
            top_ids.sort_by(|a, b| b.0.cmp(&a.0)); // highest score first

            let scored_vendors: Vec<ScoredVendor> = top_ids.into_iter()
                .filter_map(|(_, id)| vendor_data.remove(&id))
                .map(|(row, score, reasons)| ScoredVendor {
                    vendor:        VendorResponse::from(row.clone()),
                    score,
                    match_reasons: reasons,
                })
                .collect();

            results.push(VendorMatchResult {
                category: target_category.to_string(),
                vendors:  scored_vendors,
            });
        }

        Ok(results)
    }
}

// ── SCORING HELPERS ───────────────────────────────────────────────────────────

/// Category affinity matrix: how relevant is a vendor category for a given event type?
/// Returns a weight 0.0–1.0. Below 0.30 is pruned from results.
fn category_affinity(event_category: &str, vendor_category: &str) -> f64 {
    match (event_category, vendor_category) {
        ("Concert",    "DJ")           => 1.00,
        ("Concert",    "AV_Tech")      => 0.95,
        ("Concert",    "Security")     => 0.90,
        ("Concert",    "Photography")  => 0.80,
        ("Concert",    "Videography")  => 0.78,
        ("Concert",    "Ushers")       => 0.70,
        ("Concert",    "Catering")     => 0.50,
        ("Concert",    "MC")           => 0.65,

        ("Wedding",    "Catering")     => 1.00,
        ("Wedding",    "Photography")  => 1.00,
        ("Wedding",    "Videography")  => 0.98,
        ("Wedding",    "Decoration")   => 0.95,
        ("Wedding",    "Makeup")       => 0.92,
        ("Wedding",    "MC")           => 0.88,
        ("Wedding",    "Ushers")       => 0.75,
        ("Wedding",    "DJ")           => 0.72,
        ("Wedding",    "Security")     => 0.55,

        ("Conference", "AV_Tech")      => 1.00,
        ("Conference", "Catering")     => 0.90,
        ("Conference", "Ushers")       => 0.80,
        ("Conference", "Security")     => 0.75,
        ("Conference", "Photography")  => 0.65,
        ("Conference", "Videography")  => 0.60,

        ("Party",      "DJ")           => 1.00,
        ("Party",      "Catering")     => 0.90,
        ("Party",      "Decoration")   => 0.85,
        ("Party",      "Photography")  => 0.75,
        ("Party",      "MC")           => 0.70,
        ("Party",      "Security")     => 0.65,
        ("Party",      "Makeup")       => 0.55,

        ("Festival",   "DJ")           => 0.95,
        ("Festival",   "Security")     => 1.00,
        ("Festival",   "Catering")     => 0.90,
        ("Festival",   "AV_Tech")      => 0.88,
        ("Festival",   "Photography")  => 0.80,
        ("Festival",   "Ushers")       => 0.75,

        ("Corporate",  "Catering")     => 1.00,
        ("Corporate",  "AV_Tech")      => 0.95,
        ("Corporate",  "Photography")  => 0.80,
        ("Corporate",  "Ushers")       => 0.85,
        ("Corporate",  "Security")     => 0.70,

        // Fallback: any vendor for any event (low relevance)
        _                              => 0.20,
    }
}

/// Location score: graduated match (not binary) for fairness.
/// City match = 1.0; serves_nationwide = 0.80; same state = 0.55; elsewhere = 0.10.
fn location_score(vendor: &VendorRow, event_city: &str) -> f64 {
    if vendor.serves_nationwide {
        return 0.80; // National vendors are good but local is preferred
    }
    let v_city = vendor.city.to_lowercase();
    let e_city = event_city.to_lowercase();

    if v_city == e_city {
        1.00
    } else if same_state_heuristic(&v_city, &e_city) {
        0.55
    } else {
        0.10
    }
}

/// Rough same-state heuristic for Nigerian cities.
/// Groups known city pairs by proximity — not exhaustive but covers major markets.
fn same_state_heuristic(city_a: &str, city_b: &str) -> bool {
    let lagos_cluster     = ["lagos", "ikeja", "lekki", "victoria island", "ikorodu", "epe"];
    let abuja_cluster     = ["abuja", "gwagwalada", "kuje", "bwari", "abaji"];
    let ph_cluster        = ["port harcourt", "bonny", "obio", "okrika"];
    let ibadan_cluster    = ["ibadan", "ogbomosho", "oyo", "iseyin"];
    let kano_cluster      = ["kano", "wudil", "gwarzo", "bebeji"];
    let enugu_cluster     = ["enugu", "nsukka", "agbani", "oji river"];

    let clusters: &[&[&str]] = &[
        &lagos_cluster, &abuja_cluster, &ph_cluster,
        &ibadan_cluster, &kano_cluster, &enugu_cluster,
    ];

    for cluster in clusters {
        let a_in = cluster.iter().any(|c| city_a.contains(c));
        let b_in = cluster.iter().any(|c| city_b.contains(c));
        if a_in && b_in {
            return true;
        }
    }
    false
}

/// Quality score combining Bayesian rating (most weight), completion rate, and response rate.
fn quality_score(bayesian_rating: f64, completion_rate: f64, response_rate: f64) -> f64 {
    let rating_component     = (bayesian_rating / 5.0).clamp(0.0, 1.0);
    let completion_component = completion_rate.clamp(0.0, 1.0);
    let response_component   = response_rate.clamp(0.0, 1.0);
    // Rating is the primary signal; completion and response add reliability confidence
    (rating_component * 0.60) + (completion_component * 0.25) + (response_component * 0.15)
}

/// Tier bonus: normalised 0.0–0.15 (multiplied by 10 in composite = up to 1.5 pts).
fn tier_bonus(tier: &str) -> f64 {
    match tier {
        "pro"      => 0.15,
        "verified" => 0.08,
        _          => 0.00,
    }
}

/// Recency score: penalise vendors who haven't been active recently.
/// Active in last 7d → 1.0; 30d → 0.80; 90d → 0.50; older → 0.20.
fn recency_score(last_active_at: &chrono::DateTime<chrono::Utc>) -> f64 {
    let days = (Utc::now() - *last_active_at).num_days();
    if days <= 7        { 1.00 }
    else if days <= 30  { 0.80 }
    else if days <= 90  { 0.50 }
    else                { 0.20 }
}

/// New vendor boost: flat +5 points for first 30 days to seed marketplace visibility.
fn new_vendor_bonus(created_at: &chrono::DateTime<chrono::Utc>) -> f64 {
    if (Utc::now() - *created_at).num_days() <= 30 { 5.0 } else { 0.0 }
}

/// Return the vendor categories that make sense for a given event type.
/// Used to group matchmaking results by category.
fn relevant_categories_for_event(event_category: &str) -> &'static [&'static str] {
    match event_category {
        "Concert"    => &["DJ", "AV_Tech", "Security", "Photography", "Ushers"],
        "Wedding"    => &["Catering", "Photography", "Videography", "Decoration", "Makeup", "MC"],
        "Conference" => &["AV_Tech", "Catering", "Ushers", "Security", "Photography"],
        "Party"      => &["DJ", "Catering", "Decoration", "Photography", "MC"],
        "Festival"   => &["Security", "Catering", "DJ", "AV_Tech", "Photography"],
        "Corporate"  => &["Catering", "AV_Tech", "Ushers", "Photography", "Security"],
        _            => &["Catering", "Photography", "Security", "AV_Tech"],
    }
}

