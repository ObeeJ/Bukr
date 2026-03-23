/**
 * INFRASTRUCTURE LAYER - Configuration
 * 
 * Config: The settings manager - where environment variables become useful data
 * 
 * Architecture Layer: Infrastructure (Layer 6)
 * Dependencies: Environment variables
 * Responsibility: Load, parse, and provide configuration to the application
 * 
 * Why a Config struct? Because scattered env::var() calls are a maintenance nightmare
 * Centralize configuration - change once, affect everywhere
 */

#[derive(Clone)]
pub struct Config {
    pub port: u16,
    pub database_url: String,
    pub redis_url: String,
    pub paystack_secret_key: String,
    pub paystack_webhook_secret: String,
    pub jwt_secret: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "8081".to_string())
                .parse()
                .unwrap_or(8081),
            database_url: std::env::var("DATABASE_URL").unwrap_or_default(),
            redis_url: std::env::var("REDIS_URL").unwrap_or_default(),
            paystack_secret_key: std::env::var("PAYSTACK_SECRET_KEY").unwrap_or_default(),
            paystack_webhook_secret: std::env::var("PAYSTACK_WEBHOOK_SECRET").unwrap_or_default(),
            jwt_secret: std::env::var("APP_JWT_SECRET").unwrap_or_default(),
        }
    }
}
