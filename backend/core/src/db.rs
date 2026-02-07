use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

pub async fn create_pool(database_url: &str) -> PgPool {
    if database_url.is_empty() {
        tracing::warn!("DATABASE_URL not set, database features unavailable");
        // Return a pool that will fail on use — caller should handle gracefully
        PgPoolOptions::new()
            .max_connections(1)
            .connect("postgres://localhost/nonexistent")
            .await
            .expect("This should not be called without a DATABASE_URL")
    } else {
        PgPoolOptions::new()
            .max_connections(20)
            .min_connections(5)
            .connect(database_url)
            .await
            .expect("Failed to connect to database")
    }
}
