package main

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/bukr/gateway/internal/admin"
	"github.com/bukr/gateway/internal/credits"
	"github.com/bukr/gateway/internal/events"
	"github.com/bukr/gateway/internal/favorites"
	"github.com/bukr/gateway/internal/influencer_portal"
	"github.com/bukr/gateway/internal/influencers"
	"github.com/bukr/gateway/internal/middleware"
	"github.com/bukr/gateway/internal/notifications"
	"github.com/bukr/gateway/internal/proxy"
	"github.com/bukr/gateway/internal/shared"
	"github.com/bukr/gateway/internal/users"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/recover"
	redisStorage "github.com/gofiber/storage/redis/v3"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load("../.env")
	cfg := shared.LoadConfig()

	db := shared.NewDatabasePool(cfg.DatabaseURL)
	if db != nil {
		defer db.Close()
	}

	var pubKey *ecdsa.PublicKey
	if cfg.SupabaseURL != "" {
		key, err := middleware.FetchSupabasePublicKey(cfg.SupabaseURL)
		if err != nil {
			log.Printf("WARNING: Failed to fetch Supabase public key: %v — auth endpoints will return 503", err)
		} else {
			pubKey = key
			log.Println("Supabase EC public key loaded")
		}
	} else {
		log.Println("WARNING: SUPABASE_URL not set — auth endpoints disabled")
	}

	rdb := shared.NewRedisClient(cfg.RedisURL)
	if rdb != nil {
		defer rdb.Close()
	}

	workerCtx, cancelWorker := context.WithCancel(context.Background())
	defer cancelWorker()
	notifications.NewWorker(db, rdb).Start(workerCtx)

	app := fiber.New(fiber.Config{
		AppName:      "Bukr Gateway",
		ErrorHandler: globalErrorHandler,
	})

	app.Use(recover.New())
	app.Use(middleware.RequestLogger())
	app.Use(middleware.SetupCORS(cfg.AllowedOrigins))
	app.Use(middleware.SecurityHeaders())

	// Rate limiter backed by Redis so the limit is shared across all gateway
	// instances. Without Redis, each instance would have its own counter and
	// the effective limit would be N * 100 per IP under a load balancer.
	var limiterStore fiber.Storage
	if cfg.RedisURL != "" {
		limiterStore = redisStorage.New(redisStorage.Config{URL: cfg.RedisURL})
	}
	app.Use(limiter.New(limiter.Config{
		Max:        100,
		Expiration: 60,
		Storage:    limiterStore, // nil = in-memory (fine for single-instance dev)
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
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

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "bukr-gateway"})
	})

	v1 := app.Group("/api/v1")

	// PUBLIC ROUTES
	eventsPublic := v1.Group("/events")
	eventRepo := events.NewRepository(db)
	// Pass rdb so the service can cache event lists and individual events.
	eventService := events.NewService(eventRepo, rdb)
	eventHandler := events.NewHandler(eventService)
	eventHandler.RegisterPublicRoutes(eventsPublic)

	// PROTECTED ROUTES
	// Pass rdb to RequireAuth so user resolution uses the two-layer cache.
	auth := middleware.RequireAuth(pubKey, db, rdb)

	usersGroup := v1.Group("/users", auth)
	userRepo := users.NewRepository(db)
	userService := users.NewService(userRepo)
	userHandler := users.NewHandler(userService)
	userHandler.RegisterRoutes(usersGroup)

	eventsProtected := v1.Group("/events", auth)
	eventHandler.RegisterProtectedRoutes(eventsProtected)

	favGroup := v1.Group("/favorites", auth)
	favRepo := favorites.NewRepository(db)
	favService := favorites.NewService(favRepo)
	favHandler := favorites.NewHandler(favService)
	favHandler.RegisterRoutes(favGroup)

	infGroup := v1.Group("/influencers", auth, middleware.RequireOrganizer())
	infRepo := influencers.NewRepository(db)
	infService := influencers.NewService(infRepo, cfg.AllowedOrigins)
	infHandler := influencers.NewHandler(infService)
	infHandler.RegisterRoutes(infGroup)

	// PROXY ROUTES
	rustProxy := proxy.NewRustProxy(cfg.RustServiceURL)
	proxyHandler := proxy.NewHandler(rustProxy)

	// Ticket rate limiter: per-user, Redis-backed when available.
	var ticketLimiterStore fiber.Storage
	if cfg.RedisURL != "" {
		ticketLimiterStore = redisStorage.New(redisStorage.Config{URL: cfg.RedisURL})
	}
	ticketGroup := v1.Group("/tickets", auth, limiter.New(limiter.Config{
		Max:        10,
		Expiration: 60,
		Storage:    ticketLimiterStore,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.Locals("user_id").(string)
		},
	}))
	proxyHandler.RegisterTicketRoutes(ticketGroup)

	scannerGroup := v1.Group("/scanner", auth)
	proxyHandler.RegisterScannerRoutes(scannerGroup)

	paymentGroup := v1.Group("/payments", auth)
	proxyHandler.RegisterPaymentRoutes(paymentGroup)
	proxyHandler.RegisterPaymentWebhooks(v1.Group("/payments"))

	analyticsGroup := v1.Group("/analytics", auth, middleware.RequireOrganizer())
	proxyHandler.RegisterAnalyticsRoutes(analyticsGroup)

	promoGroup := v1.Group("/promos", auth)
	proxyHandler.RegisterPromoRoutes(promoGroup)

	vendorPublic := v1.Group("/vendors")
	proxyHandler.RegisterVendorPublicRoutes(vendorPublic)

	vendorProtected := v1.Group("/vendors", auth)
	proxyHandler.RegisterVendorProtectedRoutes(vendorProtected)

	hireGroup := v1.Group("/vendor-hires", auth)
	proxyHandler.RegisterHireRoutes(hireGroup)

	reviewGroup := v1.Group("/vendor-reviews", auth, middleware.RequireOrganizer())
	proxyHandler.RegisterVendorReviewRoutes(reviewGroup)

	inviteGroup := v1.Group("/vendor-invitations", auth)
	proxyHandler.RegisterVendorInvitationRoutes(inviteGroup)

	vendorSelf := v1.Group("/vendor/me", auth)
	proxyHandler.RegisterVendorSelfRoutes(vendorSelf)

	infPortalRepo := influencer_portal.NewRepository(db, cfg.AllowedOrigins)
	infPortalHandler := influencer_portal.NewHandler(infPortalRepo)
	infPortalGroup := v1.Group("/influencer", auth)
	infPortalHandler.RegisterRoutes(infPortalGroup)
	infPortalHandler.RegisterClaimRoute(infPortalGroup)

	paystackSecret := cfg.PaystackSecret
	creditsRepo := credits.NewRepository(db)
	creditsService := credits.NewService(creditsRepo, paystackSecret, cfg.AllowedOrigins)
	creditsHandler := credits.NewHandler(creditsService, paystackSecret)
	creditsGroup := v1.Group("/credits", auth, middleware.RequireOrganizer())
	creditsHandler.RegisterRoutes(creditsGroup)
	creditsHandler.RegisterWebhook(v1.Group("/payments"))

	adminGroup := v1.Group("/admin", auth, middleware.RequireAdmin())
	adminHandler := admin.NewHandler(db)
	adminHandler.RegisterRoutes(adminGroup)

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
