# Quick Start: Beta Launch Guide

**Target:** Beta launch in 2 days  
**Users:** 100 invite-only beta testers  
**Status:** ✅ All P0 blockers resolved

---

## Pre-Launch Checklist (2 Hours)

### Hour 1: Security & Credentials

#### 1. Rotate Credentials (30 min)
```bash
# Follow the detailed guide
cat SECURITY_ACTION_CHECKLIST.md

# Quick steps:
# 1. Supabase Dashboard → Settings → Database → Reset Password
# 2. Supabase Dashboard → Settings → API → Regenerate service_role key
# 3. Supabase Dashboard → Settings → API → Generate New JWT Secret
# 4. Update backend/.env with new credentials
# 5. Test connection: cd backend/gateway && DATABASE_URL="$NEW_URL" go run test-db.go
```

#### 2. Verify Security (15 min)
```bash
# No credentials in source
git ls-files | xargs grep -l "<YOUR_DB_PASSWORD>" 2>/dev/null
# Expected: No output

# No credentials in git history
git log --all --full-history -S "<YOUR_DB_PASSWORD>"
# Expected: No output

# Gitignore working
git status --ignored | grep -E "\.env$"
# Expected: Shows .env files as ignored
```

#### 3. Install Secret Scanning (15 min)
```bash
# Install git-secrets
brew install git-secrets  # macOS
# or
sudo apt-get install git-secrets  # Linux

# Setup
cd /home/obeej/Desktop/Bukr
git secrets --install
git secrets --register-aws
git secrets --add 'supabase\.co'
git secrets --add 'postgresql://.*:.*@'

# Test
echo "postgresql://user:password@host/db" > test.txt
git add test.txt
# Expected: Blocks commit
rm test.txt
```

---

### Hour 2: Testing & Verification

#### 4. Build Verification (5 min)
```bash
# Frontend
cd /home/obeej/Desktop/Bukr
npm run build
# Expected: ✓ built in ~10s

# Backend Go
cd backend/gateway
go build ./cmd/main.go
# Expected: Compiles successfully

# Backend Rust
cd backend/core
cargo build --release
# Expected: Compiles successfully
```

#### 5. Start Services (5 min)
```bash
# Terminal 1: Rust Core
cd backend/core
cargo run
# Expected: Bukr Core starting on 0.0.0.0:8081

# Terminal 2: Go Gateway
cd backend/gateway
go run cmd/main.go
# Expected: Bukr Gateway starting on :8080

# Terminal 3: Frontend
npm run dev
# Expected: Local: http://localhost:5173
```

#### 6. Smoke Tests (20 min)
```bash
# Health check
curl http://localhost:8080/health
# Expected: {"status":"ok","service":"bukr-gateway"}

# Rate limiting test
for i in {1..110}; do 
  curl -s http://localhost:8080/health | grep -q "ok" && echo "✓" || echo "✗"
done
# Expected: First 100 ✓, next 10 ✗ (rate limited)

# Frontend loads
open http://localhost:5173
# Expected: Landing page loads

# Sign in works
# 1. Click "Use Bukr"
# 2. Sign in with test account
# 3. Expected: Redirects to /app

# Payment initialization (Stripe)
# 1. Browse events
# 2. Click "Book"
# 3. Select Stripe
# 4. Expected: Redirects to Stripe checkout (or mock URL in dev)
```

#### 7. Load Testing (30 min)
```bash
# Install k6 (load testing tool)
brew install k6  # macOS
# or
sudo apt-get install k6  # Linux

# Create load test script
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up to 10 users
    { duration: '3m', target: 10 },   // Stay at 10 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
};

export default function () {
  // Test health endpoint
  let res = http.get('http://localhost:8080/health');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
EOF

# Run load test
k6 run load-test.js
# Expected: 
# - 95% requests < 200ms
# - 0% failed requests
# - Rate limiting kicks in appropriately
```

---

## Deployment Options

### Option A: Railway (Recommended for Beta)

**Pros:** Easy, fast, auto-scaling  
**Cons:** Costs ~$20/month  
**Time:** 30 minutes

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Deploy backend
cd backend/gateway
railway up

cd ../core
railway up

# Deploy frontend
cd ../..
railway up

# Set environment variables in Railway dashboard
# - DATABASE_URL
# - SUPABASE_SERVICE_KEY
# - SUPABASE_JWT_SECRET
# - PAYSTACK_SECRET_KEY
# - STRIPE_SECRET_KEY
```

### Option B: Fly.io (Free Tier Available)

**Pros:** Free tier, good performance  
**Cons:** More configuration  
**Time:** 45 minutes

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy backend
cd backend/gateway
fly launch
fly secrets set DATABASE_URL="..." SUPABASE_SERVICE_KEY="..."

cd ../core
fly launch
fly secrets set DATABASE_URL="..." SUPABASE_SERVICE_KEY="..."

# Deploy frontend (Vercel recommended)
cd ../..
npm install -g vercel
vercel deploy
```

### Option C: Docker Compose (Self-Hosted)

