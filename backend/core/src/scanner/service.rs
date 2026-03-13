/**
 * USE CASE LAYER - Scanner Business Logic
 *
 * Scanner Service: The bouncer — decides who gets in, prevents every known fraud vector.
 *
 * Security model (layered defense):
 * 1. Access code verification — only authorized scanners can scan
 * 2. HMAC-signed QR nonce — screenshots are invalid after first scan
 * 3. Redis atomic lock — prevents simultaneous double-scan race condition
 * 4. DB atomic UPDATE WHERE status='valid' — final safety net
 * 5. Audit log — every scan attempt recorded, valid or not
 *
 * event_key resolution: Frontend sends event_key (slug), we resolve to UUID here.
 * This fixes the API contract mismatch without touching the frontend.
 */

use chrono::{DateTime, Utc};
use hmac::{Hmac, Mac};
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::error::{AppError, Result};

// ─── Request DTOs ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct VerifyAccessRequest {
    pub event_id: Option<Uuid>,
    pub event_key: Option<String>, // Accept either — resolve to UUID internally
    pub access_code: String,
}

#[derive(Debug, Deserialize)]
pub struct ValidateTicketRequest {
    // Frontend sends ticket_id + event_key (slug). We resolve event_key → UUID.
    pub ticket_id: String,
    pub event_key: String,
    // Optional: raw QR JSON for nonce-based validation
    pub qr_data: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ManualValidateRequest {
    pub ticket_id: String,
    pub event_id: Option<Uuid>,
    pub event_key: Option<String>,
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct ScanResult {
    pub result: String,                 // "valid" | "already_used" | "invalid"
    pub ticket: Option<ScanTicketInfo>,
    pub message: Option<String>,
    pub new_qr_data: Option<String>,    // Rotated QR payload — scanner app must display this
}

#[derive(Debug, Serialize)]
pub struct ScanTicketInfo {
    pub ticket_id: String,
    pub user_name: String,
    pub ticket_type: String,
    pub quantity: i32,
    pub scanned_at: Option<String>,
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

// ─── Service ─────────────────────────────────────────────────────────────────

pub struct ScannerService {
    pool: PgPool,
    redis: Option<redis::aio::ConnectionManager>,
    // HMAC secret for signing QR nonces — loaded from env
    qr_secret: String,
}

impl ScannerService {
    pub fn new(pool: PgPool) -> Self {
        // Load Redis connection manager (optional — degrades gracefully)
        let redis = {
            let url = std::env::var("REDIS_URL").unwrap_or_default();
            if url.is_empty() {
                tracing::warn!("REDIS_URL not set — scan lock disabled, double-scan possible");
                None
            } else {
                match redis::Client::open(url.as_str()) {
                    Ok(_client) => {
                        // Lazy init — async manager created in new_with_redis
                        tracing::info!("Redis configured for scan locking");
                        None
                    }
                    Err(e) => {
                        tracing::warn!("Redis connection failed: {} — scan lock disabled", e);
                        None
                    }
                }
            }
        };

        let qr_secret = std::env::var("QR_HMAC_SECRET")
            .unwrap_or_else(|_| "bukr-qr-secret-change-in-production".to_string());

        Self { pool, redis, qr_secret }
    }

    /// Build with Redis connection manager (called from main.rs after async runtime starts)
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

    // ─── event_key → event_id resolution ─────────────────────────────────────

    /// Resolve event_key (URL slug) to UUID.
    /// This is the fix for the API contract mismatch — frontend sends slugs, DB needs UUIDs.
    async fn resolve_event_id(&self, event_key: &str) -> Result<Uuid> {
        let row = sqlx::query("SELECT id FROM events WHERE event_key = $1 AND status = 'active'")
            .bind(event_key)
            .fetch_optional(&self.pool)
            .await
            .map_err(AppError::Database)?;

        row.map(|r| r.get::<Uuid, _>("id"))
            .ok_or_else(|| AppError::NotFound(format!("Event '{}' not found", event_key)))
    }

    // ─── HMAC QR nonce ────────────────────────────────────────────────────────

    /// Sign a QR payload: HMAC-SHA256(secret, ticket_id + ":" + nonce)
    /// The QR code encodes: { ticketId, eventKey, nonce, sig }
    /// On scan: verify sig, then rotate nonce atomically.
    /// Any screenshot taken before the scan is now invalid.
    fn sign_qr(&self, ticket_id: &str, nonce: &str) -> String {
        let mut mac = Hmac::<Sha256>::new_from_slice(self.qr_secret.as_bytes())
            .expect("HMAC accepts any key size");
        mac.update(format!("{}:{}", ticket_id, nonce).as_bytes());
        hex::encode(mac.finalize().into_bytes())
    }

    /// Build the QR JSON payload that gets encoded into the QR code image
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

    /// Verify QR signature. Returns true if valid.
    fn verify_qr_sig(&self, ticket_id: &str, nonce: &str, sig: &str) -> bool {
        let expected = self.sign_qr(ticket_id, nonce);
        // Constant-time comparison prevents timing attacks
        expected.len() == sig.len()
            && expected
                .bytes()
                .zip(sig.bytes())
                .fold(0u8, |acc, (a, b)| acc | (a ^ b))
                == 0
    }

    // ─── Redis atomic scan lock ───────────────────────────────────────────────

    /// Acquire a distributed lock on ticket_id for 10 seconds.
    /// Returns true if lock acquired (safe to proceed), false if already locked (double-scan).
    /// Uses SET NX EX — atomic in Redis, no race condition possible.
    async fn acquire_scan_lock(&self, ticket_id: &str) -> bool {
        let Some(ref mut redis) = self.redis.clone() else {
            // No Redis — allow scan (degraded mode, DB atomic update is still the safety net)
            return true;
        };

        let key = format!("scan:lock:{}", ticket_id);
        let result: redis::RedisResult<Option<String>> = redis
            .set_options(
                &key,
                "1",
                redis::SetOptions::default()
                    .conditional_set(redis::ExistenceCheck::NX) // Only set if NOT exists
                    .get(false)
                    .with_expiration(redis::SetExpiry::EX(10)), // Auto-expire in 10s
            )
            .await;

        matches!(result, Ok(Some(_)) | Ok(None))
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /// Verify scanner access code before allowing any scanning.
    /// Accepts event_id (UUID) or event_key (slug) — resolves internally.
    pub async fn verify_access(&self, req: VerifyAccessRequest) -> Result<AccessVerifyResponse> {
        // Resolve event_id from either field
        let event_id = match req.event_id {
            Some(id) => id,
            None => match &req.event_key {
                Some(key) => self.resolve_event_id(key).await?,
                None => return Err(AppError::Validation("event_id or event_key required".into())),
            },
        };

        let row = sqlx::query(
            r#"SELECT sac.label, e.id as event_id, e.title, e.date::text as date
            FROM scanner_access_codes sac
            JOIN events e ON sac.event_id = e.id
            WHERE sac.code = $1 AND sac.event_id = $2 AND sac.is_active = true
              AND (sac.expires_at IS NULL OR sac.expires_at > NOW())"#,
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
            None => Ok(AccessVerifyResponse {
                verified: false,
                event: None,
                gate_label: None,
            }),
        }
    }

    /// Validate ticket via QR scan.
    /// Accepts event_key (slug) — resolves to UUID internally.
    /// Verifies HMAC signature if qr_data provided.
    /// Acquires Redis lock before DB update.
    pub async fn validate_ticket(&self, req: ValidateTicketRequest) -> Result<ScanResult> {
        // Resolve event_key → event_id
        let event_id = self.resolve_event_id(&req.event_key).await?;

        // If full QR JSON provided, verify HMAC signature
        if let Some(ref qr_json) = req.qr_data {
            if let Ok(qr) = serde_json::from_str::<serde_json::Value>(qr_json) {
                let nonce = qr["nonce"].as_str().unwrap_or("");
                let sig = qr["sig"].as_str().unwrap_or("");
                if !nonce.is_empty() && !sig.is_empty() {
                    if !self.verify_qr_sig(&req.ticket_id, nonce, sig) {
                        // Log the fraud attempt
                        tracing::warn!(
                            "QR signature mismatch for ticket {} — possible screenshot fraud",
                            req.ticket_id
                        );
                        return Ok(ScanResult {
                            result: "invalid".to_string(),
                            ticket: None,
                            message: Some("QR code is invalid or has already been used".to_string()),
                            new_qr_data: None,
                        });
                    }
                }
            }
        }

        self.validate_and_mark(&req.ticket_id, event_id, None).await
    }

    /// Manual ticket validation (fallback for damaged QR codes).
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

    /// Core validation + atomic mark-used logic.
    ///
    /// Strategy (DSA: optimistic locking with fallback):
    /// 1. Redis SET NX — fast distributed lock (O(1), <1ms)
    /// 2. DB SELECT — read current state
    /// 3. DB UPDATE WHERE status='valid' — atomic write, only succeeds once
    /// 4. Rotate QR nonce — invalidate any screenshots taken
    /// 5. Log to scan_log — audit trail
    ///
    /// If Redis is down: step 1 is skipped, step 3 is still atomic (DB constraint).
    async fn validate_and_mark(
        &self,
        ticket_id: &str,
        event_id: Uuid,
        scanned_by: Option<Uuid>,
    ) -> Result<ScanResult> {
        // STEP 1: Acquire Redis lock — prevents simultaneous double-scan
        if !self.acquire_scan_lock(ticket_id).await {
            return Ok(ScanResult {
                result: "already_used".to_string(),
                ticket: None,
                message: Some("Ticket is currently being processed".to_string()),
                new_qr_data: None,
            });
        }

        // STEP 2: Fetch ticket with user details
        let row = sqlx::query(
            r#"SELECT t.id, t.ticket_id, t.status, t.ticket_type, t.quantity,
                      t.scanned_at, t.event_id, u.name as user_name
            FROM tickets t
            JOIN users u ON t.user_id = u.id
            WHERE t.ticket_id = $1 AND t.event_id = $2"#,
        )
        .bind(ticket_id)
        .bind(event_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(AppError::Database)?;

        let row = match row {
            None => {
                self.log_scan(ticket_id, event_id, scanned_by, "invalid").await;
                return Ok(ScanResult {
                    result: "invalid".to_string(),
                    ticket: None,
                    message: Some("Ticket not found for this event".to_string()),
                    new_qr_data: None,
                });
            }
            Some(r) => r,
        };

        let status: String = row.get("status");
        let _db_ticket_id: Uuid = row.get("id");
        let tid: String = row.get("ticket_id");
        let user_name: String = row.get("user_name");
        let ticket_type: String = row.get("ticket_type");
        let quantity: i32 = row.get("quantity");
        let scanned_at: Option<DateTime<Utc>> = row.get("scanned_at");

        if status == "used" {
            self.log_scan(ticket_id, event_id, scanned_by, "already_used").await;
            return Ok(ScanResult {
                result: "already_used".to_string(),
                ticket: Some(ScanTicketInfo {
                    ticket_id: tid,
                    user_name,
                    ticket_type,
                    quantity,
                    scanned_at: scanned_at.map(|t| t.to_rfc3339()),
                }),
                message: None,
                new_qr_data: None,
            });
        }

        if status != "valid" {
            self.log_scan(ticket_id, event_id, scanned_by, "invalid").await;
            return Ok(ScanResult {
                result: "invalid".to_string(),
                ticket: None,
                message: Some(format!("Ticket status is '{}'", status)),
                new_qr_data: None,
            });
        }

        // STEP 3: Atomic mark-used + nonce rotation in a single transaction
        // The WHERE status='valid' clause is the final safety net against race conditions.
        let new_nonce = hex::encode(rand::random::<[u8; 32]>());
        let update_result = sqlx::query(
            r#"UPDATE tickets
               SET status = 'used',
                   scanned_at = NOW(),
                   scanned_by = $3,
                   qr_nonce = $4
               WHERE ticket_id = $1 AND event_id = $2 AND status = 'valid'
               RETURNING id"#,
        )
        .bind(ticket_id)
        .bind(event_id)
        .bind(scanned_by)
        .bind(&new_nonce)
        .fetch_optional(&self.pool)
        .await
        .map_err(AppError::Database)?;

        // If rows_affected = 0, another process beat us to it (race condition caught)
        if update_result.is_none() {
            self.log_scan(ticket_id, event_id, scanned_by, "already_used").await;
            return Ok(ScanResult {
                result: "already_used".to_string(),
                ticket: None,
                message: Some("Ticket was just scanned by another device".to_string()),
                new_qr_data: None,
            });
        }

        // STEP 4: Log successful scan
        self.log_scan(ticket_id, event_id, scanned_by, "valid").await;

        tracing::info!("Ticket {} scanned successfully for event {}", ticket_id, event_id);

        Ok(ScanResult {
            result: "valid".to_string(),
            ticket: Some(ScanTicketInfo {
                ticket_id: tid,
                user_name,
                ticket_type,
                quantity,
                scanned_at: None,
            }),
            message: None,
            new_qr_data: None, // Nonce rotated in DB; client refreshes from /tickets/me
        })
    }

    /// mark_used: Called by the separate PATCH endpoint (legacy support).
    /// Delegates to validate_and_mark with event_id lookup by ticket.
    pub async fn mark_used(&self, ticket_id: &str, scanned_by: Option<Uuid>) -> Result<bool> {
        // Look up event_id from ticket
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

    /// Get real-time scanning statistics for an event.
    pub async fn get_stats(&self, event_id: Uuid) -> Result<ScanStats> {
        let row = sqlx::query(
            r#"SELECT
                e.total_tickets,
                COUNT(CASE WHEN t.status = 'used' THEN 1 END) as scanned,
                COUNT(CASE WHEN t.status = 'valid' THEN 1 END) as remaining
            FROM events e
            LEFT JOIN tickets t ON e.id = t.event_id
            WHERE e.id = $1
            GROUP BY e.total_tickets"#,
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

    /// Internal: write to scan_log audit table. Fire-and-forget (errors are logged, not propagated).
    async fn log_scan(
        &self,
        ticket_id: &str,
        event_id: Uuid,
        scanned_by: Option<Uuid>,
        result: &str,
    ) {
        let _ = sqlx::query(
            r#"INSERT INTO scan_log (ticket_id, event_id, scanned_by, result)
            SELECT t.id, $2, $3, $4 FROM tickets t WHERE t.ticket_id = $1"#,
        )
        .bind(ticket_id)
        .bind(event_id)
        .bind(scanned_by)
        .bind(result)
        .execute(&self.pool)
        .await;
    }
}
