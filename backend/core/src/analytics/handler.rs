/**
 * CONTROLLER LAYER - Analytics HTTP Handlers
 * 
 * Analytics Handler: The data storyteller - turning numbers into insights
 * 
 * Architecture Layer: Controller (Layer 2)
 * Dependencies: Database pool (direct queries for analytics)
 * Responsibility: HTTP request/response handling for analytics endpoints
 * 
 * Endpoints:
 * - GET /analytics/events/{event_id}: Event-specific analytics
 * - GET /analytics/dashboard: Platform-wide summary
 * 
 * Metrics Provided:
 * - Ticket sales (sold, scanned, available)
 * - Revenue (total, by event)
 * - User engagement (ratings, attendance)
 * - Platform statistics (events, tickets, revenue)
 * 
 * Note: Analytics uses direct database queries (no service layer)
 * for performance and simplicity of read-only aggregations
 */

use axum::{
    extract::{Path, State},
    Json,
};
use serde_json::{json, Value};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::error::{AppError, Result};

/**
 * Get Event Analytics
 * 
 * Comprehensive analytics for a single event
 * 
 * Metrics:
 * - Ticket inventory (total, sold, available)
 * - Revenue (total sales in event currency)
 * - Attendance (scanned tickets)
 * - User satisfaction (average excitement rating)
 * 
 * Use Case: Event organizers monitor performance
 * 
 * @param pool - Database connection pool
 * @param event_id - Event ID
 * @returns Event analytics data
 */
pub async fn get_event_analytics(
    State(pool): State<PgPool>,
    Path(event_id): Path<Uuid>,
) -> Result<Json<Value>> {
    // Fetch event details
    let event = sqlx::query(
        r#"SELECT e.title, e.total_tickets, e.available_tickets, e.currency
        FROM events e WHERE e.id = $1"#,
    )
    .bind(event_id)
    .fetch_optional(&pool)
    .await
    .map_err(AppError::Database)?
    .ok_or_else(|| AppError::NotFound("Event not found".into()))?;

    // Extract event data
    let title: String = event.get("title");
    let total_tickets: i32 = event.get("total_tickets");
    let available_tickets: i32 = event.get("available_tickets");
    let currency: String = event.get("currency");

    // Aggregate ticket statistics
    let ticket_stats = sqlx::query(
        r#"SELECT
            COUNT(*) as total_sold,
            COALESCE(SUM(total_price), 0) as total_revenue,
            COALESCE(AVG(excitement_rating::float8), 0) as avg_rating,
            COUNT(CASE WHEN status = 'used' THEN 1 END) as scanned
        FROM tickets WHERE event_id = $1"#,
    )
    .bind(event_id)
    .fetch_one(&pool)
    .await
    .map_err(AppError::Database)?;

    // Extract statistics
    let total_sold: i64 = ticket_stats.get("total_sold");
    let total_revenue: rust_decimal::Decimal = ticket_stats.get("total_revenue");
    let avg_rating: f64 = ticket_stats.get("avg_rating");
    let scanned: i64 = ticket_stats.get("scanned");

    // Calculate sold tickets
    let sold = total_tickets - available_tickets;

    // Return analytics data
    Ok(Json(json!({
        "status": "success",
        "data": {
            "event_id": event_id,
            "title": title,
            "total_tickets": total_tickets,
            "sold_tickets": sold,
            "scanned_tickets": scanned,
            "available_tickets": available_tickets,
            "total_revenue": total_revenue,
            "currency": currency,
            "average_rating": avg_rating,
        }
    })))
}

/**
 * Get Dashboard Summary
 * 
 * Platform-wide analytics for admin dashboard
 * 
 * Metrics:
 * - Total events created
 * - Total revenue across all events
 * - Total tickets sold
 * 
 * Use Case: Platform administrators monitor overall health
 * 
 * @param pool - Database connection pool
 * @returns Platform summary statistics
 */
pub async fn get_dashboard_summary(
    State(pool): State<PgPool>,
) -> Result<Json<Value>> {
    // Aggregate platform-wide statistics
    let stats = sqlx::query(
        r#"SELECT
            COUNT(DISTINCT e.id) as event_count,
            COALESCE(SUM(t.total_price), 0) as total_revenue,
            COUNT(t.id) as total_tickets_sold
        FROM events e
        LEFT JOIN tickets t ON e.id = t.event_id"#,
    )
    .fetch_one(&pool)
    .await
    .map_err(AppError::Database)?;

    // Extract statistics
    let event_count: i64 = stats.get("event_count");
    let total_revenue: rust_decimal::Decimal = stats.get("total_revenue");
    let total_tickets_sold: i64 = stats.get("total_tickets_sold");

    // Return dashboard summary
    Ok(Json(json!({
        "status": "success",
        "data": {
            "total_events": event_count,
            "total_revenue": total_revenue,
            "total_tickets_sold": total_tickets_sold,
        }
    })))
}
