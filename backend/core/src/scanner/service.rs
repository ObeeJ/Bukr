/**
 * USE CASE LAYER - Scanner Business Logic
 * 
 * Scanner Service: The bouncer - deciding who gets in and who doesn't
 * 
 * Architecture Layer: Use Case (Layer 3)
 * Dependencies: Repository (database queries)
 * Responsibility: Ticket validation, access control, scanning statistics
 * 
 * Core Functions:
 * 1. Access Verification - validate scanner credentials
 * 2. Ticket Validation - check ticket authenticity and status
 * 3. Usage Tracking - mark tickets as used, prevent double-entry
 * 4. Statistics - real-time scanning metrics
 * 
 * Security Features:
 * - Access code verification (only authorized scanners)
 * - Event-ticket matching (prevent cross-event usage)
 * - Status checking (valid, used, invalid)
 * - Audit logging (scan_log table)
 */

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::error::{AppError, Result};

/**
 * DOMAIN LAYER - Scanner DTOs
 */

// Request to verify scanner access code
#[derive(Debug, Deserialize)]
pub struct VerifyAccessRequest {
    pub event_id: Uuid,        // Which event to scan
    pub access_code: String,   // Scanner's access code
}

// Request to validate ticket via QR code
#[derive(Debug, Deserialize)]
pub struct ValidateTicketRequest {
    pub qr_data: String,       // QR code JSON data
    pub event_id: Uuid,        // Event being scanned
}

// Request for manual ticket validation
#[derive(Debug, Deserialize)]
pub struct ManualValidateRequest {
    pub ticket_id: String,     // Manually entered ticket ID
    pub event_id: Uuid,        // Event being scanned
}

// Scan validation result
#[derive(Debug, Serialize)]
pub struct ScanResult {
    pub result: String,                    // "valid" | "already_used" | "invalid"
    pub ticket: Option<ScanTicketInfo>,    // Ticket details if found
    pub message: Option<String>,           // Error message if invalid
}

// Ticket information for scan result
#[derive(Debug, Serialize)]
pub struct ScanTicketInfo {
    pub ticket_id: String,             // Ticket ID
    pub user_name: String,             // Ticket holder name
    pub ticket_type: String,           // Ticket type (VIP, Regular, etc)
    pub quantity: i32,                 // Number of tickets
    pub scanned_at: Option<String>,    // When ticket was scanned (if already used)
}

// Access verification response
#[derive(Debug, Serialize)]
pub struct AccessVerifyResponse {
    pub verified: bool,                // Is access code valid?
    pub event: Option<EventSummary>,   // Event details if verified
    pub gate_label: Option<String>,    // Gate/entrance label
}

// Event summary for scanner
#[derive(Debug, Serialize)]
pub struct EventSummary {
    pub id: Uuid,          // Event ID
    pub title: String,     // Event name
    pub date: String,      // Event date
}

// Scanning statistics
#[derive(Debug, Serialize)]
pub struct ScanStats {
    pub total_tickets: i32,    // Total tickets sold
    pub scanned: i64,          // Tickets scanned (used)
    pub remaining: i64,        // Tickets not yet scanned
    pub scan_rate: f64,        // Percentage scanned
}

/**
 * ScannerService: The ticket validator
 * 
 * Handles all ticket scanning operations:
 * - Verify scanner access
 * - Validate tickets
 * - Mark tickets as used
 * - Track statistics
 */
pub struct ScannerService {
    pool: PgPool,    // Database connection
}

