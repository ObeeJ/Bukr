package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/bukr/gateway/internal/admin"
	"github.com/bukr/gateway/internal/auth"
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

	var limiterStore fiber.Storage
	if cfg.RedisURL != "" {
		limiterStore = redisStorage.New(redisStorage.Config{URL: cfg.RedisURL})
	}
	app.Use(limiter.New(limiter.Config{
		Max:        100,
		Expiration: 60,
		Storage:    limiterStore,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(shared.APIResponse{
				Status: "error",
				Error: &shared.APIError{
					Code:    shared.CodeRateLimited,
					Message: "Too many requests. Please try again later.",
				},
			})
		},
	}))

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "bukr-gateway"})
	})

	v1 := app.Group("/api/v1")

	// ── Auth (public) ──────────────────────────────────────────────────────────
	mailer := auth.NewMailer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPass, cfg.EmailFromName)
	authRepo := auth.NewRepository(db)
	authSvc := auth.NewService(authRepo, mailer, rdb, cfg.AppJWTSecret, cfg.AdminJWTSecret)
	authHandler := auth.NewHandler(authSvc)
	authHandler.RegisterRoutes(v1.Group("/auth"))

	// ── Admin auth (public — no middleware, issues its own tokens) ─────────────
	authHandler.RegisterAdminRoutes(v1.Group("/admin/auth"))

	// ── Middleware factories ───────────────────────────────────────────────────
	userAuth  := middleware.RequireAuth(cfg.AppJWTSecret, rdb)
	adminAuth := middleware.RequireAdmin(cfg.AdminJWTSecret, rdb)

	// ── Public event routes ────────────────────────────────────────────────────
	eventsPublic := v1.Group("/events")
	eventRepo := events.NewRepository(db)
	eventService := events.NewService(eventRepo, rdb)
	eventHandler := events.NewHandler(eventService)
	eventHandler.RegisterPublicRoutes(eventsPublic)

	// ── Protected user routes ──────────────────────────────────────────────────
	usersGroup := v1.Group("/users", userAuth)
	userRepo := users.NewRepository(db)
	userService := users.NewService(userRepo)
	userHandler := users.NewHandler(userService)
	userHandler.RegisterRoutes(usersGroup)

	eventsProtected := v1.Group("/events", userAuth)
	eventHandler.RegisterProtectedRoutes(eventsProtected)

	favGroup := v1.Group("/favorites", userAuth)
	favRepo := favorites.NewRepository(db)
	favService := favorites.NewService(favRepo)
	favHandler := favorites.NewHandler(favService)
	favHandler.RegisterRoutes(favGroup)

	infGroup := v1.Group("/influencers", userAuth, middleware.RequireOrganizer())
	infRepo := influencers.NewRepository(db)
	infService := influencers.NewService(infRepo, cfg.AllowedOrigins)
	infHandler := influencers.NewHandler(infService)
	infHandler.RegisterRoutes(infGroup)

	// ── Proxy routes (Rust core) ───────────────────────────────────────────────
	rustProxy := proxy.NewRustProxy(cfg.RustServiceURL)
	proxyHandler := proxy.NewHandler(rustProxy)

	var ticketLimiterStore fiber.Storage
	if cfg.RedisURL != "" {
		ticketLimiterStore = redisStorage.New(redisStorage.Config{URL: cfg.RedisURL})
	}
	ticketGroup := v1.Group("/tickets", userAuth, limiter.New(limiter.Config{
		Max:        10,
		Expiration: 60,
		Storage:    ticketLimiterStore,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.Locals("user_id").(string)
		},
	}))
	proxyHandler.RegisterTicketRoutes(ticketGroup)

	scannerGroup := v1.Group("/scanner", userAuth)
	proxyHandler.RegisterScannerRoutes(scannerGroup)

	paymentGroup := v1.Group("/payments", userAuth)
	proxyHandler.RegisterPaymentRoutes(paymentGroup)
	proxyHandler.RegisterPaymentWebhooks(v1.Group("/payments"))

	analyticsGroup := v1.Group("/analytics", userAuth, middleware.RequireOrganizer())
	proxyHandler.RegisterAnalyticsRoutes(analyticsGroup)

	promoGroup := v1.Group("/promos", userAuth)
	proxyHandler.RegisterPromoRoutes(promoGroup)

	vendorPublic := v1.Group("/vendors")
	proxyHandler.RegisterVendorPublicRoutes(vendorPublic)

	vendorProtected := v1.Group("/vendors", userAuth)
	proxyHandler.RegisterVendorProtectedRoutes(vendorProtected)

	hireGroup := v1.Group("/vendor-hires", userAuth)
	proxyHandler.RegisterHireRoutes(hireGroup)

	reviewGroup := v1.Group("/vendor-reviews", userAuth, middleware.RequireOrganizer())
	proxyHandler.RegisterVendorReviewRoutes(reviewGroup)

	inviteGroup := v1.Group("/vendor-invitations", userAuth)
	proxyHandler.RegisterVendorInvitationRoutes(inviteGroup)

	vendorSelf := v1.Group("/vendor/me", userAuth)
	proxyHandler.RegisterVendorSelfRoutes(vendorSelf)

	infPortalRepo := influencer_portal.NewRepository(db, cfg.AllowedOrigins)
	infPortalHandler := influencer_portal.NewHandler(infPortalRepo)
	infPortalGroup := v1.Group("/influencer", userAuth)
	infPortalHandler.RegisterRoutes(infPortalGroup)
	infPortalHandler.RegisterClaimRoute(infPortalGroup)

	creditsRepo := credits.NewRepository(db)
	creditsService := credits.NewService(creditsRepo, cfg.PaystackSecret, cfg.AllowedOrigins)
	creditsHandler := credits.NewHandler(creditsService, cfg.PaystackSecret)
	creditsGroup := v1.Group("/credits", userAuth, middleware.RequireOrganizer())
	creditsHandler.RegisterRoutes(creditsGroup)
	creditsHandler.RegisterWebhook(v1.Group("/payments"))

	// ── Admin routes (separate secret) ────────────────────────────────────────
	adminGroup := v1.Group("/admin", adminAuth)
	adminHandler := admin.NewHandler(db)
	adminHandler.RegisterRoutes(adminGroup)

	// ── Graceful shutdown ──────────────────────────────────────────────────────
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
