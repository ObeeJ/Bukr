package shared

import (
	"log"
	"os"
)

// Config holds all runtime configuration for the Go gateway.
type Config struct {
	Port            string
	DatabaseURL     string
	RedisURL        string
	RustServiceURL  string
	AllowedOrigins  string
	LogLevel        string
	PaystackSecret  string
	GatewaySecret   string

	// JWT secrets — different keys make user and admin tokens cryptographically separate.
	AppJWTSecret   string // signs user access tokens (HS256)
	AdminJWTSecret string // signs admin access tokens (HS256)

	// SMTP — Gmail STARTTLS on port 587.
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPass     string
	EmailFromName string
}

func LoadConfig() *Config {
	cfg := &Config{
		Port:           getEnv("PORT", "8080"),
		DatabaseURL:    getEnv("DATABASE_URL", ""),
		RedisURL:       getEnv("REDIS_URL", ""),
		RustServiceURL: getEnv("RUST_SERVICE_URL", "http://localhost:8081"),
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "http://localhost:5173"),
		LogLevel:       getEnv("LOG_LEVEL", "info"),
		PaystackSecret: getEnv("PAYSTACK_SECRET_KEY", ""),
		GatewaySecret:  getEnv("GATEWAY_SECRET", ""),

		AppJWTSecret:   getEnv("APP_JWT_SECRET", ""),
		AdminJWTSecret: getEnv("ADMIN_JWT_SECRET", ""),

		SMTPHost:      getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:      getEnv("SMTP_PORT", "587"),
		SMTPUser:      getEnv("SMTP_USER", ""),
		SMTPPass:      getEnv("SMTP_PASS", ""),
		EmailFromName: getEnv("EMAIL_FROM_NAME", "Bukr"),
	}

	if cfg.DatabaseURL == "" {
		log.Println("WARNING: DATABASE_URL not set")
	}

	if os.Getenv("APP_ENV") == "production" {
		fatal := func(msg string) { log.Fatal("FATAL: " + msg) }
		if cfg.AppJWTSecret == "" {
			fatal("APP_JWT_SECRET is required in production")
		}
		if cfg.AdminJWTSecret == "" {
			fatal("ADMIN_JWT_SECRET is required in production")
		}
		if cfg.DatabaseURL == "" {
			fatal("DATABASE_URL is required in production")
		}
		if cfg.SMTPUser == "" || cfg.SMTPPass == "" {
			fatal("SMTP_USER and SMTP_PASS are required in production")
		}
		if cfg.PaystackSecret == "" {
			fatal("PAYSTACK_SECRET_KEY is required in production")
		}
		if cfg.GatewaySecret == "" {
			fatal("GATEWAY_SECRET is required in production")
		}
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
