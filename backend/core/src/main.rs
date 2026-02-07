mod config;
mod db;
mod error;
mod tickets;
mod promos;
mod scanner;
mod payments;
mod analytics;

use std::sync::Arc;
use axum::{
    routing::{get, patch, post, delete},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "bukr_core=info,tower_http=info".into()),
        )
        .init();

    dotenvy::dotenv().ok();

    let cfg = config::Config::from_env();

    // Database pool
    let pool = if cfg.database_url.is_empty() {
        tracing::warn!("DATABASE_URL not set — running without database");
        None
    } else {
        Some(db::create_pool(&cfg.database_url).await)
    };

    let addr = format!("0.0.0.0:{}", cfg.port);
    tracing::info!("Bukr Core starting on {}", addr);

    let app = if let Some(pool) = pool {
        build_router(pool, cfg)
    } else {
        // Health-only mode when no DB
        Router::new()
            .route("/health", get(health))
            .layer(CorsLayer::permissive())
    };

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn build_router(pool: sqlx::PgPool, cfg: config::Config) -> Router {
    // Repositories
    let promo_repo = promos::repository::PromoRepository::new(pool.clone());
    let ticket_repo = tickets::repository::TicketRepository::new(pool.clone());

    // Services
    let ticket_service = Arc::new(tickets::service::TicketService::new(ticket_repo, promo_repo.clone()));
    let promo_service = Arc::new(promos::service::PromoService::new(promo_repo));
    let scanner_service = Arc::new(scanner::service::ScannerService::new(pool.clone()));
    let payment_service = Arc::new(payments::service::PaymentService::new(
        pool.clone(),
        cfg.paystack_secret_key,
        cfg.stripe_secret_key,
        cfg.paystack_webhook_secret,
        cfg.stripe_webhook_secret,
    ));

    // Ticket routes
    let ticket_routes = Router::new()
        .route("/purchase", post(tickets::handler::purchase_ticket))
        .route("/me", get(tickets::handler::get_my_tickets))
        .route("/event/{event_id}", get(tickets::handler::get_event_tickets))
        .with_state(ticket_service);

    // Promo routes
    let promo_routes = Router::new()
        .route("/events/{event_id}/promos", get(promos::handler::list_promos).post(promos::handler::create_promo))
        .route("/events/{event_id}/promos/{promo_id}", delete(promos::handler::delete_promo))
        .route("/events/{event_id}/promos/{promo_id}/toggle", patch(promos::handler::toggle_promo))
        .route("/promos/validate", post(promos::handler::validate_promo))
        .with_state(promo_service);

    // Scanner routes
    let scanner_routes = Router::new()
        .route("/verify-access", post(scanner::handler::verify_access))
        .route("/validate", post(scanner::handler::validate_ticket))
        .route("/manual-validate", post(scanner::handler::manual_validate))
        .route("/mark-used/{ticket_id}", patch(scanner::handler::mark_used))
        .route("/{event_id}/stats", get(scanner::handler::get_stats))
        .with_state(scanner_service);

    // Payment routes
    let payment_routes = Router::new()
        .route("/initialize", post(payments::handler::initialize_payment))
        .route("/webhook/paystack", post(payments::handler::paystack_webhook))
        .route("/{reference}/verify", get(payments::handler::verify_payment))
        .with_state(payment_service);

    // Analytics routes
    let analytics_routes = Router::new()
        .route("/events/{event_id}", get(analytics::handler::get_event_analytics))
        .route("/dashboard", get(analytics::handler::get_dashboard_summary))
        .with_state(pool);

    // CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Compose all routes
    Router::new()
        .route("/health", get(health))
        .nest("/api/v1/tickets", ticket_routes)
        .nest("/api/v1", promo_routes)
        .nest("/api/v1/scanner", scanner_routes)
        .nest("/api/v1/payments", payment_routes)
        .nest("/api/v1/analytics", analytics_routes)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
}

async fn health() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "ok",
        "service": "bukr-core"
    }))
}