impl ScannerService {
    /**
     * Constructor: Initialize scanner service
     */
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /**
     * Verify Scanner Access
     * 
     * Validates scanner access code before allowing ticket scanning
     * 
     * Flow:
     * 1. Check access code exists for event
     * 2. Verify code is active
     * 3. Check expiration (if set)
     * 4. Return event details if valid
     * 
     * @param req - Access verification request
     * @returns Verification result with event details
     */
    pub async fn verify_access(&self, req: VerifyAccessRequest) -> Result<AccessVerifyResponse> {
        // Query scanner access code with event details
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

        // Return verification result
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

    /**
     * Validate Ticket via QR Code
     * 
     * Parses QR data and validates ticket
     * 
     * @param req - Validation request with QR data
     * @returns Scan result
     */
    pub async fn validate_ticket(&self, req: ValidateTicketRequest) -> Result<ScanResult> {
        // Parse QR code JSON
        let qr: serde_json::Value = serde_json::from_str(&req.qr_data)
            .map_err(|_| AppError::Validation("Invalid QR data format".into()))?;

        // Extract ticket ID from QR data
        let ticket_id = qr["ticketId"]
            .as_str()
            .ok_or_else(|| AppError::Validation("Missing ticketId in QR data".into()))?;

        // Validate ticket
        self.validate_by_ticket_id(ticket_id, req.event_id).await
    }

    /**
     * Manual Ticket Validation
     * 
     * Fallback when QR code is damaged/unreadable
     * 
     * @param req - Manual validation request
     * @returns Scan result
     */
    pub async fn manual_validate(&self, req: ManualValidateRequest) -> Result<ScanResult> {
        self.validate_by_ticket_id(&req.ticket_id, req.event_id).await
    }

    /**
     * Validate Ticket by ID
     * 
     * Core validation logic used by both QR and manual validation
     * 
     * Flow:
     * 1. Fetch ticket from database
     * 2. Verify ticket belongs to event
     * 3. Check ticket status:
     *    - "used" -> already scanned
     *    - "valid" -> ready to scan
     *    - other -> invalid
     * 
     * @param ticket_id - Ticket ID to validate
     * @param event_id - Event ID to match
     * @returns Scan result with ticket details
     */
    async fn validate_by_ticket_id(&self, ticket_id: &str, event_id: Uuid) -> Result<ScanResult> {
        // Fetch ticket with user details
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

        // Process validation result
        match row {
            None => Ok(ScanResult {
                result: "invalid".to_string(),
                ticket: None,
                message: Some("Ticket not found or does not belong to this event".to_string()),
            }),
            Some(r) => {
                // Extract ticket data
                let status: String = r.get("status");
                let tid: String = r.get("ticket_id");
                let user_name: String = r.get("user_name");
                let ticket_type: String = r.get("ticket_type");
                let quantity: i32 = r.get("quantity");
                let scanned_at: Option<DateTime<Utc>> = r.get("scanned_at");

                // Check ticket status
                if status == "used" {
                    // Ticket already scanned - deny entry
                    Ok(ScanResult {
                        result: "already_used".to_string(),
                        ticket: Some(ScanTicketInfo {
                            ticket_id: tid, user_name, ticket_type, quantity,
                            scanned_at: scanned_at.map(|t| t.to_rfc3339()),
                        }),
                        message: None,
                    })
                } else if status == "valid" {
                    // Ticket ready to scan - allow entry
                    Ok(ScanResult {
                        result: "valid".to_string(),
                        ticket: Some(ScanTicketInfo {
                            ticket_id: tid, user_name, ticket_type, quantity,
                            scanned_at: None,
                        }),
                        message: None,
                    })
                } else {
                    // Invalid status (pending, cancelled, etc)
                    Ok(ScanResult {
                        result: "invalid".to_string(),
                        ticket: None,
                        message: Some(format!("Ticket status is '{}'", status)),
                    })
                }
            }
        }
    }

    /**
     * Mark Ticket as Used
     * 
     * Final step after validation: mark ticket as scanned
     * Prevents double-entry with same ticket
     * 
     * Flow:
     * 1. Update ticket status to 'used'
     * 2. Record scan timestamp
     * 3. Record scanner ID (if provided)
     * 4. Log scan event
     * 
     * @param ticket_id - Ticket ID to mark
     * @param scanned_by - Scanner user ID (optional)
     * @returns true if successful
     */
    pub async fn mark_used(&self, ticket_id: &str, scanned_by: Option<Uuid>) -> Result<bool> {
        // Atomic update: only mark if status is 'valid'
        let result = sqlx::query(
            "UPDATE tickets SET status = 'used', scanned_at = NOW(), scanned_by = $2 WHERE ticket_id = $1 AND status = 'valid'",
        )
        .bind(ticket_id)
        .bind(scanned_by)
        .execute(&self.pool)
        .await
        .map_err(AppError::Database)?;

        // Check if ticket was actually updated
        if result.rows_affected() == 0 {
            return Err(AppError::TicketAlreadyUsed);
        }

        // Log scan event for audit trail
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

    /**
     * Get Scanning Statistics
     * 
     * Real-time metrics for event organizers
     * 
     * Metrics:
     * - Total tickets sold
     * - Tickets scanned (used)
     * - Tickets remaining (valid)
     * - Scan rate percentage
     * 
     * @param event_id - Event ID
     * @returns Scanning statistics
     */
    pub async fn get_stats(&self, event_id: Uuid) -> Result<ScanStats> {
        // Aggregate ticket counts by status
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

        // Extract statistics
        let total_tickets: i32 = row.get("total_tickets");
        let scanned: i64 = row.get("scanned");
        let remaining: i64 = row.get("remaining");

        // Calculate scan rate percentage
        let total = total_tickets as f64;
        let scan_rate = if total > 0.0 { (scanned as f64 / total) * 100.0 } else { 0.0 };

        Ok(ScanStats { total_tickets, scanned, remaining, scan_rate })
    }
}
