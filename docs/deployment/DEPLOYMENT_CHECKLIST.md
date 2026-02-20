# PRODUCTION DEPLOYMENT CHECKLIST

## 🔴 CRITICAL BLOCKERS (P0) - MUST FIX BEFORE ANY DEPLOYMENT

### 1. Build Failure ⚠️ IN PROGRESS
- [x] Identified issue: Inline JSX comments in 20+ files
- [x] Fixed: SignIn.tsx
- [ ] Fix remaining files (run `./fix-jsx-comments.sh` for list)
- [ ] Verify build: `npm run build`
- [ ] Verify dev server: `npm run dev`

**Files Needing Fixes:**
```
src/components/TicketCard.tsx
src/components/BookingModal.tsx
src/components/EventCard.tsx
src/components/TicketScanner.tsx
src/components/EventCollaborators.tsx
src/components/FlierUpload.tsx
src/components/BrandMarquee.tsx
src/components/AnimatedLogo.tsx
src/components/EmptyState.tsx
src/components/AuthModal.tsx
src/components/PromoCodeManager.tsx
src/components/CreateEventModal.tsx
src/components/FavoriteButton.tsx
src/components/BookingFlow.tsx
src/components/ui/sidebar.tsx
src/components/events/PublicEventView.tsx
src/components/events/SeatingMap.tsx
src/components/events/OrganizerEventView.tsx
src/pages/SignUp.tsx
src/pages/Landing.tsx
src/pages/Events.tsx
src/pages/MyEvents.tsx
```

---

### 2. Credential Security ⚠️ URGENT
- [ ] Rotate Supabase service key
- [ ] Rotate Supabase JWT secret
- [ ] Change database password
- [ ] Regenerate Paystack API keys
- [ ] Regenerate Stripe API keys
- [ ] Setup AWS Secrets Manager or HashiCorp Vault
- [ ] Update deployment scripts to pull from secret manager
- [ ] Verify `.env` files are in `.gitignore` (✅ already done)
- [ ] Audit git history for leaked secrets

**Commands:**
```bash
# Check if secrets were ever committed
git log --all --full-history --source -- backend/.env
git log --all --full-history --source -- .env

# If found, use git-filter-repo to remove
# pip install git-filter-repo
# git filter-repo --path backend/.env --invert-paths
```

---

### 3. Payment System Completion
- [ ] Implement Stripe Checkout Session API
  - [ ] Create session endpoint
  - [ ] Handle success/cancel callbacks
  - [ ] Store session ID in database
- [ ] Implement payment verification
  - [ ] Verify Paystack payments
  - [ ] Verify Stripe payments
  - [ ] Update ticket status on success
- [ ] Add webhook idempotency
  - [ ] Create `webhook_log` table
  - [ ] Check webhook ID before processing
  - [ ] Store webhook payload for audit
- [ ] Implement refund handling
  - [ ] Paystack refund API
  - [ ] Stripe refund API
  - [ ] Update ticket status
- [ ] Add payment reconciliation
  - [ ] Daily payment report
  - [ ] Match with bank statements
  - [ ] Flag discrepancies

**Files to Modify:**
- `backend/core/src/payments/service.rs`
- `backend/core/src/payments/handler.rs`
- `backend/migrations/011_create_webhook_log.sql` (new)

---

### 4. Race Condition Fix - Ticket Overselling
- [ ] Wrap ticket purchase in database transaction
- [ ] Use `SELECT FOR UPDATE` to lock event row
- [ ] Test concurrent purchases (load test)
- [ ] Add integration test for race condition

**Code Changes:**
```rust
// backend/core/src/tickets/service.rs
pub async fn purchase(&self, user_id: Uuid, req: PurchaseTicketRequest) -> Result<PurchaseResponse> {
    // Start transaction
    let mut tx = self.repo.pool().begin().await?;
    
    // Lock the event row
    let available = sqlx::query_scalar::<_, i32>(
        "SELECT available_tickets FROM events WHERE id = $1 FOR UPDATE"
    )
    .bind(req.event_id)
    .fetch_one(&mut *tx)
    .await?;
    
    // Check availability
    if available < req.quantity {
        tx.rollback().await?;
        return Err(AppError::TicketsExhausted);
    }
    
    // Create ticket within transaction
    // ... rest of logic
    
    // Commit transaction
    tx.commit().await?;
    Ok(response)
}
```

---

### 5. Rate Limiting Implementation
- [ ] Add global rate limiter (100 req/min per IP)
- [ ] Add endpoint-specific limits:
  - [ ] Auth endpoints: 5 attempts/min
  - [ ] Ticket purchase: 10/min
  - [ ] Payment init: 10/min
  - [ ] Webhook: 100/min (with signature verification)
- [ ] Add Redis for distributed rate limiting
- [ ] Add rate limit headers (X-RateLimit-*)
- [ ] Return 429 Too Many Requests with Retry-After

