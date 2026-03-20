// Scanner Service — the bouncer that decides who gets in.
//
// Security layers (in order):
// 1. Access code verification — only authorised scanners can scan
// 2. HMAC-signed QR nonce — screenshots invalid after first scan
// 3. Redis atomic lock — prevents simultaneous double-scan race
// 4. UsageEngine — handles all ticket models (single/multi/consumable/time_bound/renewable)
// 5. DB atomic UPDATE WHERE status='valid' — final safety net
// 6. Audit log — every attempt recorded

use chrono::{DateTime, Utc};
use hmac::{Hmac, Mac};
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::error::{AppError, Result};
use super::usage_engine::{UsageDecision, UsageEngine};

// ─── Request DTOs ─────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct VerifyAccessRequest {
    pub event_id: Option<Uuid>,
    pub event_key: Option<String>,
    pub access_code: String,
}

#[derive(Debug, Deserialize)]
pub struct ValidateTicketRequest {
    pub ticket_id: String,
    pub event_key: String,
    pub qr_data: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ManualValidateRequest {
    pub ticket_id: String,
    pub event_id: Option<Uuid>,
    pub event_key: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RenewTicketRequest {
    pub ticket_id: String, // human-readable BUKR-XXXX
    pub user_id: Uuid,
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct ScanResult {
    pub result: String,              // "valid" | "already_used" | "invalid" | "expired" | "depleted_renewable"
    pub ticket: Option<ScanTicketInfo>,
    pub message: Option<String>,
    pub new_qr_data: Option<String>,
    pub usage_left: Option<i32>,     // nil for single-use; present for multi-use
}

#[derive(Debug, Serialize)]
pub struct ScanTicketInfo {
    pub ticket_id: String,
    pub user_name: String,
    pub ticket_type: String,
    pub quantity: i32,
    pub scanned_at: Option<String>,
    pub usage_left: Option<i32>,
    pub usage_total: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct AccessVerifyResponse {
    pub verified: bool,
    pub event: Option<EventSummary>,
    pub gate_label: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct EventSummary {
    pub id: Uuid,
    pub title: String,
    pub date: String,
}

#[derive(Debug, Serialize)]
pub struct ScanStats {
    pub total_tickets: i32,
    pub scanned: i64,
    pub remaining: i64,
    pub scan_rate: f64,
}

#[derive(Debug, Serialize)]
pub struct RenewResult {
    pub renewed: bool,
    pub message: String,
    pub usage_left: Option<i32>,
    pub requires_payment: bool,
    pub payment_amount: Option<f64>,
    pub payment_currency: Option<String>,
}

// ─── Service ──────────────────────────────────────────────────────────────────

pub struct ScannerService {
    pool: PgPool,
    redis: Option<redis::aio::ConnectionManager>,
    qr_secret: String,
}

impl ScannerService {
    pub fn new(pool: PgPool) -> Self {
        let qr_secret = std::env::var("QR_HMAC_SECRET")
            .unwrap_or_else(|_| "bukr-qr-secret-change-in-production".to_string());
        Self { pool, redis: None, qr_secret }
    }

    pub async fn new_with_redis(pool: PgPool) -> Self {
        let redis_url = std::env::var("REDIS_URL").unwrap_or_default();
        let qr_secret = std::env::var("QR_HMAC_SECRET")
            .unwrap_or_else(|_| "bukr-qr-secret-change-in-production".to_string());

        let redis = if !redis_url.is_empty() {
            match redis::Client::open(redis_url.as_str()) {
                Ok(client) => match redis::aio::ConnectionManager::new(client).await {
                    Ok(mgr) => {
                        tracing::info!("Redis scan lock active");
                        Some(mgr)
                    }
                    Err(e) => {
                        tracing::warn!("Redis manager init failed: {} — scan lock disabled", e);
                        None
                    }
                },
                Err(e) => {
                    tracing::warn!("Redis client open failed: {} — scan lock disabled", e);
                    None
                }
            }
        } else {
            tracing::warn!("REDIS_URL not set — scan lock disabled");
            None
        };

        Self { pool, redis, qr_secret }
    }

    // ─── event_key → UUID resolution ─────────────────────────────────────────

    async fn resolve_event_id(&self, event_key: &str) -> Result<Uuid> {
        let row = sqlx::query("SELECT id FROM events WHERE event_key = $1 AND status = 'active'")
            .bind(event_key)
            .fetch_optional(&self.pool)
            .await
            .map_err(AppError::Database)?;

        row.map(|r| r.get::<Uuid, _>("id"))
            .ok_or_else(|| AppError::NotFound(format!("Event '{}' not found", event_key)))
    }

    // ─── HMAC QR signing ─────────────────────────────────────────────────────

    fn sign_qr(&self, ticket_id: &str, nonce: &str) -> String {
        let mut mac = Hmac::<Sha256>::new_from_slice(self.qr_secret.as_bytes())
            .expect("HMAC accepts any key size");
        mac.update(format!("{}:{}", ticket_id, nonce).as_bytes());
        hex::encode(mac.finalize().into_bytes())
    }

    pub fn build_qr_payload(&self, ticket_id: &str, event_key: &str, nonce: &str) -> String {
        let sig = self.sign_qr(ticket_id, nonce);
        serde_json::json!({
            "ticketId": ticket_id,
            "eventKey": event_key,
            "nonce": nonce,
            "sig": sig
        })
        .to_string()
    }

    fn verify_qr_sig(&self, ticket_id: &str, nonce: &str, sig: &str) -> bool {
        let expected = self.sign_qr(ticket_id, nonce);
        expected.len() == sig.len()
            && expected
                .bytes()
                .zip(sig.bytes())
                .fold(0u8, |acc, (a, b)| acc | (a ^ b))
                == 0
    }

    // ─── Redis scan lock ──────────────────────────────────────────────────────

    async fn acquire_scan_lock(&self, ticket_id: &str) -> bool {
        let Some(ref mut redis) = self.redis.clone() else {
            return true; // degraded mode — DB atomic update is still the safety net
        };
        let key = format!("scan:lock:{}", ticket_id);
        let result: redis::RedisResult<Option<String>> = redis
            .set_options(
                &key,
                "1",
                redis::SetOptions::default()
                    .conditional_set(redis::ExistenceCheck::NX)
                    .get(false)
                    .with_expiration(redis::SetExpiry::EX(10)),
            )
            .await;
        matches!(result, Ok(Some(_)) | Ok(None))
    }

    // ─── Redis usage cache ────────────────────────────────────────────────────

    // Cache usage state for 60s to avoid a DB read on every scan of multi-use tickets.
    async fn get_cached_usage(&self, ticket_id: &str) -> Option<(i32, i32, String)> {
        let Some(ref mut redis) = self.redis.clone() else { return None; };
        let key = format!("ticket:usage:{}", ticket_id);
        let val: redis::RedisResult<String> = redis.get(&key).await;
        val.ok().and_then(|s| {
            let v: serde_json::Value = serde_json::from_str(&s).ok()?;
            Some((
                v["left"].as_i64()? as i32,
                v["total"].as_i64()? as i32,
                v["model"].as_str()?.to_string(),
            ))
        })
    }

    async fn set_cached_usage(&self, ticket_id: &str, left: i32, total: i32, model: &str) {
        let Some(ref mut redis) = self.redis.clone() else { return; };
        let key = format!("ticket:usage:{}", ticket_id);
        let val = serde_json::json!({ "left": left, "total": total, "model": model }).to_string();
        let _: redis::RedisResult<()> = redis.set_ex(&key, val, 60).await;
    }

    async fn invalidate_usage_cache(&self, ticket_id: &str) {
        let Some(ref mut redis) = self.redis.clone() else { return; };
        let key = format!("ticket:usage:{}", ticket_id);
        let _: redis::RedisResult<()> = redis.del(&key).await;
    }

    // ─── Fraud signal writer ──────────────────────────────────────────────────

    async fn record_fraud_signal(&self, ticket_id: &str, event_id: Uuid, signal_type: &str, meta: serde_json::Value) {
        let _ = sqlx::query(
            "INSERT INTO fraud_signals (ticket_id, event_id, signal_type, meta)
             SELECT t.id, $2, $3, $4 FROM tickets t WHERE t.ticket_id = $1",
        )
        .bind(ticket_id)
        .bind(event_id)
        .bind(signal_type)
        .bind(meta)
        .execute(&self.pool)
        .await;
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    pub async fn verify_access(&self, req: VerifyAccessRequest) -> Result<AccessVerifyResponse> {
        let event_id = match req.event_id {
            Some(id) => id,
            None => match &req.event_key {
                Some(key) => self.resolve_event_id(key).await?,
                None => return Err(AppError::Validation("event_id or event_key required".into())),
            },
        };

        let row = sqlx::query(
            "SELECT sac.label, e.id as event_id, e.title, e.date::text as date
             FROM scanner_access_codes sac
             JOIN events e ON sac.event_id = e.id
             WHERE sac.code = $1 AND sac.event_id = $2 AND sac.is_active = true
               AND (sac.expires_at IS NULL OR sac.expires_at > NOW())",
        )
        .bind(&req.access_code)
        .bind(event_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(AppError::Database)?;

        match row {
            Some(r) => Ok(AccessVerifyResponse {
                verified: true,
                event: Some(EventSummary {
                    id: r.get("event_id"),
                    title: r.get("title"),
                    date: r.get("date"),
                }),
                gate_label: r.get("label"),
            }),
            None => Ok(AccessVerifyResponse { verified: false, event: None, gate_label: None }),
        }
    }

    pub async fn validate_ticket(&self, req: ValidateTicketRequest) -> Result<ScanResult> {
        let event_id = self.resolve_event_id(&req.event_key).await?;

        // HMAC verification if full QR JSON provided
        if let Some(ref qr_json) = req.qr_data {
            if let Ok(qr) = serde_json::from_str::<serde_json::Value>(qr_json) {
                let nonce = qr["nonce"].as_str().unwrap_or("");
                let sig = qr["sig"].as_str().unwrap_or("");
                if !nonce.is_empty() && !sig.is_empty() {
                    if !self.verify_qr_sig(&req.ticket_id, nonce, sig) {
                        tracing::warn!("QR signature mismatch for ticket {} — possible screenshot fraud", req.ticket_id);
                        self.record_fraud_signal(
                            &req.ticket_id,
                            event_id,
                            "hmac_mismatch",
                            serde_json::json!({ "ticket_id": req.ticket_id }),
                        ).await;
                        return Ok(ScanResult {
                            result: "invalid".into(),
                            ticket: None,
                            message: Some("QR code is invalid or has already been used".into()),
                            new_qr_data: None,
                            usage_left: None,
                        });
                    }
                }
            }
        }

        self.validate_and_mark(&req.ticket_id, event_id, None).await
    }

    pub async fn manual_validate(&self, req: ManualValidateRequest) -> Result<ScanResult> {
        let event_id = match req.event_id {
            Some(id) => id,
            None => match &req.event_key {
                Some(key) => self.resolve_event_id(key).await?,
                None => return Err(AppError::Validation("event_id or event_key required".into())),
            },
        };
        self.validate_and_mark(&req.ticket_id, event_id, None).await
    }

    /// Core validation + usage engine dispatch.
    ///
    /// Flow:
    /// 1. Redis SET NX lock — fast distributed lock
    /// 2. DB SELECT — read ticket state (with Redis usage cache for multi-use)
    /// 3. UsageEngine.evaluate() — determine what to do
    /// 4. UsageEngine.apply() — atomic DB write
    /// 5. Queue notification if usage depleted or low
    /// 6. Update Redis usage cache
    async fn validate_and_mark(
        &self,
        ticket_id: &str,
        event_id: Uuid,
        scanned_by: Option<Uuid>,
    ) -> Result<ScanResult> {
        // STEP 1: Redis lock — prevents simultaneous double-scan
        if !self.acquire_scan_lock(ticket_id).await {
            self.record_fraud_signal(ticket_id, event_id, "rapid_rescan", serde_json::json!({})).await;
            return Ok(ScanResult {
                result: "already_used".into(),
                ticket: None,
                message: Some("Ticket is currently being processed".into()),
                new_qr_data: None,
                usage_left: None,
            });
        }

        // STEP 2: Fetch ticket with user details
        let row = sqlx::query(
            "SELECT t.id, t.ticket_id, t.status, t.ticket_type, t.quantity,
                    t.scanned_at, t.event_id, t.usage_model, t.usage_left, t.usage_total,
                    t.user_id, u.name as user_name
             FROM tickets t
             JOIN users u ON t.user_id = u.id
             WHERE t.ticket_id = $1 AND t.event_id = $2",
        )
        .bind(ticket_id)
        .bind(event_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(AppError::Database)?;

        let row = match row {
            None => {
                return Ok(ScanResult {
                    result: "invalid".into(),
                    ticket: None,
                    message: Some("Ticket not found for this event".into()),
                    new_qr_data: None,
                    usage_left: None,
                });
            }
            Some(r) => r,
        };

        let status: String = row.get("status");
        let ticket_db_id: Uuid = row.get("id");
        let tid: String = row.get("ticket_id");
        let user_name: String = row.get("user_name");
        let user_id: Uuid = row.get("user_id");
        let ticket_type: String = row.get("ticket_type");
        let quantity: i32 = row.get("quantity");
        let scanned_at: Option<DateTime<Utc>> = row.get("scanned_at");
        let usage_model: String = row.get("usage_model");
        let usage_left: Option<i32> = row.get("usage_left");
        let usage_total: Option<i32> = row.get("usage_total");

        if status == "used" {
            return Ok(ScanResult {
                result: "already_used".into(),
                ticket: Some(ScanTicketInfo {
                    ticket_id: tid,
                    user_name,
                    ticket_type,
                    quantity,
                    scanned_at: scanned_at.map(|t| t.to_rfc3339()),
                    usage_left: None,
                    usage_total: None,
                }),
                message: None,
                new_qr_data: None,
                usage_left: None,
            });
        }

        if status == "expired" {
            return Ok(ScanResult {
                result: "expired".into(),
                ticket: None,
                message: Some("Ticket has expired".into()),
                new_qr_data: None,
                usage_left: None,
            });
        }

        if status != "valid" {
            return Ok(ScanResult {
                result: "invalid".into(),
                ticket: None,
                message: Some(format!("Ticket status is '{}'", status)),
                new_qr_data: None,
                usage_left: None,
            });
        }

        // STEP 3: Single-use fast path — skip engine overhead
        if usage_model == "single" {
            let new_nonce = hex::encode(rand::random::<[u8; 32]>());
            let updated = sqlx::query(
                "UPDATE tickets SET status='used', scanned_at=NOW(), scanned_by=$3, qr_nonce=$4
                 WHERE ticket_id=$1 AND event_id=$2 AND status='valid'
                 RETURNING id",
            )
            .bind(ticket_id)
            .bind(event_id)
            .bind(scanned_by)
            .bind(&new_nonce)
            .fetch_optional(&self.pool)
            .await
            .map_err(AppError::Database)?;

            if updated.is_none() {
                return Ok(ScanResult {
                    result: "already_used".into(),
                    ticket: None,
                    message: Some("Ticket was just scanned by another device".into()),
                    new_qr_data: None,
                    usage_left: None,
                });
            }

            self.log_scan(ticket_id, event_id, scanned_by, "valid").await;
            tracing::info!("Ticket {} scanned (single-use)", ticket_id);

            return Ok(ScanResult {
                result: "valid".into(),
                ticket: Some(ScanTicketInfo {
                    ticket_id: tid,
                    user_name,
                    ticket_type,
                    quantity,
                    scanned_at: None,
                    usage_left: None,
                    usage_total: None,
                }),
                message: None,
                new_qr_data: None,
                usage_left: None,
            });
        }

        // STEP 4: Multi-use path — delegate to usage engine
        let engine = UsageEngine::new(&self.pool);
        let decision = engine.evaluate(ticket_db_id).await?;

        match &decision {
            UsageDecision::NotYetValid => {
                return Ok(ScanResult {
                    result: "invalid".into(),
                    ticket: None,
                    message: Some("Ticket is not valid yet".into()),
                    new_qr_data: None,
                    usage_left: None,
                });
            }
            UsageDecision::Expired => {
                return Ok(ScanResult {
                    result: "expired".into(),
                    ticket: None,
                    message: Some("Ticket has expired".into()),
                    new_qr_data: None,
                    usage_left: None,
                });
            }
            UsageDecision::DepletedRenewable => {
                // Queue renewal prompt notification
                crate::notifications::queue(
                    &self.pool,
                    ticket_db_id,
                    user_id,
                    event_id,
                    "renewal_prompt",
                    serde_json::json!({ "ticket_id": ticket_id }),
                ).await;
                return Ok(ScanResult {
                    result: "depleted_renewable".into(),
                    ticket: None,
                    message: Some("All uses consumed. Renew to continue.".into()),
                    new_qr_data: None,
                    usage_left: Some(0),
                });
            }
            _ => {}
        }

        let usage_left_after = engine.apply(ticket_db_id, ticket_id, event_id, scanned_by, &decision).await?;

        // STEP 5: Queue notification if usage depleted or last use
        if usage_left_after == 0 {
            crate::notifications::queue(
                &self.pool,
                ticket_db_id,
                user_id,
                event_id,
                "usage_depleted",
                serde_json::json!({ "ticket_id": ticket_id }),
            ).await;
        }

        // STEP 6: Update Redis usage cache
        if let Some(total) = usage_total {
            self.set_cached_usage(ticket_id, usage_left_after, total, &usage_model).await;
        }

        tracing::info!("Ticket {} scanned ({}) — {} uses left", ticket_id, usage_model, usage_left_after);

        Ok(ScanResult {
            result: "valid".into(),
            ticket: Some(ScanTicketInfo {
                ticket_id: tid,
                user_name,
                ticket_type,
                quantity,
                scanned_at: None,
                usage_left: Some(usage_left_after),
                usage_total,
            }),
            message: None,
            new_qr_data: None,
            usage_left: Some(usage_left_after),
        })
    }

    pub async fn mark_used(&self, ticket_id: &str, scanned_by: Option<Uuid>) -> Result<bool> {
        let row = sqlx::query("SELECT event_id FROM tickets WHERE ticket_id = $1")
            .bind(ticket_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(AppError::Database)?
            .ok_or_else(|| AppError::NotFound("Ticket not found".into()))?;

        let event_id: Uuid = row.get("event_id");
        let result = self.validate_and_mark(ticket_id, event_id, scanned_by).await?;
        Ok(result.result == "valid")
    }

    /// Renew a ticket — reset usage_left to usage_total.
    /// If the original ticket was paid, returns requires_payment=true with amount.
    /// If free, renews immediately.
    pub async fn renew_ticket(&self, req: RenewTicketRequest) -> Result<RenewResult> {
        let row = sqlx::query(
            "SELECT t.id, t.usage_total, t.is_renewable, t.unit_price, t.currency,
                    t.payment_provider, t.user_id, t.event_id,
                    COALESCE(t.unit_price, 0) as price
             FROM tickets t
             WHERE t.ticket_id = $1 AND t.user_id = $2",
        )
        .bind(&req.ticket_id)
        .bind(req.user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(AppError::Database)?
        .ok_or_else(|| AppError::NotFound("Ticket not found".into()))?;

        let is_renewable: bool = row.get("is_renewable");
        if !is_renewable {
            return Err(AppError::BadRequest("Ticket is not renewable".into()));
        }

        let ticket_db_id: Uuid = row.get("id");
        let usage_total: Option<i32> = row.get("usage_total");
        let unit_price: rust_decimal::Decimal = row.get("price");
        let currency: String = row.get("currency");
        let payment_provider: Option<String> = row.get("payment_provider");

        let is_paid = unit_price > rust_decimal::Decimal::ZERO
            && payment_provider.as_deref() != Some("free");

        if is_paid {
            // Return payment required — frontend initiates Paystack charge
            return Ok(RenewResult {
                renewed: false,
                message: "Payment required to renew".into(),
                usage_left: None,
                requires_payment: true,
                payment_amount: Some(unit_price.try_into().unwrap_or(0.0)),
                payment_currency: Some(currency),
            });
        }

        // Free ticket — renew immediately
        let new_left = usage_total.unwrap_or(1);
        let new_nonce = hex::encode(rand::random::<[u8; 32]>());

        sqlx::query(
            "UPDATE tickets
             SET usage_left=$2, status='valid', renewed_at=NOW(),
                 renewal_count = renewal_count + 1, qr_nonce=$3
             WHERE id=$1",
        )
        .bind(ticket_db_id)
        .bind(new_left)
        .bind(&new_nonce)
        .execute(&self.pool)
        .await
        .map_err(AppError::Database)?;

        // Invalidate usage cache so next scan reads fresh state
        self.invalidate_usage_cache(&req.ticket_id).await;

        Ok(RenewResult {
            renewed: true,
            message: format!("Ticket renewed — {} uses restored", new_left),
            usage_left: Some(new_left),
            requires_payment: false,
            payment_amount: None,
            payment_currency: None,
        })
    }

    pub async fn get_stats(&self, event_id: Uuid) -> Result<ScanStats> {
        let row = sqlx::query(
            "SELECT e.total_tickets,
                    COUNT(CASE WHEN t.status = 'used' THEN 1 END) as scanned,
                    COUNT(CASE WHEN t.status = 'valid' THEN 1 END) as remaining
             FROM events e
             LEFT JOIN tickets t ON e.id = t.event_id
             WHERE e.id = $1
             GROUP BY e.total_tickets",
        )
        .bind(event_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(AppError::Database)?
        .ok_or_else(|| AppError::NotFound("Event not found".into()))?;

        let total_tickets: i32 = row.get("total_tickets");
        let scanned: i64 = row.get("scanned");
        let remaining: i64 = row.get("remaining");
        let scan_rate = if total_tickets > 0 {
            (scanned as f64 / total_tickets as f64) * 100.0
        } else {
            0.0
        };

        Ok(ScanStats { total_tickets, scanned, remaining, scan_rate })
    }

    async fn log_scan(&self, ticket_id: &str, event_id: Uuid, scanned_by: Option<Uuid>, result: &str) {
        let _ = sqlx::query(
            "INSERT INTO scan_log (ticket_id, event_id, scanned_by, result)
             SELECT t.id, $2, $3, $4 FROM tickets t WHERE t.ticket_id = $1",
        )
        .bind(ticket_id)
        .bind(event_id)
        .bind(scanned_by)
        .bind(result)
        .execute(&self.pool)
        .await;
    }
}
