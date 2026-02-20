# Security Action Checklist

**Priority:** 🔴 Critical  
**Time Required:** 30 minutes  
**Status:** Pending

---

## Immediate Actions (Do Now)

### 1. Rotate Supabase Database Password (5 min)
```bash
# Steps:
# 1. Open: https://supabase.com/dashboard/project/emcezfurwhednbfssqfk/settings/database
# 2. Click "Reset Database Password"
# 3. Copy new password
# 4. Update backend/.env:
#    DATABASE_URL=postgresql://postgres.emcezfurwhednbfssqfk:<NEW_PASSWORD>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```
- [ ] Password rotated
- [ ] `backend/.env` updated
- [ ] Connection tested

---

### 2. Rotate Supabase Service Key (5 min)
```bash
# Steps:
# 1. Open: https://supabase.com/dashboard/project/emcezfurwhednbfssqfk/settings/api
# 2. Find "service_role" key
# 3. Click "Regenerate"
# 4. Copy new key
# 5. Update backend/.env:
#    SUPABASE_SERVICE_KEY=<NEW_KEY>
```
- [ ] Service key rotated
- [ ] `backend/.env` updated
- [ ] API access tested

---

### 3. Rotate JWT Secret (5 min)
```bash
# Steps:
# 1. Open: https://supabase.com/dashboard/project/emcezfurwhednbfssqfk/settings/api
# 2. Scroll to "JWT Settings"
# 3. Click "Generate New Secret"
# 4. Copy new secret
# 5. Update backend/.env:
#    SUPABASE_JWT_SECRET=<NEW_SECRET>
#
# ⚠️ WARNING: This invalidates all user sessions
```
- [ ] JWT secret rotated
- [ ] `backend/.env` updated
- [ ] Users notified of re-login requirement

---

### 4. Test Application (5 min)
```bash
# Test backend services
cd backend/gateway
go run cmd/main.go
# Expected: Server starts without errors

cd backend/core
cargo run
# Expected: Server starts without errors

# Test database connection
cd backend/gateway
DATABASE_URL="<new_url>" go run test-db.go
# Expected: ✅ Successfully connected

# Test frontend
npm run dev
# Expected: App loads, can sign in
```
- [ ] Go gateway starts
- [ ] Rust core starts
- [ ] Database connection works
- [ ] Frontend connects to backend
- [ ] User can sign in

---

### 5. Verify Old Credentials Invalid (5 min)
```bash
# Try connecting with old password
psql "postgresql://postgres.emcezfurwhednbfssqfk:<YOUR_DB_PASSWORD>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
# Expected: Authentication failed

# Try API with old service key
curl -H "apikey: <YOUR_SUPABASE_SERVICE_KEY>" \
  https://emcezfurwhednbfssqfk.supabase.co/rest/v1/
# Expected: 401 Unauthorized
```
- [ ] Old database password rejected
- [ ] Old service key rejected
- [ ] Old JWT secret invalid

---

## Short-term Actions (This Week)

### 6. Install Secret Scanning (15 min)
```bash
# Install git-secrets
brew install git-secrets  # macOS
# or
apt-get install git-secrets  # Linux

# Setup in repo
cd /home/obeej/Desktop/Bukr
git secrets --install
git secrets --register-aws
git secrets --add 'supabase\.co'
git secrets --add 'postgresql://.*:.*@'
git secrets --add 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'

# Test
echo "postgresql://user:password@host/db" > test.txt
git add test.txt
# Expected: Blocks commit with secret detected
```
- [ ] git-secrets installed
- [ ] Patterns configured
- [ ] Pre-commit hook tested

---

### 7. Scan Codebase (10 min)
```bash
# Install truffleHog
pip install truffleHog

# Scan repo
trufflehog --regex --entropy=True /home/obeej/Desktop/Bukr

# Install gitleaks
brew install gitleaks

# Scan repo
gitleaks detect --source /home/obeej/Desktop/Bukr --verbose
```
- [ ] truffleHog scan completed
- [ ] gitleaks scan completed
- [ ] No secrets found

---

### 8. Create .env.example (5 min)
```bash
# Create template files
cat > backend/.env.example << 'EOF'
# Bukr Backend Environment Variables
PORT=8080
RUST_SERVICE_PORT=8081

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here
SUPABASE_JWT_SECRET=your_jwt_secret_here

# Database Connection
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis
REDIS_URL=redis://localhost:6379

# Rust Core Service
RUST_SERVICE_URL=http://localhost:8081

# Payment Providers
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret
STRIPE_SECRET_KEY=sk_test_your_stripe_secret

# Webhook Secrets
PAYSTACK_WEBHOOK_SECRET=your-paystack-webhook-secret
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret

# CORS
ALLOWED_ORIGINS=http://localhost:5173

# Logging
LOG_LEVEL=info
RUST_LOG=bukr_core=info,tower_http=info
EOF

cat > .env.example << 'EOF'
# Supabase Configuration (Frontend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Backend API
VITE_API_URL=http://localhost:8080/api/v1
EOF
```
- [ ] `backend/.env.example` created
- [ ] `.env.example` created
- [ ] Committed to git

---

## Long-term Actions (This Month)

### 9. Implement Secret Manager (2 hours)
- [ ] Choose: AWS Secrets Manager or HashiCorp Vault
- [ ] Setup secret storage
- [ ] Update backend to fetch from secret manager
- [ ] Test in staging environment
- [ ] Deploy to production

---

### 10. Setup CI/CD Secret Scanning (1 hour)
```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]
jobs:
  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Gitleaks
        uses: gitleaks/gitleaks-action@v2
```
- [ ] GitHub Actions workflow created
- [ ] Secret scanning runs on every PR
- [ ] Team notified of setup

---

### 11. Document Procedures (30 min)
- [ ] Update README with secret management section
- [ ] Document rotation schedule (quarterly)
- [ ] Create incident response runbook
- [ ] Train team on procedures

---

## Verification

After completing all immediate actions, verify:

```bash
# 1. No credentials in source
git ls-files | xargs grep -l "<YOUR_DB_PASSWORD>" 2>/dev/null
# Expected: No output

# 2. Application works
curl http://localhost:8080/health
# Expected: {"status":"ok"}

# 3. Database accessible
psql "$DATABASE_URL" -c "SELECT 1"
# Expected: 1 row returned

# 4. Old credentials invalid
# (Already tested in step 5)
```

---

## Success Criteria

✅ All immediate actions completed  
✅ Application running with new credentials  
✅ Old credentials confirmed invalid  
✅ No credentials in source code  
✅ Secret scanning installed  
✅ Team aware of procedures

---

**Created:** 2026-02-14  
**Owner:** DevOps/Security Team  
**Review Date:** 2026-05-14 (quarterly rotation)