**Go Gateway:**
```go
import "github.com/gofiber/fiber/v2/middleware/limiter"

// Global limiter
app.Use(limiter.New(limiter.Config{
    Max:        100,
    Expiration: 1 * time.Minute,
    Storage:    rdb, // Redis storage
}))

// Auth endpoints
authGroup.Use(limiter.New(limiter.Config{
    Max:        5,
    Expiration: 1 * time.Minute,
}))
```

**Rust Core:**
```rust
use tower::limit::RateLimitLayer;
use std::time::Duration;

let rate_limit = RateLimitLayer::new(100, Duration::from_secs(60));
Router::new()
    .route("/tickets/purchase", post(purchase_ticket))
    .layer(rate_limit)
```

---

## 🟡 HIGH PRIORITY (P1) - FIX BEFORE PRODUCTION

### 6. Observability Setup
- [ ] Replace console.log with structured logging
  - [ ] Frontend: Use proper logger (e.g., `loglevel`)
  - [ ] Backend: Use `tracing` with JSON formatter
- [ ] Setup error tracking
  - [ ] Integrate Sentry (frontend + backend)
  - [ ] Add source maps for frontend
  - [ ] Add context to errors (user ID, request ID)
- [ ] Add request tracing
  - [ ] Generate correlation IDs
  - [ ] Pass through all services
  - [ ] Log at entry/exit points
- [ ] Setup APM
  - [ ] New Relic or Datadog
  - [ ] Track endpoint performance
  - [ ] Monitor database queries
- [ ] Create dashboards
  - [ ] Request rate
  - [ ] Error rate
  - [ ] Response times
  - [ ] Payment success rate

---

### 7. Input Validation
- [ ] Validate event creation
  - [ ] Price must be >= 0
  - [ ] Date must be in future
  - [ ] Available tickets must be > 0
- [ ] Validate ticket purchase
  - [ ] Quantity 1-10
  - [ ] Event must be active
  - [ ] Excitement rating 1-5 (if provided)
- [ ] Validate promo codes
  - [ ] Discount 0-100%
  - [ ] Valid date range
  - [ ] Usage limit >= 0
- [ ] Validate user input
  - [ ] Email format
  - [ ] Phone format (if provided)
  - [ ] Name length limits
- [ ] Add validation library
  - [ ] Frontend: Zod (already installed)
  - [ ] Backend: validator crate

---

### 8. Authentication Hardening
- [ ] Implement token revocation
  - [ ] Create Redis blacklist
  - [ ] Add logout endpoint
  - [ ] Check blacklist on auth
- [ ] Add session management
  - [ ] Track active sessions
  - [ ] Limit concurrent sessions
  - [ ] Add device fingerprinting
- [ ] Implement role verification
  - [ ] Admin approval for organizer role
  - [ ] Email verification for role change
  - [ ] Audit log for role changes
- [ ] Add security monitoring
  - [ ] Log failed login attempts
  - [ ] Alert on suspicious activity
  - [ ] Implement account lockout

---

### 9. Backup & Disaster Recovery
- [ ] Enable Supabase automated backups
- [ ] Setup backup verification
  - [ ] Daily backup check
  - [ ] Weekly restore test
  - [ ] Document restore procedure
- [ ] Define RTO/RPO
  - [ ] Recovery Time Objective: ___
  - [ ] Recovery Point Objective: ___
- [ ] Create disaster recovery plan
  - [ ] Incident response procedures
  - [ ] Communication plan
  - [ ] Escalation matrix
- [ ] Test disaster recovery
  - [ ] Simulate database failure
  - [ ] Restore from backup
  - [ ] Verify data integrity

---

### 10. Error Handling
- [ ] Remove all `unwrap()` calls in Rust
- [ ] Add proper error propagation
- [ ] Implement graceful degradation
- [ ] Add fallback mechanisms
- [ ] Test error scenarios

---

## 🟢 MEDIUM PRIORITY (P2) - FIX SOON

### 11. Testing
- [ ] Write unit tests (70% coverage goal)
  - [ ] Ticket purchase logic
  - [ ] Payment processing
  - [ ] Promo code validation
  - [ ] Authentication flow
- [ ] Write integration tests
  - [ ] API endpoint tests
  - [ ] Database transaction tests
  - [ ] External API mocks
- [ ] Write E2E tests
  - [ ] User signup/login
  - [ ] Event creation
  - [ ] Ticket purchase flow
  - [ ] Scanner validation
- [ ] Setup test automation
  - [ ] Run tests on PR
  - [ ] Block merge if tests fail
  - [ ] Coverage reporting

---

### 12. CI/CD Pipeline
- [ ] Create GitHub Actions workflow
  - [ ] Run tests on push
  - [ ] Build Docker images
  - [ ] Security scanning
  - [ ] Deploy to staging
- [ ] Setup staging environment
  - [ ] Separate database
  - [ ] Separate secrets
  - [ ] Production-like config
