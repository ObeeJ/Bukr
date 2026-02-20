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

use std::env;

/**
 * Config: All the settings Bukr needs to run
 * 
 * Loaded once at startup, cloned and passed to services
 * Clone is cheap because strings are reference-counted
 */
#[derive(Clone)]
pub struct Config {
    pub port: u16,                          // Which port to listen on (default: 8081)
    pub database_url: String,               // PostgreSQL connection string
    pub redis_url: String,                  // Redis connection string (for caching)
    pub paystack_secret_key: String,        // Paystack API key (Nigerian payments)
    pub paystack_webhook_secret: String,    // For verifying Paystack webhooks
    pub stripe_secret_key: String,          // Stripe API key (international payments)
    pub stripe_webhook_secret: String,      // For verifying Stripe webhooks
    pub jwt_secret: String,                 // Supabase JWT secret (for validation)
}

impl Config {
    /**
     * Load configuration from environment variables
     * 
     * Reads from .env file (via dotenvy) or system environment
     * Provides sensible defaults where possible
     * Empty strings for secrets - app will fail gracefully if needed
     * 
     * Pattern: unwrap_or_else for defaults, unwrap_or for empty strings
     * 
     * @returns Config struct with all settings
     */
    pub fn from_env() -> Self {
        Self {
            // Port: Default to 8081 if not set
            // Parse to u16, fallback to 8081 if parsing fails
            port: env::var("PORT")
                .unwrap_or_else(|_| "8081".to_string())
                .parse()
                .unwrap_or(8081),
            
            // Database URL: Empty string if not set
            // App will handle missing database gracefully
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| String::new()),
            
            // Redis URL: Empty string if not set
            // Caching is optional - app works without it
            redis_url: env::var("REDIS_URL")
                .unwrap_or_else(|_| String::new()),
            
            // Paystack secrets: Empty if not set
            // Payment features won't work but app still runs
            paystack_secret_key: env::var("PAYSTACK_SECRET_KEY")
                .unwrap_or_else(|_| String::new()),
            paystack_webhook_secret: env::var("PAYSTACK_WEBHOOK_SECRET")
                .unwrap_or_else(|_| String::new()),
            
            // Stripe secrets: Empty if not set
            // International payments disabled without these
            stripe_secret_key: env::var("STRIPE_SECRET_KEY")
                .unwrap_or_else(|_| String::new()),
            stripe_webhook_secret: env::var("STRIPE_WEBHOOK_SECRET")
                .unwrap_or_else(|_| String::new()),
            
            // JWT secret: Empty if not set
            // Auth won't work without this - but app starts
            jwt_secret: env::var("SUPABASE_JWT_SECRET")
                .unwrap_or_else(|_| String::new()),
        }
    }
}
