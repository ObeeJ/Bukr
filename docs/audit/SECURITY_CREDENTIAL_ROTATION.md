# Security: Credential Rotation Guide

## ⚠️ IMMEDIATE ACTION REQUIRED

Your credentials have been exposed in the working directory. While they were never committed to git, they exist in plaintext and should be rotated immediately.

---

## Exposed Credentials

The following credentials were found in `backend/.env`:

1. **Database Password** - Supabase PostgreSQL
2. **Supabase Service Key** - Full admin access JWT
3. **Supabase JWT Secret** - Token signing key

---

## Rotation Steps

### 1. Rotate Supabase Credentials (5 minutes)

**Database Password:**
```bash
# 1. Go to Supabase Dashboard
# 2. Navigate to: Settings → Database → Connection Pooling
# 3. Click "Reset Database Password"
# 4. Update backend/.env with new password
```

**Service Role Key:**
```bash
# 1. Go to Supabase Dashboard
# 2. Navigate to: Settings → API
# 3. Click "Regenerate" next to service_role key
# 4. Update SUPABASE_SERVICE_KEY in backend/.env
```

**JWT Secret:**
```bash
# 1. Go to Supabase Dashboard
# 2. Navigate to: Settings → API → JWT Settings
# 3. Click "Generate New Secret"
# 4. Update SUPABASE_JWT_SECRET in backend/.env
# WARNING: This will invalidate all existing user sessions
```

---

### 2. Verify No Git History Contamination

```bash
# Check if .env was ever committed
git log --all --full-history -- backend/.env .env

# If any commits found, use git-filter-repo to remove:
pip install git-filter-repo
git filter-repo --path backend/.env --invert-paths
git filter-repo --path .env --invert-paths
```

**Status:** ✅ Verified - No .env files in git history

---

### 3. Implement Secret Management (Production)

**Option A: AWS Secrets Manager (Recommended)**
```bash
# Store secrets
aws secretsmanager create-secret \
  --name bukr/prod/database-url \
  --secret-string "postgresql://..."

# Retrieve in application
DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id bukr/prod/database-url \
  --query SecretString --output text)
```

**Option B: HashiCorp Vault**
```bash
# Store secrets
vault kv put secret/bukr/prod \
  database_url="postgresql://..." \
  supabase_key="..."

# Retrieve in application
vault kv get -field=database_url secret/bukr/prod
```

**Option C: Environment Variables (Staging/Dev)**
```bash
# Set in deployment platform (Vercel, Railway, Fly.io)
# Never commit to repository
```

---

### 4. Update Deployment Configuration

**Backend (Go Gateway):**
```go
// config/config.go
func LoadConfig() Config {
    // Load from environment or secret manager
    return Config{
        DatabaseURL: getSecret("DATABASE_URL"),
        SupabaseKey: getSecret("SUPABASE_SERVICE_KEY"),
    }
}

func getSecret(key string) string {
    // Try environment variable first
    if val := os.Getenv(key); val != "" {
        return val
    }
    
    // Fall back to AWS Secrets Manager
    return fetchFromSecretsManager(key)
}
```

**Backend (Rust Core):**
```rust
// config.rs
pub struct Config {
    pub database_url: String,
    pub supabase_key: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            database_url: get_secret("DATABASE_URL"),
            supabase_key: get_secret("SUPABASE_SERVICE_KEY"),
        }
    }
}
```

---

### 5. Security Checklist

- [x] `.env` files in `.gitignore`
- [x] Audit documents in `.gitignore`
- [ ] Rotate database password
- [ ] Rotate Supabase service key
- [ ] Rotate JWT secret
- [ ] Implement secret manager (AWS/Vault)
- [ ] Update deployment configs
- [ ] Test with new credentials
- [ ] Document secret rotation procedure
- [ ] Set calendar reminder for quarterly rotation

---

## Prevention: Best Practices

### Never Commit Secrets
```bash
# Always use .env.example with placeholders
# backend/.env.example
DATABASE_URL=postgresql://user:password@host:5432/db
SUPABASE_SERVICE_KEY=your_service_key_here
SUPABASE_JWT_SECRET=your_jwt_secret_here
```

### Use Pre-Commit Hooks
```bash
# Install git-secrets
brew install git-secrets  # macOS
apt-get install git-secrets  # Linux

# Setup
git secrets --install
git secrets --register-aws
git secrets --add 'supabase\.co'
git secrets --add 'postgresql://.*:.*@'
```

### Scan for Leaked Secrets
```bash
# Use truffleHog
pip install truffleHog
trufflehog --regex --entropy=True .

# Use gitleaks
brew install gitleaks
gitleaks detect --source . --verbose
```

### Environment-Specific Secrets
```
.env.development  # Local dev (mock/test credentials)
.env.staging      # Staging environment
.env.production   # Production (from secret manager)
```

---

## Incident Response

**If credentials are committed to git:**

1. **Immediate:** Rotate all exposed credentials
2. **Within 1 hour:** Remove from git history
3. **Within 24 hours:** Audit access logs for unauthorized use
4. **Within 1 week:** Implement secret scanning in CI/CD

**If credentials are leaked publicly:**

1. **Immediate:** Rotate credentials (< 5 minutes)
2. **Immediate:** Revoke all active sessions
3. **Within 1 hour:** Audit database for unauthorized access
4. **Within 24 hours:** Notify affected users if data accessed
5. **Within 1 week:** Post-mortem and process improvements

---

## Verification

After rotation, verify:

```bash
# Test database connection
psql "$NEW_DATABASE_URL" -c "SELECT 1"

# Test Supabase API
curl -H "apikey: $NEW_SUPABASE_KEY" \
  https://emcezfurwhednbfssqfk.supabase.co/rest/v1/

# Test application startup
cd backend/gateway && go run cmd/main.go
cd backend/core && cargo run
```

---

## Questions?

- **How often to rotate?** Quarterly for production, or immediately if exposed
- **What about payment keys?** Rotate Paystack/Stripe keys if exposed
- **Local development?** Use separate dev credentials, never production
- **CI/CD secrets?** Use GitHub Secrets, GitLab CI Variables, or similar

---

**Created:** 2026-02-14  
**Status:** Action Required  
**Priority:** Critical