- [ ] Implement deployment strategy
  - [ ] Blue-green deployment
  - [ ] Automated rollback
  - [ ] Health check before cutover
- [ ] Add deployment gates
  - [ ] Manual approval for prod
  - [ ] Automated smoke tests
  - [ ] Performance benchmarks

---

### 13. Health Checks
- [ ] Implement liveness probe
  - [ ] Basic "I'm alive" check
  - [ ] Return 200 if server running
- [ ] Implement readiness probe
  - [ ] Check database connection
  - [ ] Check Redis connection
  - [ ] Check Rust service connection
  - [ ] Return 503 if not ready
- [ ] Add dependency health
  - [ ] Supabase status
  - [ ] Paystack API status
  - [ ] Stripe API status
- [ ] Configure load balancer
  - [ ] Use readiness probe
  - [ ] Remove unhealthy instances
  - [ ] Add back when healthy

---

### 14. Security Headers
- [ ] Add security headers middleware
```go
app.Use(func(c *fiber.Ctx) error {
    c.Set("X-Content-Type-Options", "nosniff")
    c.Set("X-Frame-Options", "DENY")
    c.Set("X-XSS-Protection", "1; mode=block")
    c.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    c.Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")
    c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
    c.Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
    return c.Next()
})
```

---

### 15. CORS Configuration
- [ ] Environment-specific origins
```bash
# .env.development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# .env.production
ALLOWED_ORIGINS=https://bukr.app,https://www.bukr.app
```
- [ ] Wildcard subdomain support (if needed)
- [ ] Credentials handling
- [ ] Preflight caching

---

### 16. Database Migrations
- [ ] Create rollback migrations
  - [ ] For each forward migration
  - [ ] Test rollback procedure
  - [ ] Document rollback steps
- [ ] Add migration versioning
- [ ] Test migration on staging
- [ ] Backup before migration

---

### 17. Performance Optimization
- [ ] Add database query logging
- [ ] Identify slow queries
- [ ] Add missing indexes
- [ ] Optimize N+1 queries
- [ ] Add caching layer
  - [ ] Redis for frequently accessed data
  - [ ] Cache event listings
  - [ ] Cache user profiles
- [ ] Add CDN for static assets
- [ ] Optimize frontend bundle size

---

### 18. Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Deployment runbook
- [ ] Incident response procedures
- [ ] Architecture diagrams
- [ ] Database schema documentation
- [ ] Environment setup guide
- [ ] Troubleshooting guide

---

## 📊 TESTING CHECKLIST

### Load Testing
- [ ] Test ticket purchase under load
  - [ ] 100 concurrent users
  - [ ] 1000 requests/minute
  - [ ] Verify no overselling
- [ ] Test payment processing
  - [ ] Concurrent payment requests
  - [ ] Webhook flood test
- [ ] Test authentication
  - [ ] Concurrent logins
  - [ ] Token validation performance
- [ ] Identify bottlenecks
- [ ] Set performance baselines

### Security Testing
- [ ] SQL injection testing
- [ ] XSS testing
- [ ] CSRF testing
- [ ] Authentication bypass attempts
- [ ] Authorization bypass attempts
- [ ] Rate limit bypass attempts
- [ ] Webhook signature bypass
- [ ] Payment manipulation attempts

### Chaos Engineering
- [ ] Database failure simulation
- [ ] Redis failure simulation
- [ ] Rust service failure simulation
- [ ] Network partition simulation
- [ ] High latency simulation

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All P0 issues resolved
- [ ] All P1 issues resolved
- [ ] Tests passing (70%+ coverage)
- [ ] Security audit completed
- [ ] Load testing completed
- [ ] Staging deployment successful
- [ ] Backup verified
- [ ] Rollback plan documented
- [ ] On-call rotation established
- [ ] Monitoring dashboards ready

### Deployment
- [ ] Deploy to production
- [ ] Run smoke tests
- [ ] Verify health checks
- [ ] Monitor error rates
- [ ] Monitor performance
- [ ] Verify payment processing
- [ ] Test critical user flows

### Post-Deployment
- [ ] Monitor for 24 hours
- [ ] Check error tracking
- [ ] Review logs
- [ ] Verify backups
- [ ] Update documentation
- [ ] Conduct retrospective

---

## 📞 CONTACTS

**On-Call Engineer:** _______________  
**Database Admin:** _______________  
**Security Lead:** _______________  
**Product Owner:** _______________  

**Escalation Path:**
1. On-call engineer
2. Engineering lead
3. CTO

---

## 🎯 SUCCESS METRICS

### Technical Metrics
- [ ] 99.9% uptime
- [ ] < 500ms p95 response time
- [ ] < 0.1% error rate
- [ ] Zero security incidents
- [ ] Zero data loss incidents

### Business Metrics
- [ ] 100% payment success rate
- [ ] Zero ticket overselling
- [ ] < 1% support tickets
- [ ] > 90% user satisfaction

---

**Last Updated:** 2026-02-14  
**Next Review:** After P0 fixes
