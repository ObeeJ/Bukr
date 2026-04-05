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
	"github.com/bukr/gateway/internal/feedback"
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

	// ── Credits service (constructed early — event creation depends on it) ──────
	creditsRepo := credits.NewRepository(db)
	creditsService := credits.NewService(creditsRepo, cfg.PaystackSecret, cfg.AllowedOrigins)
	creditsHandler := credits.NewHandler(creditsService, cfg.PaystackSecret)

	// ── Public event routes ────────────────────────────────────────────────────
	eventsPublic := v1.Group("/events")
	eventRepo := events.NewRepository(db)
	eventService := events.NewService(eventRepo, rdb)
	eventService.WithCredits(creditsService)
	eventHandler := events.NewHandler(eventService)
	// /me must be registered before /:id to prevent the wildcard swallowing it.
	// It carries auth middleware even though it lives in the public group.
	eventsPublic.Get("/me", userAuth, eventHandler.ListMyEvents)
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
	rustProxy := proxy.NewRustProxy(cfg.RustServiceURL, cfg.GatewaySecret)
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

	// /tickets/event/:event_id exposes all ticket data for an event — organizer only.
	v1.Get("/tickets/event/:event_id", userAuth, middleware.RequireOrganizer(), func(c *fiber.Ctx) error {
		return rustProxy.Forward(c, fmt.Sprintf("/api/v1/tickets/event/%s", c.Params("event_id")))
	})

	scannerGroup := v1.Group("/scanner", userAuth)
	proxyHandler.RegisterScannerRoutes(scannerGroup)

	// ── Payment webhooks (public — no auth) ──────────────────────────────────
	// MUST be registered before any v1.Group("/payments", userAuth) call.
	// Fiber's Group(prefix, middleware) creates a USE handler for the prefix;
	// routes registered BEFORE the USE call bypass it, routes registered AFTER do not.
	// All /payments/webhook/* routes go here — Paystack calls them with no bearer token.
	paymentsWebhookGroup := v1.Group("/payments")
	proxyHandler.RegisterPaymentWebhooks(paymentsWebhookGroup)

	// Credits webhook also on the no-auth group — must be registered here,
	// before paymentGroup creates the USE handler below.
	creditsHandler.RegisterWebhook(paymentsWebhookGroup)

	paymentGroup := v1.Group("/payments", userAuth)
	proxyHandler.RegisterPaymentRoutes(paymentGroup)

	analyticsGroup := v1.Group("/analytics", userAuth, middleware.RequireOrganizer())
	proxyHandler.RegisterAnalyticsRoutes(analyticsGroup)

	// Promo management (organizer only) — create, list, delete, toggle
	promoGroup := v1.Group("/promos", userAuth, middleware.RequireOrganizer())
	proxyHandler.RegisterPromoRoutes(promoGroup)
	// Promo validation is called during checkout by any authenticated user
	v1.Post("/promos/validate", userAuth, func(c *fiber.Ctx) error {
		return rustProxy.Forward(c, "/api/v1/promos/validate")
	})

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

	creditsGroup := v1.Group("/credits", userAuth, middleware.RequireOrganizer())
	creditsHandler.RegisterRoutes(creditsGroup)

	// ── Notifications ────────────────────────────────────────────────────────────
	notifHandler := notifications.NewHandler(db)
	notifGroup := v1.Group("/notifications", userAuth)
	notifHandler.RegisterRoutes(notifGroup)

	// ── Feedback & Waitlist ────────────────────────────────────────────────────
	// Waitlist is public; feedback requires auth; admin read requires admin token.
	feedbackHandler := feedback.NewHandler(db)
	feedbackHandler.RegisterRoutes(
		v1,                                      // public  — POST /waitlist
		v1.Group("/feedback", userAuth),         // protected — POST /feedback
		v1.Group("/admin", adminAuth),           // admin — GET /admin/feedback
	)

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
