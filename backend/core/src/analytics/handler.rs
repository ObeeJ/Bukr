use axum::{
    extract::{Path, State},
    Json,
};
use serde_json::{json, Value};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::error::{AppError, Result};

pub async fn get_event_analytics(
    State(pool): State<PgPool>,
    Path(event_id): Path<Uuid>,
) -> Result<Json<Value>> {
    let event = sqlx::query(
        r#"SELECT e.title, e.total_tickets, e.available_tickets, e.currency
        FROM events e WHERE e.id = $1"#,
    )
    .bind(event_id)
    .fetch_optional(&pool)
    .await
    .map_err(AppError::Database)?
    .ok_or_else(|| AppError::NotFound("Event not found".into()))?;

    let title: String = event.get("title");
    let total_tickets: i32 = event.get("total_tickets");
    let available_tickets: i32 = event.get("available_tickets");
    let currency: String = event.get("currency");

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

    let total_sold: i64 = ticket_stats.get("total_sold");
    let total_revenue: rust_decimal::Decimal = ticket_stats.get("total_revenue");
    let avg_rating: f64 = ticket_stats.get("avg_rating");
    let scanned: i64 = ticket_stats.get("scanned");

    let sold = total_tickets - available_tickets;

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

pub async fn get_dashboard_summary(
    State(pool): State<PgPool>,
) -> Result<Json<Value>> {
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

    let event_count: i64 = stats.get("event_count");
    let total_revenue: rust_decimal::Decimal = stats.get("total_revenue");
    let total_tickets_sold: i64 = stats.get("total_tickets_sold");

    Ok(Json(json!({
        "status": "success",
        "data": {
            "total_events": event_count,
            "total_revenue": total_revenue,
            "total_tickets_sold": total_tickets_sold,
        }
    })))
}
