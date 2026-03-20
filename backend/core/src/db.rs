/**
 * INFRASTRUCTURE LAYER - Database Connection
 * 
 * Database Pool: The connection manager - because opening connections is expensive
 * 
 * Architecture Layer: Infrastructure (Layer 6)
 * Dependencies: PostgreSQL (via SQLx)
 * Responsibility: Create and configure database connection pool
 * 
 * Why connection pooling? Because:
 * 1. Opening TCP connections is slow (handshake, auth, etc)
 * 2. Databases have connection limits
 * 3. Reusing connections is way faster
 * 
 * Think of it as a taxi stand - taxis wait for passengers instead of
 * driving from the garage every time someone needs a ride
 */

use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::time::Duration;

pub async fn create_pool(database_url: &str) -> PgPool {
    if database_url.is_empty() {
        tracing::warn!("DATABASE_URL not set, database features unavailable");
        PgPoolOptions::new()
            .max_connections(1)
            .connect("postgres://localhost/nonexistent")
            .await
            .expect("This should not be called without a DATABASE_URL")
    } else {
        PgPoolOptions::new()
            .max_connections(10)
            .min_connections(1)
            // Give more headroom on cold starts (Render DB may need to wake up).
            .acquire_timeout(Duration::from_secs(10))
            .max_lifetime(Duration::from_secs(1800))
            .idle_timeout(Duration::from_secs(300))
            .connect(database_url)
            .await
            .expect("Failed to connect to database")
    }
}
