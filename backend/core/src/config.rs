use std::env;

#[derive(Clone)]
pub struct Config {
    pub port: u16,
    pub database_url: String,
    pub redis_url: String,
    pub paystack_secret_key: String,
    pub paystack_webhook_secret: String,
    pub stripe_secret_key: String,
    pub stripe_webhook_secret: String,
    pub jwt_secret: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            port: env::var("PORT")
                .unwrap_or_else(|_| "8081".to_string())
                .parse()
                .unwrap_or(8081),
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| String::new()),
            redis_url: env::var("REDIS_URL")
                .unwrap_or_else(|_| String::new()),
            paystack_secret_key: env::var("PAYSTACK_SECRET_KEY")
                .unwrap_or_else(|_| String::new()),
            paystack_webhook_secret: env::var("PAYSTACK_WEBHOOK_SECRET")
                .unwrap_or_else(|_| String::new()),
            stripe_secret_key: env::var("STRIPE_SECRET_KEY")
                .unwrap_or_else(|_| String::new()),
            stripe_webhook_secret: env::var("STRIPE_WEBHOOK_SECRET")
                .unwrap_or_else(|_| String::new()),
            jwt_secret: env::var("SUPABASE_JWT_SECRET")
                .unwrap_or_else(|_| String::new()),
        }
    }
}
