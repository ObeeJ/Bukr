use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::error::{AppError, Result};

#[derive(Debug, Deserialize)]
pub struct VerifyAccessRequest {
    pub event_id: Uuid,
    pub access_code: String,
}

#[derive(Debug, Deserialize)]
pub struct ValidateTicketRequest {
    pub qr_data: String,
    pub event_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct ManualValidateRequest {
    pub ticket_id: String,
    pub event_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct ScanResult {
    pub result: String,
    pub ticket: Option<ScanTicketInfo>,
    pub message: Option<String>,
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

pub struct ScannerService {
    pool: PgPool,
}

impl ScannerService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn verify_access(&self, req: VerifyAccessRequest) -> Result<AccessVerifyResponse> {
        let row = sqlx::query(
            r#"SELECT sac.label, e.id as event_id, e.title, e.date::text as date
            FROM scanner_access_codes sac
            JOIN events e ON sac.event_id = e.id
            WHERE sac.code = $1 AND sac.event_id = $2 AND sac.is_active = true
              AND (sac.expires_at IS NULL OR sac.expires_at > NOW())"#,
        )
        .bind(&req.access_code)
        .bind(req.event_id)
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

    pub async fn validate_ticket(&self, req: ValidateTicketRequest) -> Result<ScanResult> {
        let qr: serde_json::Value = serde_json::from_str(&req.qr_data)
            .map_err(|_| AppError::Validation("Invalid QR data format".into()))?;

        let ticket_id = qr["ticketId"]
            .as_str()
            .ok_or_else(|| AppError::Validation("Missing ticketId in QR data".into()))?;

        self.validate_by_ticket_id(ticket_id, req.event_id).await
    }

    pub async fn manual_validate(&self, req: ManualValidateRequest) -> Result<ScanResult> {
        self.validate_by_ticket_id(&req.ticket_id, req.event_id).await
    }

    async fn validate_by_ticket_id(&self, ticket_id: &str, event_id: Uuid) -> Result<ScanResult> {
        let row = sqlx::query(
            r#"SELECT t.ticket_id, t.status, t.ticket_type, t.quantity,
                      t.scanned_at, u.name as user_name
            FROM tickets t
            JOIN users u ON t.user_id = u.id
            WHERE t.ticket_id = $1 AND t.event_id = $2"#,
        )
        .bind(ticket_id)
        .bind(event_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(AppError::Database)?;

        match row {
            None => Ok(ScanResult {
                result: "invalid".to_string(),
                ticket: None,
                message: Some("Ticket not found or does not belong to this event".to_string()),
            }),
            Some(r) => {
                let status: String = r.get("status");
                let tid: String = r.get("ticket_id");
                let user_name: String = r.get("user_name");
                let ticket_type: String = r.get("ticket_type");
                let quantity: i32 = r.get("quantity");
                let scanned_at: Option<DateTime<Utc>> = r.get("scanned_at");

                if status == "used" {
                    Ok(ScanResult {
                        result: "already_used".to_string(),
                        ticket: Some(ScanTicketInfo {
                            ticket_id: tid, user_name, ticket_type, quantity,
                            scanned_at: scanned_at.map(|t| t.to_rfc3339()),
                        }),
                        message: None,
                    })
                } else if status == "valid" {
                    Ok(ScanResult {
                        result: "valid".to_string(),
                        ticket: Some(ScanTicketInfo {
                            ticket_id: tid, user_name, ticket_type, quantity,
                            scanned_at: None,
                        }),
                        message: None,
                    })
                } else {
                    Ok(ScanResult {
                        result: "invalid".to_string(),
                        ticket: None,
                        message: Some(format!("Ticket status is '{}'", status)),
                    })
                }
            }
        }
    }

    pub async fn mark_used(&self, ticket_id: &str, scanned_by: Option<Uuid>) -> Result<bool> {
        let result = sqlx::query(
            "UPDATE tickets SET status = 'used', scanned_at = NOW(), scanned_by = $2 WHERE ticket_id = $1 AND status = 'valid'",
        )
        .bind(ticket_id)
        .bind(scanned_by)
        .execute(&self.pool)
        .await
        .map_err(AppError::Database)?;

        if result.rows_affected() == 0 {
            return Err(AppError::TicketAlreadyUsed);
        }

        // Log the scan
        let _ = sqlx::query(
            r#"INSERT INTO scan_log (ticket_id, event_id, scanned_by, result)
            SELECT t.id, t.event_id, $2, 'valid'
            FROM tickets t WHERE t.ticket_id = $1"#,
        )
        .bind(ticket_id)
        .bind(scanned_by)
        .execute(&self.pool)
        .await;

        Ok(true)
    }

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

        let total = total_tickets as f64;
        let scan_rate = if total > 0.0 { (scanned as f64 / total) * 100.0 } else { 0.0 };

        Ok(ScanStats { total_tickets, scanned, remaining, scan_rate })
    }
}
