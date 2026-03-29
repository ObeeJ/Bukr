/**
 * INFRASTRUCTURE LAYER - Configuration
 *
 * Config: The settings manager — env vars become typed, validated config.
 *
 * In production (APP_ENV=production) the service panics on startup if any
 * critical secret is missing. Fail loud at boot, not silently at runtime.
 */

#[derive(Clone)]
pub struct Config {
    pub port: u16,
    pub database_url: String,
    pub redis_url: String,
    pub paystack_secret_key: String,
    pub paystack_webhook_secret: String,
    pub jwt_secret: String,
    pub qr_hmac_secret: String,
}

impl Config {
    pub fn from_env() -> Self {
        let cfg = Self {
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "8081".to_string())
                .parse()
                .unwrap_or(8081),
            database_url: std::env::var("DATABASE_URL").unwrap_or_default(),
            redis_url: std::env::var("REDIS_URL").unwrap_or_default(),
            paystack_secret_key: std::env::var("PAYSTACK_SECRET_KEY").unwrap_or_default(),
            paystack_webhook_secret: std::env::var("PAYSTACK_WEBHOOK_SECRET").unwrap_or_default(),
            jwt_secret: std::env::var("APP_JWT_SECRET").unwrap_or_default(),
            qr_hmac_secret: std::env::var("QR_HMAC_SECRET").unwrap_or_default(),
        };

        // Fail loud at boot in production — an empty secret is worse than a crash.
        if std::env::var("APP_ENV").unwrap_or_default() == "production" {
            let required: &[(&str, &str)] = &[
                ("DATABASE_URL", &cfg.database_url),
                ("APP_JWT_SECRET", &cfg.jwt_secret),
                ("QR_HMAC_SECRET", &cfg.qr_hmac_secret),
                ("PAYSTACK_SECRET_KEY", &cfg.paystack_secret_key),
                ("PAYSTACK_WEBHOOK_SECRET", &cfg.paystack_webhook_secret),
            ];
            for (name, val) in required {
                if val.is_empty() {
                    panic!("FATAL: {} is required in production but is not set", name);
                }
            }
        }

        cfg
    }
}
