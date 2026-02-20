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

/**
 * Create a PostgreSQL connection pool
 * 
 * Configuration:
 * - max_connections: 20 (how many concurrent connections allowed)
 * - min_connections: 5 (keep this many warm and ready)
 * 
 * Why these numbers?
 * - 20 max: Enough for moderate load, not too many to overwhelm DB
 * - 5 min: Always have connections ready, avoid cold start delays
 * 
 * Pool behavior:
 * - Request comes in -> grab connection from pool
 * - Do database work -> return connection to pool
 * - If pool empty -> wait for available connection
 * - If all connections busy -> queue the request
 * 
 * @param database_url - PostgreSQL connection string (postgres://user:pass@host/db)
 * @returns Connection pool ready for use
 */
pub async fn create_pool(database_url: &str) -> PgPool {
    // Check if database URL is provided
    if database_url.is_empty() {
        // No database URL - log warning and create dummy pool
        // This allows app to start in dev mode without database
        tracing::warn!("DATABASE_URL not set, database features unavailable");
        
        // Create a pool that will fail on use
        // Better to fail explicitly than silently
        PgPoolOptions::new()
            .max_connections(1)
            .connect("postgres://localhost/nonexistent")
            .await
            .expect("This should not be called without a DATABASE_URL")
    } else {
        // Database URL provided - create proper connection pool
        PgPoolOptions::new()
            .max_connections(20)     // Maximum 20 concurrent connections
            .min_connections(5)      // Keep 5 connections warm
            .connect(database_url)   // Connect to PostgreSQL
            .await
            .expect("Failed to connect to database")  // Panic if connection fails
            // Why panic? Because without database, app can't function
            // Better to fail fast than run in broken state
    }
}
