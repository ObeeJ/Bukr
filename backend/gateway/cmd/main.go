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
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file (ignore error if file doesn't exist in production)
	_ = godotenv.Load("../.env")

	cfg := shared.LoadConfig()

	// Database
	db := shared.NewDatabasePool(cfg.DatabaseURL)
	if db != nil {
		defer db.Close()
	}

	// Redis
	rdb := shared.NewRedisClient(cfg.RedisURL)
	if rdb != nil {
		defer rdb.Close()
	}

	// Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "Bukr Gateway",
		ErrorHandler: globalErrorHandler,
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(middleware.RequestLogger())
	app.Use(middleware.SetupCORS(cfg.AllowedOrigins))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "bukr-gateway",
		})
	})

	// API v1 routes
	v1 := app.Group("/api/v1")

	// --- Public routes (no auth) ---
	eventsPublic := v1.Group("/events")
	eventRepo := events.NewRepository(db)
	eventService := events.NewService(eventRepo)
	eventHandler := events.NewHandler(eventService)
	eventHandler.RegisterPublicRoutes(eventsPublic)

	// --- Protected routes (auth required) ---
	auth := middleware.RequireAuth(cfg.SupabaseJWTSecret, db)

	// Users
	usersGroup := v1.Group("/users", auth)
	userRepo := users.NewRepository(db)
	userService := users.NewService(userRepo)
	userHandler := users.NewHandler(userService)
	userHandler.RegisterRoutes(usersGroup)

	// Events (protected: create, update, delete, my events)
	eventsProtected := v1.Group("/events", auth)
	eventHandler.RegisterProtectedRoutes(eventsProtected)

	// Favorites
	favGroup := v1.Group("/favorites", auth)
	favRepo := favorites.NewRepository(db)
	favService := favorites.NewService(favRepo)
	favHandler := favorites.NewHandler(favService)
	favHandler.RegisterRoutes(favGroup)

	// Influencers (organizer only)
	infGroup := v1.Group("/influencers", auth, middleware.RequireOrganizer())
	infRepo := influencers.NewRepository(db)
	infService := influencers.NewService(infRepo, cfg.AllowedOrigins)
	infHandler := influencers.NewHandler(infService)
	infHandler.RegisterRoutes(infGroup)

	// --- Proxy routes to Rust core service ---
	rustProxy := proxy.NewRustProxy(cfg.RustServiceURL)
	proxyHandler := proxy.NewHandler(rustProxy)

	// Tickets (auth required)
	ticketGroup := v1.Group("/tickets", auth)
	proxyHandler.RegisterTicketRoutes(ticketGroup)

	// Scanner (auth required)
	scannerGroup := v1.Group("/scanner", auth)
	proxyHandler.RegisterScannerRoutes(scannerGroup)

	// Payments (auth required for init/verify, webhooks are public)
	paymentGroup := v1.Group("/payments", auth)
	proxyHandler.RegisterPaymentRoutes(paymentGroup)
	proxyHandler.RegisterPaymentWebhooks(v1.Group("/payments")) // no auth for webhooks

	// Analytics (auth required, organizer only)
	analyticsGroup := v1.Group("/analytics", auth, middleware.RequireOrganizer())
	proxyHandler.RegisterAnalyticsRoutes(analyticsGroup)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-quit
		log.Println("Shutting down server...")
		app.Shutdown()
	}()

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Bukr Gateway starting on %s", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

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
