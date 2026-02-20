/**
 * INFRASTRUCTURE LAYER - Configuration
 * 
 * Config: The settings loader - turning environment variables into useful configuration
 * 
 * Architecture Layer: Infrastructure (Layer 6)
 * Dependencies: Environment variables
 * Responsibility: Load and provide application configuration
 * 
 * Why centralize config? Because scattered os.Getenv() calls are a nightmare
 * Change a variable name? Update it once here, not in 20 files
 */

package shared

import (
	"log"
	"os"
)

/**
 * Config: All the settings the Go gateway needs
 * 
 * Loaded once at startup, passed to all modules
 * Contains connection strings, secrets, and feature flags
 */
type Config struct {
	Port             string  // HTTP port to listen on (default: 8080)
	SupabaseURL      string  // Supabase project URL
	SupabaseKey      string  // Supabase service role key (admin access)
	SupabaseJWTSecret string // JWT secret for token validation
	DatabaseURL      string  // PostgreSQL connection string
	RedisURL         string  // Redis connection string (for caching)
	RustServiceURL   string  // Internal URL to Rust core service
	AllowedOrigins   string  // CORS allowed origins (comma-separated)
	LogLevel         string  // Logging level (debug, info, warn, error)
}

/**
 * LoadConfig: Load configuration from environment variables
 * 
 * Reads from .env file (via godotenv) or system environment
 * Provides sensible defaults for development
 * Logs warnings for missing critical config
 * 
 * Pattern: getEnv(key, default) for each setting
 * 
 * @returns Populated Config struct
 */
func LoadConfig() *Config {
	cfg := &Config{
		// Server port - default to 8080 for development
		Port:             getEnv("PORT", "8080"),
		
		// Supabase configuration - empty defaults (will fail gracefully)
		SupabaseURL:      getEnv("SUPABASE_URL", ""),
		SupabaseKey:      getEnv("SUPABASE_SERVICE_KEY", ""),
		SupabaseJWTSecret: getEnv("SUPABASE_JWT_SECRET", ""),
		
		// Database URL - empty default (app can run without DB in dev mode)
		DatabaseURL:      getEnv("DATABASE_URL", ""),
		
		// Redis URL - empty default (caching is optional)
		RedisURL:         getEnv("REDIS_URL", ""),
		
		// Rust service URL - default to localhost for development
		RustServiceURL:   getEnv("RUST_SERVICE_URL", "http://localhost:8081"),
		
		// CORS origins - default to local dev frontend
		AllowedOrigins:   getEnv("ALLOWED_ORIGINS", "http://localhost:5173"),
		
		// Log level - default to info (not too verbose, not too quiet)
		LogLevel:         getEnv("LOG_LEVEL", "info"),
	}

	// Warn if database URL is missing - app will work but with limited features
	if cfg.DatabaseURL == "" {
		log.Println("WARNING: DATABASE_URL not set, database features will be unavailable")
	}

	return cfg
}

/**
 * getEnv: Helper to get environment variable with fallback
 * 
 * Checks if environment variable exists
 * Returns its value if present, fallback if not
 * 
 * @param key - Environment variable name
 * @param fallback - Default value if variable not set
 * @returns Variable value or fallback
 */
func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
