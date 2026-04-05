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
    http::HeaderMap,
    Json,
};
use chrono;
use serde_json::{json, Value};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::error::{AppError, Result};

/**
 * Extract user_id from X-User-ID header forwarded by Go gateway
 */
fn extract_user_id(headers: &HeaderMap) -> Result<Uuid> {
    headers
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or(AppError::Unauthorized)
}

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
    headers: HeaderMap,
    Path(event_id): Path<Uuid>,
) -> Result<Json<Value>> {
    let user_id = extract_user_id(&headers)?;

    // Fetch event details and verify ownership
    let event = sqlx::query(
        r#"SELECT e.title, e.total_tickets, e.available_tickets, e.currency
        FROM events e WHERE e.id = $1 AND e.organizer_id = $2"#,
    )
    .bind(event_id)
    .bind(user_id)
    .fetch_optional(&pool)
    .await
    .map_err(AppError::Database)?
    .ok_or_else(|| AppError::NotFound("Event not found or not owned by you".into()))?;

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
    let _total_sold: i64 = ticket_stats.get("total_sold");
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
 * Get Platform Metrics
 *
 * Time-series and funnel metrics for operational observability.
 *
 * Metrics returned:
 * - tickets_sold_per_day: last 30 days, daily granularity
 * - conversion_rate: (tickets with status != 'pending') / total tickets created
 * - payment_success_rate: successful payments / total payment attempts
 * - failed_payments_last_24h: count of failed transactions in last 24 hours
 * - top_events_by_revenue: top 5 events by total ticket revenue
 *
 * Use case: ops dashboard, alerting, capacity planning.
 */
pub async fn get_platform_metrics(
    State(pool): State<PgPool>,
) -> Result<Json<Value>> {
    // Tickets sold per day — last 30 days
    let daily_rows = sqlx::query(
        r#"SELECT
               DATE(purchase_date) AS day,
               COUNT(*)            AS tickets_sold,
               COALESCE(SUM(total_price), 0) AS revenue
           FROM tickets
           WHERE purchase_date >= NOW() - INTERVAL '30 days'
           GROUP BY DATE(purchase_date)
           ORDER BY day ASC"#,
    )
    .fetch_all(&pool)
    .await
    .map_err(AppError::Database)?;

    let tickets_per_day: Vec<serde_json::Value> = daily_rows.iter().map(|r| {
        json!({
            "day":          r.get::<chrono::NaiveDate, _>("day").to_string(),
            "tickets_sold": r.get::<i64, _>("tickets_sold"),
            "revenue":      r.get::<rust_decimal::Decimal, _>("revenue"),
        })
    }).collect();

    // Conversion rate: tickets that moved past 'pending' / all tickets created
    let conv_row = sqlx::query(
        r#"SELECT
               COUNT(*) FILTER (WHERE status != 'pending') AS converted,
               COUNT(*)                                    AS total
           FROM tickets
           WHERE purchase_date >= NOW() - INTERVAL '30 days'"#,
    )
    .fetch_one(&pool)
    .await
    .map_err(AppError::Database)?;

    let converted: i64 = conv_row.get("converted");
    let total_created: i64 = conv_row.get("total");
    let conversion_rate = if total_created > 0 {
        (converted as f64 / total_created as f64 * 100.0 * 100.0).round() / 100.0
    } else {
        0.0
    };

    // Payment success rate — last 30 days
    let pay_row = sqlx::query(
        r#"SELECT
               COUNT(*) FILTER (WHERE status = 'success') AS successful,
               COUNT(*)                                   AS total
           FROM payment_transactions
           WHERE created_at >= NOW() - INTERVAL '30 days'"#,
    )
    .fetch_one(&pool)
    .await
    .map_err(AppError::Database)?;

    let pay_successful: i64 = pay_row.get("successful");
    let pay_total: i64 = pay_row.get("total");
    let payment_success_rate = if pay_total > 0 {
        (pay_successful as f64 / pay_total as f64 * 100.0 * 100.0).round() / 100.0
    } else {
        0.0
    };

    // Failed payments in last 24 hours — operational alert signal
    let failed_24h: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM payment_transactions WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '24 hours'"
    )
    .fetch_one(&pool)
    .await
    .map_err(AppError::Database)?;

    // Top 5 events by revenue — last 30 days
    let top_rows = sqlx::query(
        r#"SELECT
               e.id::text,
               e.title,
               COUNT(t.id)              AS tickets_sold,
               COALESCE(SUM(t.total_price), 0) AS revenue,
               t.currency
           FROM events e
           JOIN tickets t ON t.event_id = e.id
           WHERE t.purchase_date >= NOW() - INTERVAL '30 days'
           GROUP BY e.id, e.title, t.currency
           ORDER BY revenue DESC
           LIMIT 5"#,
    )
    .fetch_all(&pool)
    .await
    .map_err(AppError::Database)?;

    let top_events: Vec<serde_json::Value> = top_rows.iter().map(|r| {
        json!({
            "event_id":     r.get::<String, _>("id"),
            "title":        r.get::<String, _>("title"),
            "tickets_sold": r.get::<i64, _>("tickets_sold"),
            "revenue":      r.get::<rust_decimal::Decimal, _>("revenue"),
            "currency":     r.get::<String, _>("currency"),
        })
    }).collect();

    Ok(Json(json!({
        "status": "success",
        "data": {
            "period_days": 30,
            "tickets_sold_per_day":   tickets_per_day,
            "conversion_rate_pct":    conversion_rate,
            "payment_success_rate_pct": payment_success_rate,
            "failed_payments_last_24h": failed_24h,
            "top_events_by_revenue":  top_events,
        }
    })))
}
