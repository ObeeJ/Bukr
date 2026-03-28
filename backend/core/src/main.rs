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
mod fees;
mod notifications;
mod tickets;
mod promos;
mod scanner;
mod payments;
mod analytics;
mod vendors;

use std::sync::Arc;
use axum::{
    extract::FromRef,
    routing::{get, patch, post, delete},
    Router,
};
use sqlx::PgPool;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

/// Single shared state projected to each service type via FromRef.
/// Applied ONCE at the top-level router — per-router .with_state() calls
/// corrupt matchit's radix trie for parameterised routes in Axum 0.7.
#[derive(Clone)]
struct AppState {
    ticket_service:  Arc<tickets::service::TicketService>,
    scanner_service: Arc<scanner::service::ScannerService>,
    promo_service:   Arc<promos::service::PromoService>,
    payment_service: Arc<payments::service::PaymentService>,
    vendor_service:  Arc<vendors::service::VendorService>,
    pool:            PgPool,
    arc_pool:        Arc<PgPool>,
}

impl FromRef<AppState> for Arc<tickets::service::TicketService> {
    fn from_ref(s: &AppState) -> Self { s.ticket_service.clone() }
}
impl FromRef<AppState> for Arc<scanner::service::ScannerService> {
    fn from_ref(s: &AppState) -> Self { s.scanner_service.clone() }
}
impl FromRef<AppState> for Arc<promos::service::PromoService> {
    fn from_ref(s: &AppState) -> Self { s.promo_service.clone() }
}
impl FromRef<AppState> for Arc<payments::service::PaymentService> {
    fn from_ref(s: &AppState) -> Self { s.payment_service.clone() }
}
impl FromRef<AppState> for Arc<vendors::service::VendorService> {
    fn from_ref(s: &AppState) -> Self { s.vendor_service.clone() }
}
/// analytics handlers use `State(pool): State<PgPool>`
impl FromRef<AppState> for PgPool {
    fn from_ref(s: &AppState) -> Self { s.pool.clone() }
}
/// transfer handler uses `State(pool): State<Arc<PgPool>>`
impl FromRef<AppState> for Arc<PgPool> {
    fn from_ref(s: &AppState) -> Self { s.arc_pool.clone() }
}

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
        build_router(pool, cfg).await
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
async fn build_router(pool: PgPool, cfg: config::Config) -> Router {
    // REPOSITORY LAYER
    let promo_repo  = promos::repository::PromoRepository::new(pool.clone());
    let ticket_repo = tickets::repository::TicketRepository::new(pool.clone());

    // SERVICE LAYER
    let ticket_service  = Arc::new(tickets::service::TicketService::new(ticket_repo, promo_repo.clone()));
    let promo_service   = Arc::new(promos::service::PromoService::new(promo_repo));
    let scanner_service = Arc::new(scanner::service::ScannerService::new_with_redis(pool.clone()).await);
    let payment_service = Arc::new(payments::service::PaymentService::new(
        pool.clone(),
        cfg.paystack_secret_key,
        cfg.paystack_webhook_secret,
    ));
    let vendor_service = Arc::new(vendors::service::VendorService::new(
        vendors::repository::VendorRepository::new(pool.clone()),
    ));

    let state = AppState {
        ticket_service,
        scanner_service,
        promo_service,
        payment_service,
        vendor_service,
        arc_pool: Arc::new(pool.clone()),
        pool,
    };

    // ROUTE GROUPS — NO .with_state() per router.
    // State is applied once at the end via AppState + FromRef.
    // Per-router .with_state() seals Router<S> → Router<()> before the radix
    // trie is merged, which silently drops all parameterised route nodes.

    let ticket_routes = Router::new()
        .route("/purchase", post(tickets::handler::purchase_ticket))
        .route("/me", get(tickets::handler::get_my_tickets))
        .route("/event/:event_id", get(tickets::handler::get_event_tickets))
        .route("/claim-free", post(tickets::handler::claim_free_ticket))
        .route("/:ticket_id/qr", get(tickets::handler::get_dynamic_qr))
        .route("/:ticket_id/transfer", post(tickets::transfer::transfer_ticket))
        .route("/:ticket_id/renew", post(scanner::handler::renew_ticket));

    let promo_routes = Router::new()
        .route("/events/:event_id/promos", get(promos::handler::list_promos).post(promos::handler::create_promo))
        .route("/events/:event_id/promos/:promo_id", delete(promos::handler::delete_promo))
        .route("/events/:event_id/promos/:promo_id/toggle", patch(promos::handler::toggle_promo))
        .route("/promos/validate", post(promos::handler::validate_promo));

    let scanner_routes = Router::new()
        .route("/verify-access", post(scanner::handler::verify_access))
        .route("/validate", post(scanner::handler::validate_ticket))
        .route("/manual-validate", post(scanner::handler::manual_validate))
        .route("/mark-used/:ticket_id", patch(scanner::handler::mark_used))
        .route("/:event_id/stats", get(scanner::handler::get_stats));

    let payment_routes = Router::new()
        .route("/initialize", post(payments::handler::initialize_payment))
        .route("/webhook/paystack", post(payments::handler::paystack_webhook))
        .route("/:reference/verify", get(payments::handler::verify_payment));

    let analytics_routes = Router::new()
        .route("/events/:event_id", get(analytics::handler::get_event_analytics))
        .route("/dashboard", get(analytics::handler::get_platform_metrics));

    let vendor_profile_routes = Router::new()
        .route("/", get(vendors::handler::search_vendors).post(vendors::handler::register_vendor))
        .route("/match", get(vendors::handler::match_vendors))
        .route("/availability", post(vendors::handler::set_availability))
        .route("/:id", get(vendors::handler::get_vendor));

    let vendor_hire_routes = Router::new()
        .route("/", post(vendors::handler::request_hire))
        .route("/:id/respond", post(vendors::handler::respond_hire))
        .route("/:id/complete", post(vendors::handler::complete_hire));

    let vendor_review_routes = Router::new()
        .route("/", post(vendors::handler::submit_review));

    let vendor_invitation_routes = Router::new()
        .route("/", post(vendors::handler::send_invitation))
        .route("/claim/:token", get(vendors::handler::claim_invitation));

    let vendor_me_routes = Router::new()
        .route("/hires", get(vendors::handler::get_my_hires));

    // MIDDLEWARE LAYER: Configure CORS — restrict to known origins in production
    let allowed_origin = std::env::var("ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:5173".to_string());

    let cors = CorsLayer::new()
        .allow_origin(
            allowed_origin
                .split(',')
                .filter_map(|s| s.trim().parse::<axum::http::HeaderValue>().ok())
                .collect::<Vec<_>>(),
        )
        .allow_methods([axum::http::Method::GET, axum::http::Method::POST, axum::http::Method::PUT, axum::http::Method::PATCH, axum::http::Method::DELETE])
        .allow_headers([axum::http::header::AUTHORIZATION, axum::http::header::CONTENT_TYPE, "x-user-id".parse().unwrap()])
        // Browsers cache the preflight response for 1 hour.
        // Without this, every POST/PATCH/DELETE to Rust triggers an OPTIONS
        // preflight before the real request — doubling request count.
        .max_age(std::time::Duration::from_secs(3600));

    // COMPOSE — one .with_state(state) at the very end.
    // Each prefix appears exactly once; sub-routers carry only relative paths.
    Router::new()
        .route("/health", get(health))
        .nest("/api/v1/tickets",          ticket_routes)
        .nest("/api/v1/scanner",          scanner_routes)
        .nest("/api/v1/payments",         payment_routes)
        .nest("/api/v1/analytics",        analytics_routes)
        .nest("/api/v1/vendors",          vendor_profile_routes)
        .nest("/api/v1/vendor-hires",     vendor_hire_routes)
        .nest("/api/v1/vendor-reviews",   vendor_review_routes)
        .nest("/api/v1/vendor-invitations", vendor_invitation_routes)
        .nest("/api/v1/vendor/me",        vendor_me_routes)
        .nest("/api/v1",                  promo_routes)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
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
