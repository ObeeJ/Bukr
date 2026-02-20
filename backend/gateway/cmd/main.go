/**
 * INFRASTRUCTURE LAYER - Application Entry Point
 * 
 * Main: The orchestrator - bootstrapping the Go Gateway
 * 
 * Architecture Layer: Infrastructure (Layer 6)
 * Responsibility: Application startup, dependency injection, routing
 * 
 * Startup Flow:
 * 1. Load environment variables
 * 2. Initialize database and Redis connections
 * 3. Create Fiber app with global middleware
 * 4. Initialize repositories (data access)
 * 5. Initialize services (business logic)
 * 6. Initialize handlers (HTTP controllers)
 * 7. Register routes (public, protected, proxy)
 * 8. Start HTTP server with graceful shutdown
 * 
 * Architecture Pattern: Dependency Injection
 * - Repositories depend on database
 * - Services depend on repositories
 * - Handlers depend on services
 * - Routes compose handlers with middleware
 * 
 * Polyglot Architecture:
 * - Go Gateway: Auth, CRUD (users, events, favorites, influencers)
 * - Rust Core: High-throughput (tickets, payments, scanner, analytics)
 * - Proxy: Seamless forwarding with auth headers
 */

package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/bukr/gateway/internal/events"
	"github.com/bukr/gateway/internal/favorites"
	"github.com/bukr/gateway/internal/influencers"
	"github.com/bukr/gateway/internal/middleware"
	"github.com/bukr/gateway/internal/proxy"
	"github.com/bukr/gateway/internal/shared"
	"github.com/bukr/gateway/internal/users"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
)

/**
 * Main: Application entry point
 * 
 * Bootstraps the entire Go Gateway application
 */
func main() {
	// Load environment variables from .env file
	_ = godotenv.Load("../.env")

	// Load configuration from environment
	cfg := shared.LoadConfig()

	// Initialize database connection pool
	db := shared.NewDatabasePool(cfg.DatabaseURL)
	if db != nil {
		defer db.Close()
	}

	// Initialize Redis client (optional, graceful degradation)
	rdb := shared.NewRedisClient(cfg.RedisURL)
	if rdb != nil {
		defer rdb.Close()
	}

	// Create Fiber application
	app := fiber.New(fiber.Config{
		AppName:      "Bukr Gateway",
		ErrorHandler: globalErrorHandler,
	})

	// Global middleware (applied to all routes)
	app.Use(recover.New())                          // Panic recovery
	app.Use(middleware.RequestLogger())             // Request logging
	app.Use(middleware.SetupCORS(cfg.AllowedOrigins)) // CORS
	
	// Rate limiting - global protection against DDoS
	app.Use(limiter.New(limiter.Config{
		Max:        100,              // 100 requests
		Expiration: 60,               // per 60 seconds
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()             // Rate limit by IP address
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(shared.APIResponse{
				Status: "error",
				Error: &shared.APIError{
					Code:    "RATE_LIMIT_EXCEEDED",
					Message: "Too many requests. Please try again later.",
				},
			})
		},
	}))

	// Health check endpoint
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "bukr-gateway",
		})
	})

	// API v1 base group
	v1 := app.Group("/api/v1")

	// PUBLIC ROUTES (no authentication required)
	
	// Events (public: list, search, get by ID/key)
	eventsPublic := v1.Group("/events")
	eventRepo := events.NewRepository(db)
	eventService := events.NewService(eventRepo)
	eventHandler := events.NewHandler(eventService)
	eventHandler.RegisterPublicRoutes(eventsPublic)

	// PROTECTED ROUTES (authentication required)
	
	// Auth middleware (validates JWT, provisions users)
	auth := middleware.RequireAuth(cfg.SupabaseJWTSecret, db)

	// Users (profile management)
	usersGroup := v1.Group("/users", auth)
	userRepo := users.NewRepository(db)
	userService := users.NewService(userRepo)
	userHandler := users.NewHandler(userService)
	userHandler.RegisterRoutes(usersGroup)

	// Events (protected: create, update, delete, my events)
	eventsProtected := v1.Group("/events", auth)
	eventHandler.RegisterProtectedRoutes(eventsProtected)

	// Favorites (bookmark events)
	favGroup := v1.Group("/favorites", auth)
	favRepo := favorites.NewRepository(db)
	favService := favorites.NewService(favRepo)
	favHandler := favorites.NewHandler(favService)
	favHandler.RegisterRoutes(favGroup)

	// Influencers (organizer only - referral management)
	infGroup := v1.Group("/influencers", auth, middleware.RequireOrganizer())
	infRepo := influencers.NewRepository(db)
	infService := influencers.NewService(infRepo, cfg.AllowedOrigins)
	infHandler := influencers.NewHandler(infService)
	infHandler.RegisterRoutes(infGroup)

	// PROXY ROUTES (forward to Rust Core service)
	
	// Initialize proxy client
	rustProxy := proxy.NewRustProxy(cfg.RustServiceURL)
	proxyHandler := proxy.NewHandler(rustProxy)

	// Tickets (auth required - proxied to Rust)
	// Stricter rate limit for ticket purchases (prevent inventory exhaustion)
	ticketGroup := v1.Group("/tickets", auth, limiter.New(limiter.Config{
		Max:        10,               // 10 requests
		Expiration: 60,               // per 60 seconds
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.Locals("user_id").(string) // Rate limit by user
		},
	}))
	proxyHandler.RegisterTicketRoutes(ticketGroup)

	// Scanner (auth required - proxied to Rust)
	scannerGroup := v1.Group("/scanner", auth)
	proxyHandler.RegisterScannerRoutes(scannerGroup)

	// Payments (auth required for init/verify, webhooks are public)
	paymentGroup := v1.Group("/payments", auth)
	proxyHandler.RegisterPaymentRoutes(paymentGroup)
	proxyHandler.RegisterPaymentWebhooks(v1.Group("/payments")) // Webhooks bypass auth

	// Analytics (organizer only - proxied to Rust)
	analyticsGroup := v1.Group("/analytics", auth, middleware.RequireOrganizer())
	proxyHandler.RegisterAnalyticsRoutes(analyticsGroup)

	// Promo codes (auth required - proxied to Rust)
	promoGroup := v1.Group("/promos", auth)
	proxyHandler.RegisterPromoRoutes(promoGroup)

	// Graceful shutdown handling
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-quit
		log.Println("Shutting down server...")
		app.Shutdown()
	}()

	// Start HTTP server
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Bukr Gateway starting on %s", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

/**
 * globalErrorHandler: Centralized error handling
 * 
 * Converts all errors to consistent API response format
 * Extracts HTTP status code from Fiber errors
 */
func globalErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}

	return c.Status(code).JSON(shared.APIResponse{
		Status: "error",
		Error: &shared.APIError{
			Code:    shared.CodeInternalError,
			Message: err.Error(),
		},
	})
}