**Pros:** Full control, no vendor lock-in  
**Cons:** Need server, more maintenance  
**Time:** 1 hour

```bash
# Already have docker-compose.yml
docker-compose up -d

# Set environment variables in .env files
# Deploy to your VPS (DigitalOcean, Linode, etc)
```

---

## Beta Launch Checklist

### Day 1: Soft Launch (10 Users)

- [ ] Deploy to production environment
- [ ] Verify all services running
- [ ] Test sign up flow
- [ ] Test event creation
- [ ] Test ticket purchase (Paystack)
- [ ] Test ticket purchase (Stripe)
- [ ] Test ticket scanning
- [ ] Invite 10 beta users
- [ ] Monitor logs for errors
- [ ] Fix critical issues

### Day 2: Expand (50 Users)

- [ ] Review Day 1 feedback
- [ ] Fix reported bugs
- [ ] Verify payment reconciliation
- [ ] Check database performance
- [ ] Invite 40 more users
- [ ] Monitor rate limiting effectiveness
- [ ] Check for race conditions (none expected)

### Week 1: Full Beta (100 Users)

- [ ] Stable for 2 days
- [ ] No critical bugs
- [ ] Payment success rate > 95%
- [ ] Invite remaining 50 users
- [ ] Collect feedback
- [ ] Plan production launch

---

## Monitoring (Manual for Beta)

### Daily Checks

```bash
# Check error logs
tail -f /var/log/bukr-gateway.log | grep ERROR
tail -f /var/log/bukr-core.log | grep ERROR

# Check database connections
psql "$DATABASE_URL" -c "SELECT count(*) FROM tickets WHERE status = 'valid'"

# Check payment success rate
psql "$DATABASE_URL" -c "
  SELECT 
    provider,
    status,
    COUNT(*) as count
  FROM payment_transactions
  WHERE created_at > NOW() - INTERVAL '24 hours'
  GROUP BY provider, status
"

# Check rate limiting effectiveness
grep "429" /var/log/bukr-gateway.log | wc -l
```

### Key Metrics

| Metric | Target | Alert If |
|--------|--------|----------|
| Uptime | > 99% | < 95% |
| Response time | < 200ms | > 500ms |
| Payment success | > 95% | < 90% |
| Error rate | < 1% | > 5% |
| Rate limit hits | < 10/hour | > 100/hour |

---

## Rollback Plan

If critical issues occur:

```bash
# Option 1: Rollback deployment
railway rollback  # or fly rollback

# Option 2: Disable ticket purchases
# Set environment variable:
MAINTENANCE_MODE=true

# Option 3: Database rollback
# Restore from backup (Supabase has automatic backups)
# Supabase Dashboard → Database → Backups → Restore
```

---

## Support Plan

### Beta Support Channels

1. **Email:** support@bukr.app (create this)
2. **Discord:** Create private beta channel
3. **Response Time:** < 4 hours during business hours

### Common Issues & Solutions

**Issue:** "Payment failed"  
**Solution:** Check payment_transactions table, verify webhook received

**Issue:** "Tickets exhausted" but tickets available  
**Solution:** Check available_tickets count, may need manual adjustment

**Issue:** "Rate limit exceeded"  
**Solution:** Expected behavior, user should wait 60 seconds

**Issue:** "Cannot sign in"  
**Solution:** Check Supabase auth logs, verify JWT secret

---

## Success Criteria

### Beta Launch Success = All of:
- ✅ 100 users signed up
- ✅ > 50 tickets purchased
- ✅ Payment success rate > 95%
- ✅ No data corruption
- ✅ No security incidents
- ✅ Uptime > 99%
- ✅ Positive user feedback

### Ready for Production = All of:
- ✅ Beta success criteria met
- ✅ 2 weeks stable operation
- ✅ All P1 issues resolved
- ✅ Monitoring/alerting setup
- ✅ CI/CD pipeline active
- ✅ 70% test coverage
- ✅ Load tested to 1000 concurrent users

---

## Timeline

**Today (Day 0):**
- ✅ P0 blockers resolved
- ⏳ Rotate credentials (30 min)
- ⏳ Deploy to staging (1 hour)
- ⏳ Smoke tests (30 min)

**Tomorrow (Day 1):**
- Deploy to production (30 min)
- Soft launch to 10 users (4 hours monitoring)
- Fix critical issues (if any)

**Day 2:**
- Expand to 50 users
- Monitor and fix issues

**Week 1:**
- Expand to 100 users
- Collect feedback
- Plan production launch

**Week 2-3:**
- Resolve P1 issues
- Add monitoring
- Setup CI/CD
- Write tests

**Week 4:**
- Production launch 🚀

---

## Emergency Contacts

- **Database Issues:** Supabase Support (support@supabase.io)
- **Payment Issues:** 
  - Paystack: support@paystack.com
  - Stripe: support@stripe.com
- **Infrastructure:** Your hosting provider support

---

**Created:** 2026-02-14  
**Status:** Ready for Beta Launch  
**Next Step:** Rotate credentials and deploy
