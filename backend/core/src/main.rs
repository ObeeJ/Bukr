/**
 * INFRASTRUCTURE LAYER - Application Entry Point
 * 
 * Main: The conductor - orchestrating all services and routes
 * 
 * Architecture Layer: Infrastructure (Layer 6)
 * Responsibility: Application bootstrap, dependency injection, routing
 * 
 * Startup Flow:
 * 1. Initialize logging (tracing)
 * 2. Load configuration from environment
 * 3. Create database connection pool
 * 4. Initialize repositories
 * 5. Initialize services with dependencies
 * 6. Build router with all endpoints
 * 7. Start HTTP server
 * 
 * Architecture Pattern: Dependency Injection
 * - Repositories depend on database pool
 * - Services depend on repositories
 * - Handlers depend on services
 * - Router composes all handlers
 * 
 * Modules:
 * - config: Configuration management
 * - db: Database connection pooling
 * - error: Error handling
 * - tickets: Ticket purchase and management
 * - promos: Promo code management
 * - scanner: Ticket scanning and validation
 * - payments: Payment processing
 * - analytics: Analytics and reporting
 */

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

/**
 * Main Entry Point
 * 
 * Bootstrap application and start HTTP server
 */
#[tokio::main]
async fn main() {
    // Initialize structured logging with tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "bukr_core=info,tower_http=info".into()),
        )
        .init();

    // Load environment variables from .env file
    dotenvy::dotenv().ok();

    // Load configuration from environment
    let cfg = config::Config::from_env();

    // Create database connection pool
    let pool = if cfg.database_url.is_empty() {
        tracing::warn!("DATABASE_URL not set — running without database");
        None
    } else {
        Some(db::create_pool(&cfg.database_url).await)
    };

    // Start HTTP server
    let addr = format!("0.0.0.0:{}", cfg.port);
    tracing::info!("Bukr Core starting on {}", addr);

    // Build router with all routes
    let app = if let Some(pool) = pool {
        build_router(pool, cfg)
    } else {
        // Health-only mode when database unavailable
        Router::new()
            .route("/health", get(health))
            .layer(CorsLayer::permissive())
    };

    // Bind and serve
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

/**
 * Build Application Router
 * 
 * Dependency injection and route composition
 * 
 * Flow:
 * 1. Create repositories (data access layer)
 * 2. Create services (business logic layer)
 * 3. Create route groups with handlers
 * 4. Compose all routes into main router
 * 5. Add middleware (CORS, tracing)
 * 
 * @param pool - Database connection pool
 * @param cfg - Application configuration
 * @returns Configured Axum router
 */
fn build_router(pool: sqlx::PgPool, cfg: config::Config) -> Router {
    // REPOSITORY LAYER: Initialize repositories
    let promo_repo = promos::repository::PromoRepository::new(pool.clone());
    let ticket_repo = tickets::repository::TicketRepository::new(pool.clone());

    // USE CASE LAYER: Initialize services with dependencies
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

    // CONTROLLER LAYER: Build route groups
    
    // Ticket routes: Purchase and retrieval
    let ticket_routes = Router::new()
        .route("/purchase", post(tickets::handler::purchase_ticket))
        .route("/me", get(tickets::handler::get_my_tickets))
        .route("/event/{event_id}", get(tickets::handler::get_event_tickets))
        .route("/claim-free", post(tickets::handler::claim_free_ticket))
        .with_state(ticket_service);

    // Promo routes: Discount code management
    let promo_routes = Router::new()
        .route("/events/{event_id}/promos", get(promos::handler::list_promos).post(promos::handler::create_promo))
        .route("/events/{event_id}/promos/{promo_id}", delete(promos::handler::delete_promo))
        .route("/events/{event_id}/promos/{promo_id}/toggle", patch(promos::handler::toggle_promo))
        .route("/promos/validate", post(promos::handler::validate_promo))
        .with_state(promo_service);

    // Scanner routes: Ticket validation at gates
    let scanner_routes = Router::new()
        .route("/verify-access", post(scanner::handler::verify_access))
        .route("/validate", post(scanner::handler::validate_ticket))
        .route("/manual-validate", post(scanner::handler::manual_validate))
        .route("/mark-used/{ticket_id}", patch(scanner::handler::mark_used))
        .route("/{event_id}/stats", get(scanner::handler::get_stats))
        .with_state(scanner_service);

    // Payment routes: Payment processing and webhooks
    let payment_routes = Router::new()
        .route("/initialize", post(payments::handler::initialize_payment))
        .route("/webhook/paystack", post(payments::handler::paystack_webhook))
        .route("/webhook/stripe", post(payments::handler::stripe_webhook))
        .route("/{reference}/verify", get(payments::handler::verify_payment))
        .with_state(payment_service);

    // Analytics routes: Reporting and metrics
    let analytics_routes = Router::new()
        .route("/events/{event_id}", get(analytics::handler::get_event_analytics))
        .route("/dashboard", get(analytics::handler::get_dashboard_summary))
        .with_state(pool);

    // MIDDLEWARE LAYER: Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)      // Allow all origins (configure for production)
        .allow_methods(Any)     // Allow all HTTP methods
        .allow_headers(Any);    // Allow all headers

    // Compose all routes into main router
    Router::new()
        .route("/health", get(health))
        .nest("/api/v1/tickets", ticket_routes)
        .nest("/api/v1", promo_routes)
        .nest("/api/v1/scanner", scanner_routes)
        .nest("/api/v1/payments", payment_routes)
        .nest("/api/v1/analytics", analytics_routes)
        .layer(cors)                        // CORS middleware
        .layer(TraceLayer::new_for_http())  // Request logging
}

/**
 * Health Check Endpoint
 * 
 * Simple health check for load balancers and monitoring
 * 
 * @returns JSON with service status
 */
async fn health() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "ok",
        "service": "bukr-core"
    }))
}
