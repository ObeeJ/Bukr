package shared

import (
	"log"
	"os"
)

type Config struct {
	Port             string
	SupabaseURL      string
	SupabaseKey      string
	SupabaseJWTSecret string
	DatabaseURL      string
	RedisURL         string
	RustServiceURL   string
	AllowedOrigins   string
	LogLevel         string
}

func LoadConfig() *Config {
	cfg := &Config{
		Port:             getEnv("PORT", "8080"),
		SupabaseURL:      getEnv("SUPABASE_URL", ""),
		SupabaseKey:      getEnv("SUPABASE_SERVICE_KEY", ""),
		SupabaseJWTSecret: getEnv("SUPABASE_JWT_SECRET", ""),
		DatabaseURL:      getEnv("DATABASE_URL", ""),
		RedisURL:         getEnv("REDIS_URL", ""),
		RustServiceURL:   getEnv("RUST_SERVICE_URL", "http://localhost:8081"),
		AllowedOrigins:   getEnv("ALLOWED_ORIGINS", "http://localhost:5173"),
		LogLevel:         getEnv("LOG_LEVEL", "info"),
	}

	if cfg.DatabaseURL == "" {
		log.Println("WARNING: DATABASE_URL not set, database features will be unavailable")
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
