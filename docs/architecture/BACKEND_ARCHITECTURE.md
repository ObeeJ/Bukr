# Bukr Backend Architecture

## Table of Contents

1. [System Overview](#system-overview)
2. [Tech Stack](#tech-stack)
3. [Service Boundaries (Modular Monolith)](#service-boundaries)
4. [Database Schema (Supabase/PostgreSQL)](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [JSON Payloads](#json-payloads)
7. [Authentication & Authorization](#authentication--authorization)
8. [Redis Caching Strategy](#redis-caching-strategy)
9. [Payment Integration](#payment-integration)
10. [Infrastructure & Deployment](#infrastructure--deployment)
11. [Architectural Concerns & Trade-offs](#architectural-concerns--trade-offs)

---

## 1. System Overview

```
                    ┌─────────────────────────┐
                    │   Netlify (Frontend)     │
                    │   React + Vite SPA       │
                    │   bukr.netlify.app        │
                    └──────────┬──────────────┘
                               │ HTTPS
                               ▼
                    ┌─────────────────────────┐
                    │   Render (Backend)       │
                    │                          │
                    │  ┌───────────────────┐   │
                    │  │  Go/Fiber Gateway │   │  ← API Gateway + Auth + Events + Users
                    │  │  :8080            │   │
                    │  └────────┬──────────┘   │
                    │           │ gRPC/HTTP     │
                    │  ┌────────▼──────────┐   │
                    │  │  Rust/Axum Core   │   │  ← Tickets + Scanner + Payments + Analytics
                    │  │  :8081            │   │
                    │  └───────────────────┘   │
                    └──────┬─────────┬─────────┘
                           │         │
              ┌────────────▼─┐   ┌───▼──────────┐
              │  Supabase    │   │   Redis       │
              │  PostgreSQL  │   │   (Upstash)   │
              │  + Auth      │   │   Cache +     │
              │  + Storage   │   │   Sessions    │
              └──────────────┘   └───────────────┘
```

### Why Polyglot (Go + Rust)?

| Concern | Go/Fiber | Rust/Axum |
|---------|----------|-----------|
| **Role** | API Gateway, Auth, CRUD operations | High-throughput ticket processing, real-time scanning |
| **Strength** | Fast development, simple concurrency, rich ecosystem | Zero-cost abstractions, memory safety, maximum throughput |
| **Services** | Auth, Users, Events, Influencers, Favorites | Tickets, Scanner, Payments, Analytics |
| **Communication** | Receives all external requests, proxies to Rust | Internal service, called by Go gateway via gRPC or HTTP |

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| API Gateway | Go 1.22+ / Fiber v2 | Request routing, auth middleware, rate limiting |
| Core Services | Rust 1.75+ / Axum 0.7 | Ticket processing, payment handling, real-time scanning |
| Database | Supabase (PostgreSQL 15) | Primary data store, Row Level Security |
| Cache | Redis 7 (Upstash on Render) | Session tokens, event caching, rate limiting, ticket locks |
| Auth | Supabase Auth + JWT | User authentication, token management |
| Storage | Supabase Storage | Event thumbnails, fliers, user avatars |
| Payments | Paystack + Stripe | NGN transactions (Paystack), international (Stripe) |
| Frontend Host | Netlify | Static SPA hosting, CDN, edge functions |
| Backend Host | Render | Docker containers, auto-scaling, managed services |
| Inter-service | gRPC (tonic + tonic-build) | Go ↔ Rust communication with protobuf |

---

## 3. Service Boundaries

The modular monolith is split into **6 domain modules** across 2 runtimes. Each module owns its own business logic but shares the Supabase database. The separation is by **bounded context**, not by deployment unit (yet).

```
┌─────────────────────────────────────────────────────────┐
│                    GO / FIBER GATEWAY                    │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐            │
│  │   Auth   │  │  Events  │  │   Users    │            │
│  │  Module   │  │  Module  │  │   Module   │            │
│  ├──────────┤  ├──────────┤  ├────────────┤            │
│  │ handler  │  │ handler  │  │  handler   │            │
│  │ service  │  │ service  │  │  service   │            │
│  │ repo     │  │ repo     │  │  repo      │            │
│  └──────────┘  └──────────┘  └────────────┘            │
│                                                          │
│  ┌──────────────┐  ┌──────────┐                         │
│  │ Influencers  │  │ Favorites│                         │
│  │   Module     │  │  Module  │                         │
│  ├──────────────┤  ├──────────┤                         │
│  │ handler      │  │ handler  │                         │
│  │ service      │  │ service  │                         │
│  │ repo         │  │ repo     │                         │
│  └──────────────┘  └──────────┘                         │
│                                                          │
│  ┌──────────────────────────────────────┐               │
│  │        Shared Middleware             │               │
│  │  (CORS, Auth JWT, Rate Limit, Log)  │               │
│  └──────────────────────────────────────┘               │
└────────────────────────┬────────────────────────────────┘
                         │ gRPC / internal HTTP
┌────────────────────────▼────────────────────────────────┐
│                   RUST / AXUM CORE                       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐            │
│  │ Tickets  │  │ Scanner  │  │  Payments  │            │
│  │  Module  │  │  Module  │  │   Module   │            │
│  ├──────────┤  ├──────────┤  ├────────────┤            │
│  │ handler  │  │ handler  │  │  handler   │            │
│  │ service  │  │ service  │  │  service   │            │
│  │ repo     │  │ repo     │  │  repo      │            │
│  └──────────┘  └──────────┘  └────────────┘            │
│                                                          │
│  ┌──────────────┐  ┌────────────┐                       │
│  │  Analytics   │  │   Promos   │                       │
│  │   Module     │  │   Module   │                       │
│  ├──────────────┤  ├────────────┤                       │
│  │ handler      │  │ handler    │                       │
│  │ service      │  │ service    │                       │
│  │ repo         │  │ repo       │                       │
│  └──────────────┘  └────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

### Module Directory Layout

**Go Gateway** (`/backend/gateway/`):
```
gateway/
├── cmd/
│   └── main.go                 # Entrypoint
├── internal/
│   ├── auth/
│   │   ├── handler.go          # HTTP handlers
│   │   ├── service.go          # Business logic
│   │   ├── repository.go       # DB queries
│   │   └── dto.go              # Request/Response types
│   ├── events/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go
│   │   └── dto.go
│   ├── users/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go
│   │   └── dto.go
│   ├── influencers/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go
│   │   └── dto.go
│   ├── favorites/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go
│   │   └── dto.go
│   ├── middleware/
│   │   ├── auth.go             # JWT validation
│   │   ├── cors.go             # CORS config
│   │   ├── ratelimit.go        # Redis-backed rate limiting
│   │   └── logger.go           # Structured logging
│   ├── proxy/
│   │   └── rust_client.go      # gRPC client to Rust service
│   └── shared/
│       ├── config.go           # Env config
│       ├── database.go         # Supabase connection
│       ├── redis.go            # Redis client
│       ├── errors.go           # Error types
│       └── response.go         # Standard API response
├── proto/
│   └── tickets.proto           # Shared protobuf definitions
├── go.mod
├── go.sum
└── Dockerfile
```

**Rust Core** (`/backend/core/`):
```
core/
├── src/
│   ├── main.rs                 # Entrypoint + Axum router
│   ├── config.rs               # Environment config
│   ├── db.rs                   # Supabase/SQLx connection pool
│   ├── redis.rs                # Redis connection
│   ├── error.rs                # Error types + responses
│   ├── tickets/
│   │   ├── mod.rs
│   │   ├── handler.rs          # Axum handlers
│   │   ├── service.rs          # Business logic
│   │   ├── repository.rs       # SQLx queries
│   │   └── dto.rs              # Serde structs
│   ├── scanner/
│   │   ├── mod.rs
│   │   ├── handler.rs
│   │   ├── service.rs
│   │   └── repository.rs
│   ├── payments/
│   │   ├── mod.rs
│   │   ├── handler.rs
│   │   ├── service.rs
│   │   ├── paystack.rs         # Paystack client
│   │   └── stripe.rs           # Stripe client
│   ├── promos/
│   │   ├── mod.rs
│   │   ├── handler.rs
│   │   ├── service.rs
│   │   └── repository.rs
│   ├── analytics/
│   │   ├── mod.rs
│   │   ├── handler.rs
│   │   ├── service.rs
│   │   └── repository.rs
│   └── grpc/
│       ├── mod.rs
│       └── server.rs           # tonic gRPC server
├── proto/
│   └── tickets.proto
├── migrations/
├── Cargo.toml
└── Dockerfile
```

---

## 4. Database Schema (Supabase/PostgreSQL)

### Tables

```sql
-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_uid    UUID UNIQUE NOT NULL,       -- Links to Supabase Auth
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    user_type       VARCHAR(20) NOT NULL CHECK (user_type IN ('user', 'organizer')),
    org_name        VARCHAR(255),               -- NULL for regular users
    avatar_url      TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_supabase_uid ON users(supabase_uid);
CREATE INDEX idx_users_user_type ON users(user_type);

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    date            DATE NOT NULL,
    time            TIME NOT NULL,
    end_date        DATE,
    location        VARCHAR(500) NOT NULL,
    price           DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency        VARCHAR(3) NOT NULL DEFAULT 'NGN',
    category        VARCHAR(100) NOT NULL,
    emoji           VARCHAR(10),
    event_key       VARCHAR(50) UNIQUE NOT NULL, -- Short key for URLs (e.g., "summer-fest-24")
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'cancelled', 'completed')),
    total_tickets   INTEGER NOT NULL DEFAULT 0,
    available_tickets INTEGER NOT NULL DEFAULT 0,
    thumbnail_url   TEXT,
    video_url       TEXT,
    flier_url       TEXT,
    is_featured     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_event_key ON events(event_key);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_category ON events(category);

-- ============================================================
-- TICKETS
-- ============================================================
CREATE TABLE tickets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id       VARCHAR(50) UNIQUE NOT NULL, -- Human-readable: "BUKR-1234-eventid"
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_type     VARCHAR(50) NOT NULL DEFAULT 'General Admission',
    quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 10),
    unit_price      DECIMAL(12, 2) NOT NULL,
    total_price     DECIMAL(12, 2) NOT NULL,
    discount_applied DECIMAL(5, 2) DEFAULT 0,
    promo_code_id   UUID REFERENCES promo_codes(id),
    currency        VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status          VARCHAR(20) DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'expired', 'cancelled', 'refunded')),
    qr_code_data    TEXT NOT NULL,               -- JSON payload encoded in QR
    payment_ref     VARCHAR(255),                -- Paystack/Stripe transaction reference
    payment_provider VARCHAR(20),                -- 'paystack' | 'stripe'
    excitement_rating INTEGER CHECK (excitement_rating BETWEEN 1 AND 5),
    scanned_at      TIMESTAMPTZ,                 -- When ticket was scanned at door
    scanned_by      UUID REFERENCES users(id),   -- Who scanned it
    purchase_date   TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_user ON tickets(user_id);
CREATE INDEX idx_tickets_ticket_id ON tickets(ticket_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_payment_ref ON tickets(payment_ref);

-- ============================================================
-- PROMO CODES
-- ============================================================
CREATE TABLE promo_codes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    code                VARCHAR(50) NOT NULL,
    discount_percentage DECIMAL(5, 2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
    ticket_limit        INTEGER NOT NULL DEFAULT 0, -- 0 = unlimited
    used_count          INTEGER DEFAULT 0,
    is_active           BOOLEAN DEFAULT TRUE,
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, code)
);

CREATE INDEX idx_promo_codes_event ON promo_codes(event_id);
CREATE INDEX idx_promo_codes_code ON promo_codes(code);

-- ============================================================
-- FAVORITES
-- ============================================================
CREATE TABLE favorites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);

-- ============================================================
-- INFLUENCERS
-- ============================================================
CREATE TABLE influencers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    bio             TEXT,
    social_handle   VARCHAR(255),
    referral_code   VARCHAR(50) UNIQUE,
    referral_discount DECIMAL(5, 2) DEFAULT 10.00,
    total_referrals INTEGER DEFAULT 0,
    total_revenue   DECIMAL(12, 2) DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_influencers_organizer ON influencers(organizer_id);
CREATE INDEX idx_influencers_referral ON influencers(referral_code);

-- ============================================================
-- SCANNER ACCESS CODES
-- ============================================================
CREATE TABLE scanner_access_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    code        VARCHAR(50) UNIQUE NOT NULL,
    label       VARCHAR(100),                   -- e.g., "Gate A", "VIP Entrance"
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    expires_at  TIMESTAMPTZ
);

CREATE INDEX idx_scanner_codes_event ON scanner_access_codes(event_id);

-- ============================================================
-- SCAN LOG (audit trail)
-- ============================================================
CREATE TABLE scan_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID NOT NULL REFERENCES tickets(id),
    event_id    UUID NOT NULL REFERENCES events(id),
    scanned_by  UUID REFERENCES users(id),
    access_code VARCHAR(50),                    -- Which scanner gate
    result      VARCHAR(20) NOT NULL CHECK (result IN ('valid', 'invalid', 'already_used')),
    scanned_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scan_log_event ON scan_log(event_id);
CREATE INDEX idx_scan_log_ticket ON scan_log(ticket_id);

-- ============================================================
-- PAYMENT TRANSACTIONS
-- ============================================================
CREATE TABLE payment_transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id           UUID REFERENCES tickets(id),
    user_id             UUID NOT NULL REFERENCES users(id),
    provider            VARCHAR(20) NOT NULL CHECK (provider IN ('paystack', 'stripe')),
    provider_ref        VARCHAR(255) UNIQUE NOT NULL,  -- Paystack/Stripe transaction ID
    amount              DECIMAL(12, 2) NOT NULL,
    currency            VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status              VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    provider_response   JSONB,                          -- Full webhook payload
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON payment_transactions(user_id);
CREATE INDEX idx_payments_provider_ref ON payment_transactions(provider_ref);
CREATE INDEX idx_payments_status ON payment_transactions(status);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-decrement available tickets on purchase
CREATE OR REPLACE FUNCTION decrement_available_tickets()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE events
    SET available_tickets = available_tickets - NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.event_id
      AND available_tickets >= NEW.quantity;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Not enough tickets available';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_decrement_tickets
AFTER INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION decrement_available_tickets();

-- Auto-increment promo used_count
CREATE OR REPLACE FUNCTION increment_promo_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.promo_code_id IS NOT NULL THEN
        UPDATE promo_codes
        SET used_count = used_count + 1,
            updated_at = NOW()
        WHERE id = NEW.promo_code_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_promo
AFTER INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION increment_promo_usage();

-- Updated_at auto-update
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Entity Relationship Diagram

```
users (1) ──────< events (N)
  │                  │
  │                  ├──────< tickets (N)
  │                  ├──────< promo_codes (N)
  │                  ├──────< favorites (N) >────── users
  │                  ├──────< scanner_access_codes (N)
  │                  └──────< scan_log (N)
  │
  ├──────< influencers (N)
  ├──────< tickets (N)
  └──────< payment_transactions (N)
```

---

## 5. API Endpoints

All endpoints are prefixed with `/api/v1`. The Go gateway handles routing and proxies ticket/payment/scanner requests to the Rust service internally.

### Auth Module (Go/Fiber)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/v1/auth/signup` | Register new user | Public |
| `POST` | `/api/v1/auth/signin` | Sign in user | Public |
| `POST` | `/api/v1/auth/signout` | Sign out (invalidate token) | Required |
| `POST` | `/api/v1/auth/refresh` | Refresh access token | Required |
| `POST` | `/api/v1/auth/forgot-password` | Send password reset email | Public |
| `POST` | `/api/v1/auth/reset-password` | Reset password with token | Public |

### Users Module (Go/Fiber)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/v1/users/me` | Get current user profile | Required |
| `PATCH` | `/api/v1/users/me` | Update current user profile | Required |
| `DELETE` | `/api/v1/users/me` | Deactivate account | Required |
| `GET` | `/api/v1/users/:id` | Get user by ID (public profile) | Required |

### Events Module (Go/Fiber)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/v1/events` | List events (paginated, filterable) | Public |
| `GET` | `/api/v1/events/:id` | Get event by ID | Public |
| `GET` | `/api/v1/events/key/:eventKey` | Get event by short key | Public |
| `POST` | `/api/v1/events` | Create event | Organizer |
| `PUT` | `/api/v1/events/:id` | Update event | Organizer (owner) |
| `DELETE` | `/api/v1/events/:id` | Delete event | Organizer (owner) |
| `GET` | `/api/v1/events/me` | Get organizer's own events | Organizer |
| `GET` | `/api/v1/events/search` | Search events by query | Public |
| `GET` | `/api/v1/events/featured` | Get featured events | Public |
| `GET` | `/api/v1/events/categories` | List available categories | Public |

### Favorites Module (Go/Fiber)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/v1/favorites` | Get user's favorited events | Required |
| `POST` | `/api/v1/favorites/:eventId` | Add event to favorites | Required |
| `DELETE` | `/api/v1/favorites/:eventId` | Remove event from favorites | Required |
| `GET` | `/api/v1/favorites/:eventId/check` | Check if event is favorited | Required |

### Influencers Module (Go/Fiber)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/v1/influencers` | List organizer's influencers | Organizer |
| `GET` | `/api/v1/influencers/:id` | Get influencer details | Organizer |
| `POST` | `/api/v1/influencers` | Add influencer | Organizer |
| `PUT` | `/api/v1/influencers/:id` | Update influencer | Organizer |
| `DELETE` | `/api/v1/influencers/:id` | Remove influencer | Organizer |
| `GET` | `/api/v1/influencers/:id/referral-link` | Generate referral link | Organizer |
| `GET` | `/api/v1/influencers/:id/stats` | Get referral stats | Organizer |

### Tickets Module (Rust/Axum — proxied via Go gateway)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/v1/tickets/purchase` | Purchase tickets | Required |
| `GET` | `/api/v1/tickets/me` | Get current user's tickets | Required |
| `GET` | `/api/v1/tickets/:ticketId` | Get ticket details | Required |
| `GET` | `/api/v1/tickets/event/:eventId` | Get all tickets for event | Organizer (owner) |
| `GET` | `/api/v1/tickets/:ticketId/qr` | Get QR code image for ticket | Required |
| `GET` | `/api/v1/tickets/:ticketId/download` | Download ticket as PDF | Required |

### Promo Codes Module (Rust/Axum — proxied via Go gateway)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/v1/events/:eventId/promos` | List event promo codes | Organizer (owner) |
| `POST` | `/api/v1/events/:eventId/promos` | Create promo code | Organizer (owner) |
| `PUT` | `/api/v1/events/:eventId/promos/:promoId` | Update promo code | Organizer (owner) |
| `DELETE` | `/api/v1/events/:eventId/promos/:promoId` | Delete promo code | Organizer (owner) |
| `PATCH` | `/api/v1/events/:eventId/promos/:promoId/toggle` | Toggle active status | Organizer (owner) |
| `POST` | `/api/v1/promos/validate` | Validate a promo code | Required |

### Scanner Module (Rust/Axum — proxied via Go gateway)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/v1/scanner/verify-access` | Verify scanner access code | Public |
| `POST` | `/api/v1/scanner/validate` | Validate ticket via QR data | Organizer or AccessCode |
| `POST` | `/api/v1/scanner/manual-validate` | Validate ticket by manual ID | Organizer or AccessCode |
| `PATCH` | `/api/v1/scanner/mark-used/:ticketId` | Mark ticket as used | Organizer or AccessCode |
| `GET` | `/api/v1/scanner/:eventId/stats` | Get scanning statistics | Organizer (owner) |
| `GET` | `/api/v1/scanner/:eventId/log` | Get scan history log | Organizer (owner) |

### Payments Module (Rust/Axum — proxied via Go gateway)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/v1/payments/initialize` | Initialize payment (get checkout URL) | Required |
| `POST` | `/api/v1/payments/webhook/paystack` | Paystack webhook handler | Paystack signature |
| `POST` | `/api/v1/payments/webhook/stripe` | Stripe webhook handler | Stripe signature |
| `GET` | `/api/v1/payments/:ref/verify` | Verify payment status | Required |
| `POST` | `/api/v1/payments/:ref/refund` | Initiate refund | Organizer (owner) |

### Analytics Module (Rust/Axum — proxied via Go gateway)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/v1/analytics/events/:eventId` | Event analytics (sales, scans, revenue) | Organizer (owner) |
| `GET` | `/api/v1/analytics/dashboard` | Organizer dashboard summary | Organizer |
| `GET` | `/api/v1/analytics/events/:eventId/revenue` | Revenue breakdown | Organizer (owner) |
| `GET` | `/api/v1/analytics/events/:eventId/attendance` | Attendance metrics | Organizer (owner) |

---

## 6. JSON Payloads

### Auth

**POST `/api/v1/auth/signup`**
```json
// Request
{
  "email": "john@example.com",
  "password": "securePassword123!",
  "name": "John Doe",
  "user_type": "organizer",
  "org_name": "Bukr Events"        // required if user_type = "organizer"
}

// Response 201
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "name": "John Doe",
      "user_type": "organizer",
      "org_name": "Bukr Events",
      "created_at": "2026-02-05T10:00:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600
  }
}
```

**POST `/api/v1/auth/signin`**
```json
// Request
{
  "email": "john@example.com",
  "password": "securePassword123!"
}

// Response 200
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "name": "John Doe",
      "user_type": "organizer",
      "org_name": "Bukr Events"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600
  }
}
```

### Events

**POST `/api/v1/events`**
```json
// Request (multipart/form-data for file upload, or JSON)
{
  "title": "Summer Music Festival",
  "description": "The biggest summer event in Lagos",
  "date": "2026-07-15",
  "time": "18:00",
  "end_date": "2026-07-16",
  "location": "Eko Atlantic, Lagos",
  "price": 5000.00,
  "currency": "NGN",
  "category": "Music",
  "emoji": "🎵",
  "total_tickets": 500,
  "thumbnail_url": "https://supabase.storage/...",
  "video_url": "https://..."
}

// Response 201
{
  "status": "success",
  "data": {
    "id": "uuid",
    "organizer_id": "uuid",
    "title": "Summer Music Festival",
    "description": "The biggest summer event in Lagos",
    "date": "2026-07-15",
    "time": "18:00",
    "end_date": "2026-07-16",
    "location": "Eko Atlantic, Lagos",
    "price": 5000.00,
    "currency": "NGN",
    "category": "Music",
    "emoji": "🎵",
    "event_key": "summer-music-festival-a3b2",
    "status": "active",
    "total_tickets": 500,
    "available_tickets": 500,
    "thumbnail_url": "https://...",
    "video_url": "https://...",
    "created_at": "2026-02-05T10:00:00Z"
  }
}
```

**GET `/api/v1/events?page=1&limit=20&category=Music&status=active&search=summer`**
```json
// Response 200
{
  "status": "success",
  "data": {
    "events": [
      {
        "id": "uuid",
        "title": "Summer Music Festival",
        "date": "2026-07-15",
        "time": "18:00",
        "location": "Eko Atlantic, Lagos",
        "price": 5000.00,
        "currency": "NGN",
        "category": "Music",
        "emoji": "🎵",
        "event_key": "summer-music-festival-a3b2",
        "status": "active",
        "total_tickets": 500,
        "available_tickets": 475,
        "thumbnail_url": "https://...",
        "is_favorited": true,
        "organizer": {
          "id": "uuid",
          "name": "John Doe",
          "org_name": "Bukr Events"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "total_pages": 3
    }
  }
}
```

### Tickets

**POST `/api/v1/tickets/purchase`**
```json
// Request
{
  "event_id": "uuid",
  "quantity": 2,
  "ticket_type": "General Admission",
  "promo_code": "SUMMER20",
  "excitement_rating": 5,
  "payment_provider": "paystack",
  "referral_code": "INF-jane123"
}

// Response 201
{
  "status": "success",
  "data": {
    "ticket": {
      "id": "uuid",
      "ticket_id": "BUKR-4821-summer",
      "event_id": "uuid",
      "event_title": "Summer Music Festival",
      "event_date": "2026-07-15",
      "event_time": "18:00",
      "event_location": "Eko Atlantic, Lagos",
      "ticket_type": "General Admission",
      "quantity": 2,
      "unit_price": 5000.00,
      "discount_applied": 20.00,
      "total_price": 8000.00,
      "currency": "NGN",
      "status": "valid",
      "qr_code_data": "{\"ticketId\":\"BUKR-4821-summer\",\"eventKey\":\"summer-music-festival-a3b2\"}",
      "purchase_date": "2026-02-05T10:00:00Z"
    },
    "payment": {
      "provider": "paystack",
      "authorization_url": "https://checkout.paystack.com/abc123",
      "reference": "BUKR-PAY-abc123",
      "amount": 8000.00,
      "currency": "NGN"
    }
  }
}
```

**GET `/api/v1/tickets/me`**
```json
// Response 200
{
  "status": "success",
  "data": {
    "tickets": [
      {
        "id": "uuid",
        "ticket_id": "BUKR-4821-summer",
        "event": {
          "id": "uuid",
          "title": "Summer Music Festival",
          "date": "2026-07-15",
          "time": "18:00",
          "location": "Eko Atlantic, Lagos",
          "emoji": "🎵",
          "event_key": "summer-music-festival-a3b2"
        },
        "ticket_type": "General Admission",
        "quantity": 2,
        "total_price": 8000.00,
        "currency": "NGN",
        "status": "valid",
        "qr_code_data": "...",
        "purchase_date": "2026-02-05T10:00:00Z"
      }
    ]
  }
}
```

### Promo Codes

**POST `/api/v1/events/:eventId/promos`**
```json
// Request
{
  "code": "SUMMER20",
  "discount_percentage": 20.0,
  "ticket_limit": 100,
  "expires_at": "2026-07-14T23:59:59Z"
}

// Response 201
{
  "status": "success",
  "data": {
    "id": "uuid",
    "event_id": "uuid",
    "code": "SUMMER20",
    "discount_percentage": 20.0,
    "ticket_limit": 100,
    "used_count": 0,
    "is_active": true,
    "expires_at": "2026-07-14T23:59:59Z",
    "created_at": "2026-02-05T10:00:00Z"
  }
}
```

**POST `/api/v1/promos/validate`**
```json
// Request
{
  "event_id": "uuid",
  "code": "SUMMER20"
}

// Response 200
{
  "status": "success",
  "data": {
    "valid": true,
    "discount_percentage": 20.0,
    "remaining_uses": 85
  }
}

// Response 400 (invalid)
{
  "status": "error",
  "error": {
    "code": "PROMO_INVALID",
    "message": "Promo code is expired or has reached its usage limit"
  }
}
```

### Scanner

**POST `/api/v1/scanner/verify-access`**
```json
// Request
{
  "event_id": "uuid",
  "access_code": "EVENT-ABC123"
}

// Response 200
{
  "status": "success",
  "data": {
    "verified": true,
    "event": {
      "id": "uuid",
      "title": "Summer Music Festival",
      "date": "2026-07-15"
    },
    "gate_label": "Gate A",
    "scanner_token": "temporary-jwt-for-scanning"
  }
}
```

**POST `/api/v1/scanner/validate`**
```json
// Request
{
  "qr_data": "{\"ticketId\":\"BUKR-4821-summer\",\"eventKey\":\"summer-music-festival-a3b2\"}",
  "event_id": "uuid"
}

// Response 200 (valid)
{
  "status": "success",
  "data": {
    "result": "valid",
    "ticket": {
      "ticket_id": "BUKR-4821-summer",
      "user_name": "Jane Attendee",
      "ticket_type": "General Admission",
      "quantity": 2
    }
  }
}

// Response 200 (already used)
{
  "status": "success",
  "data": {
    "result": "already_used",
    "ticket": {
      "ticket_id": "BUKR-4821-summer",
      "user_name": "Jane Attendee",
      "scanned_at": "2026-07-15T18:30:00Z"
    }
  }
}

// Response 200 (invalid)
{
  "status": "success",
  "data": {
    "result": "invalid",
    "message": "Ticket not found or does not belong to this event"
  }
}
```

**GET `/api/v1/scanner/:eventId/stats`**
```json
// Response 200
{
  "status": "success",
  "data": {
    "total_tickets": 500,
    "scanned": 247,
    "remaining": 253,
    "scan_rate": 49.4,
    "scans_by_gate": {
      "Gate A": 150,
      "Gate B": 97
    },
    "recent_scans": [
      {
        "ticket_id": "BUKR-4821-summer",
        "user_name": "Jane Attendee",
        "scanned_at": "2026-07-15T18:30:00Z",
        "result": "valid"
      }
    ]
  }
}
```

### Payments

**POST `/api/v1/payments/initialize`**
```json
// Request
{
  "ticket_id": "uuid",
  "provider": "paystack",
  "callback_url": "https://bukr.netlify.app/purchase/summer-music-festival-a3b2?payment=success"
}

// Response 200 (Paystack)
{
  "status": "success",
  "data": {
    "provider": "paystack",
    "authorization_url": "https://checkout.paystack.com/abc123xyz",
    "access_code": "abc123xyz",
    "reference": "BUKR-PAY-1707134400-abc"
  }
}

// Response 200 (Stripe)
{
  "status": "success",
  "data": {
    "provider": "stripe",
    "checkout_url": "https://checkout.stripe.com/c/pay/cs_live_...",
    "session_id": "cs_live_...",
    "reference": "BUKR-PAY-1707134400-xyz"
  }
}
```

**POST `/api/v1/payments/webhook/paystack`** (Paystack calls this)
```json
// Paystack sends this payload (verify with signature)
{
  "event": "charge.success",
  "data": {
    "reference": "BUKR-PAY-1707134400-abc",
    "status": "success",
    "amount": 800000,
    "currency": "NGN",
    "customer": {
      "email": "jane@example.com"
    }
  }
}
```

### Influencers

**POST `/api/v1/influencers`**
```json
// Request
{
  "name": "Jane Influencer",
  "email": "jane@social.com",
  "social_handle": "@jane_style",
  "bio": "Fashion and lifestyle influencer with 50k followers"
}

// Response 201
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Jane Influencer",
    "email": "jane@social.com",
    "social_handle": "@jane_style",
    "bio": "Fashion and lifestyle influencer with 50k followers",
    "referral_code": "INF-jane123",
    "referral_discount": 10.0,
    "total_referrals": 0,
    "total_revenue": 0,
    "created_at": "2026-02-05T10:00:00Z"
  }
}
```

### Favorites

**POST `/api/v1/favorites/:eventId`**
```json
// Response 201
{
  "status": "success",
  "data": {
    "event_id": "uuid",
    "favorited": true
  }
}
```

### Analytics

**GET `/api/v1/analytics/events/:eventId`**
```json
// Response 200
{
  "status": "success",
  "data": {
    "event_id": "uuid",
    "title": "Summer Music Festival",
    "total_tickets": 500,
    "sold_tickets": 325,
    "scanned_tickets": 247,
    "available_tickets": 175,
    "total_revenue": 1300000.00,
    "currency": "NGN",
    "average_rating": 4.2,
    "promo_usage": {
      "SUMMER20": { "used": 45, "revenue_impact": -450000.00 }
    },
    "sales_by_day": [
      { "date": "2026-02-01", "count": 15, "revenue": 60000.00 },
      { "date": "2026-02-02", "count": 22, "revenue": 88000.00 }
    ],
    "referral_stats": {
      "total_referral_sales": 30,
      "top_influencer": "Jane Influencer",
      "referral_revenue": 120000.00
    }
  }
}
```

### Standard Error Response
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "password", "message": "Must be at least 8 characters" }
    ]
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | User lacks permission for this action |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists (duplicate email, etc.) |
| `TICKETS_EXHAUSTED` | 409 | No tickets available for this event |
| `PROMO_INVALID` | 400 | Promo code is invalid, expired, or exhausted |
| `PROMO_LIMIT_REACHED` | 400 | Promo code has reached its usage limit |
| `PAYMENT_FAILED` | 402 | Payment processing failed |
| `PAYMENT_PENDING` | 202 | Payment is still processing |
| `TICKET_ALREADY_USED` | 409 | Ticket has already been scanned |
| `SCANNER_ACCESS_DENIED` | 403 | Invalid scanner access code |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 7. Authentication & Authorization

### Flow

```
1. User signs up → Supabase Auth creates auth user → Our DB creates profile row
2. User signs in → Supabase Auth returns JWT → Frontend stores in memory + refresh in httpOnly cookie
3. Every request → Go middleware validates JWT → Extracts user ID + user_type from claims
4. Role checks → Middleware checks user_type against endpoint requirements
```

### JWT Claims (from Supabase Auth)

```json
{
  "sub": "supabase-auth-uid",
  "email": "john@example.com",
  "role": "authenticated",
  "app_metadata": {
    "user_type": "organizer"
  },
  "exp": 1707138000
}
```

### Middleware Chain (Go/Fiber)

```
Request → CORS → Rate Limiter → Logger → Auth JWT → Role Check → Handler
```

1. **CORS**: Allow `bukr.netlify.app` origin, credentials
2. **Rate Limiter**: Redis-backed, 100 req/min per IP (public), 300 req/min (authenticated)
3. **Logger**: Structured JSON logs with request ID
4. **Auth JWT**: Validates Supabase JWT, extracts user claims, attaches to context
5. **Role Check**: `RequireAuth()`, `RequireOrganizer()`, `RequireOwner(resourceId)`

### Scanner Authentication

Scanners have a special auth flow since non-organizer staff may scan tickets:

1. Organizer creates scanner access codes per event (e.g., "Gate A: EVENT-ABC123")
2. Staff member opens scanner URL with `?code=EVENT-ABC123`
3. `POST /scanner/verify-access` validates the code
4. Returns a short-lived JWT (4 hours) scoped to that event only
5. This JWT allows only scan/validate operations for that specific event

---

## 8. Redis Caching Strategy

### Cache Keys

| Key Pattern | TTL | Purpose |
|------------|-----|---------|
| `session:{userId}` | 24h | User session data + refresh token |
| `event:{eventId}` | 5min | Single event details (hot cache) |
| `events:list:{hash}` | 2min | Paginated event listings |
| `events:featured` | 10min | Featured events list |
| `event:{eventId}:available` | 30s | Available ticket count (high-frequency reads) |
| `promo:{eventId}:{code}` | 5min | Promo code validation result |
| `user:{userId}:favorites` | 5min | User's favorited event IDs |
| `scanner:{eventId}:stats` | 30s | Live scan statistics |
| `ratelimit:{ip}` | 1min | Rate limiting counter |
| `ticket:lock:{eventId}:{userId}` | 5min | Prevent double-purchase (distributed lock) |

### Cache Invalidation

| Event | Keys Invalidated |
|-------|-----------------|
| Ticket purchased | `event:{id}:available`, `events:list:*`, `scanner:{id}:stats` |
| Event updated | `event:{id}`, `events:list:*`, `events:featured` |
| Promo created/updated | `promo:{eventId}:*` |
| Ticket scanned | `scanner:{eventId}:stats` |
| Favorite toggled | `user:{userId}:favorites` |

### Ticket Purchase Lock (Preventing Overselling)

```
1. User clicks "Purchase" →
2. Redis SET ticket:lock:{eventId}:{userId} NX EX 300 →
3. If lock acquired → proceed with purchase →
4. Check available_tickets in Postgres (row-level lock: SELECT ... FOR UPDATE) →
5. If available → create ticket + decrement count →
6. Release lock →
7. If lock NOT acquired → return "Purchase already in progress"
```

---

## 9. Payment Integration

### Payment Flow

```
Frontend                   Go Gateway                Rust Core              Paystack/Stripe
   │                           │                         │                        │
   │  POST /tickets/purchase   │                         │                        │
   ├──────────────────────────►│                         │                        │
   │                           │  gRPC: CreateTicket     │                        │
   │                           ├────────────────────────►│                        │
   │                           │                         │ Validate promo, check  │
   │                           │                         │ availability, create   │
   │                           │                         │ pending ticket         │
   │                           │                         │                        │
   │                           │                         │ POST /transaction/init │
   │                           │                         ├───────────────────────►│
   │                           │                         │                        │
   │                           │                         │◄───────────────────────┤
   │                           │                         │  { authorization_url } │
   │                           │◄────────────────────────┤                        │
   │◄──────────────────────────┤  { ticket + payment }   │                        │
   │                           │                         │                        │
   │  Redirect to checkout     │                         │                        │
   ├─────────────────────────────────────────────────────────────────────────────►│
   │                           │                         │                        │
   │                           │                         │  Webhook: charge.success│
   │                           │                         │◄───────────────────────┤
   │                           │                         │  Verify signature      │
   │                           │                         │  Update ticket status  │
   │                           │                         │  to "valid"            │
   │  Redirect back to app     │                         │                        │
   │◄──────────────────────────────────────────────────────────────────────────── │
```

### Paystack Integration

```
Endpoint: https://api.paystack.co/transaction/initialize
Headers: Authorization: Bearer {PAYSTACK_SECRET_KEY}

Initialize payment:
POST /transaction/initialize
{
  "email": "user@example.com",
  "amount": 800000,           // Amount in kobo (₦8,000 = 800000 kobo)
  "currency": "NGN",
  "reference": "BUKR-PAY-{timestamp}-{random}",
  "callback_url": "https://bukr.netlify.app/purchase/{eventKey}?ref={reference}",
  "metadata": {
    "ticket_id": "uuid",
    "event_id": "uuid",
    "quantity": 2
  }
}

Webhook verification:
- Validate X-Paystack-Signature header using HMAC SHA512
- Compute hash of request body with PAYSTACK_SECRET_KEY
- Compare hashes to verify authenticity
```

### Stripe Integration

```
For international payments (non-NGN currencies):

Create Checkout Session:
POST https://api.stripe.com/v1/checkout/sessions
{
  "payment_method_types": ["card"],
  "line_items": [{
    "price_data": {
      "currency": "usd",
      "product_data": { "name": "Summer Music Festival x2" },
      "unit_amount": 2000
    },
    "quantity": 2
  }],
  "mode": "payment",
  "success_url": "https://bukr.netlify.app/purchase/{eventKey}?session_id={CHECKOUT_SESSION_ID}",
  "cancel_url": "https://bukr.netlify.app/purchase/{eventKey}?cancelled=true",
  "metadata": {
    "ticket_id": "uuid",
    "event_id": "uuid"
  }
}

Webhook verification:
- Validate Stripe-Signature header
- Use stripe.webhooks.constructEvent()
- Handle checkout.session.completed event
```

### Provider Selection Logic

```
if currency == "NGN" → Paystack
else → Stripe
```

The frontend detects the user's currency from the event's `currency` field and passes `payment_provider` in the purchase request.

---

## 10. Infrastructure & Deployment

### Netlify (Frontend)

```
Build:
  Command: npm run build
  Publish: dist/
  Node: 20.x

Environment Variables:
  VITE_API_URL=https://bukr-api.onrender.com
  VITE_SUPABASE_URL=https://xxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJ...

Redirects (_redirects file):
  /*    /index.html    200    (SPA fallback)

Headers:
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

### Render (Backend)

**Service 1: Go Gateway**
```yaml
# render.yaml
services:
  - type: web
    name: bukr-gateway
    runtime: docker
    dockerfilePath: backend/gateway/Dockerfile
    envVars:
      - key: PORT
        value: 8080
      - key: RUST_SERVICE_URL
        value: http://bukr-core:8081   # Internal service mesh
      - key: SUPABASE_URL
        fromGroup: supabase
      - key: SUPABASE_SERVICE_KEY
        fromGroup: supabase
      - key: SUPABASE_JWT_SECRET
        fromGroup: supabase
      - key: REDIS_URL
        fromService:
          name: bukr-redis
          type: redis
          property: connectionString
      - key: ALLOWED_ORIGINS
        value: https://bukr.netlify.app
    healthCheckPath: /health
    autoDeploy: true
    plan: starter
```

**Service 2: Rust Core**
```yaml
  - type: web
    name: bukr-core
    runtime: docker
    dockerfilePath: backend/core/Dockerfile
    envVars:
      - key: PORT
        value: 8081
      - key: DATABASE_URL
        fromGroup: supabase
      - key: REDIS_URL
        fromService:
          name: bukr-redis
          type: redis
          property: connectionString
      - key: PAYSTACK_SECRET_KEY
        sync: false
      - key: STRIPE_SECRET_KEY
        sync: false
      - key: PAYSTACK_WEBHOOK_SECRET
        sync: false
      - key: STRIPE_WEBHOOK_SECRET
        sync: false
    healthCheckPath: /health
    autoDeploy: true
    plan: starter
```

**Service 3: Redis**
```yaml
  - type: redis
    name: bukr-redis
    plan: starter
    maxmemoryPolicy: allkeys-lru
```

### Docker (Go Gateway)

```dockerfile
# backend/gateway/Dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/main.go

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]
```

### Docker (Rust Core)

```dockerfile
# backend/core/Dockerfile
FROM rust:1.75-bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

COPY . .
RUN touch src/main.rs
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/bukr-core .
EXPOSE 8081
CMD ["./bukr-core"]
```

### Environment Variables Summary

| Variable | Service | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | Both | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Go | Supabase service role key (bypasses RLS) |
| `SUPABASE_ANON_KEY` | Frontend | Supabase public anon key |
| `SUPABASE_JWT_SECRET` | Go | For JWT verification |
| `DATABASE_URL` | Rust | Direct PostgreSQL connection string |
| `REDIS_URL` | Both | Redis connection string |
| `PAYSTACK_SECRET_KEY` | Rust | Paystack API secret |
| `PAYSTACK_WEBHOOK_SECRET` | Rust | For webhook signature validation |
| `STRIPE_SECRET_KEY` | Rust | Stripe API secret |
| `STRIPE_WEBHOOK_SECRET` | Rust | For webhook signature validation |
| `RUST_SERVICE_URL` | Go | Internal URL to Rust service |
| `ALLOWED_ORIGINS` | Go | CORS allowed origins |
| `LOG_LEVEL` | Both | `debug` / `info` / `warn` / `error` |

---

## 11. Architectural Concerns & Trade-offs

### 1. Why Modular Monolith Over Full Microservices?

**Chosen**: Shared database, separate runtimes with clear module boundaries.

**Rationale**:
- **Startup phase**: Avoid distributed transaction complexity until scale demands it
- **Shared DB** means no event sourcing or saga patterns needed for cross-module operations (e.g., ticket purchase touches events, tickets, payments, promos)
- Module boundaries are enforced at the code level (each module only queries its own tables)
- **Migration path**: When ready, extract any module into its own service by replacing repo calls with gRPC/HTTP

**Risk**: Tight coupling if developers bypass module boundaries and write cross-module SQL joins. Enforce through code review + linting rules.

### 2. Go ↔ Rust Communication

**Chosen**: gRPC with protobuf (via `tonic` in Rust, `google.golang.org/grpc` in Go).

**Why not plain HTTP?**
- Type-safe contracts via `.proto` files
- Binary serialization (faster than JSON for internal calls)
- Streaming support for future real-time features (live scan feed)
- Shared proto definitions ensure both services stay in sync

**Fallback**: If gRPC adds too much complexity initially, use internal HTTP with shared OpenAPI spec. The architectural boundary is the same either way.

### 3. Supabase Auth vs. Custom Auth

**Chosen**: Supabase Auth handles the identity layer. Our Go service handles authorization and business rules.

**What Supabase Auth does**:
- User registration, email/password storage, bcrypt hashing
- JWT issuance and refresh tokens
- Email verification, password reset flows
- OAuth providers (Google, GitHub) ready when needed

**What our Go service does**:
- Creates a `users` row in our table with `supabase_uid` FK
- Manages `user_type`, `org_name`, and app-specific profile data
- Role-based authorization (organizer vs user)
- Custom middleware validates the Supabase JWT

### 4. Ticket Purchase Race Conditions

**Problem**: Two users simultaneously buying the last 2 tickets when only 1 remains.

**Solution** (defense in depth):
1. **Redis distributed lock**: `SET ticket:lock:{eventId}:{userId} NX EX 300` prevents same-user double submission
2. **Postgres row lock**: `SELECT available_tickets FROM events WHERE id = $1 FOR UPDATE` ensures atomic read+decrement
3. **DB trigger**: `decrement_available_tickets()` raises exception if count would go negative
4. **Idempotency key**: Payment reference is unique; retried requests return existing result

### 5. Webhook Idempotency

**Problem**: Paystack/Stripe may send the same webhook multiple times.

**Solution**:
- `payment_transactions.provider_ref` has a UNIQUE constraint
- On webhook receipt: attempt INSERT, if conflict on `provider_ref` → check status → if already `success`, return 200 (idempotent)
- Store full webhook payload in `provider_response` JSONB for audit

### 6. Scanner Performance at Scale

**Problem**: 500 attendees arriving in a 30-minute window. Each scan must be sub-100ms.

**Solution**:
- Rust/Axum handles all scan operations (low latency, zero-cost abstractions)
- Redis caches `ticket:{ticketId} → status` for O(1) lookups
- Write-through: scan result written to Redis first, then Postgres asynchronously
- Scan log is append-only (INSERT, never UPDATE) for maximum write throughput

### 7. CORS & Security Headers

```
Go Fiber CORS config:
  AllowOrigins: ["https://bukr.netlify.app"]
  AllowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  AllowHeaders: ["Authorization", "Content-Type", "X-Request-ID"]
  AllowCredentials: true
  MaxAge: 3600

Security headers (middleware):
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: default-src 'self'
```

### 8. Rate Limiting Strategy

| Endpoint Category | Limit | Window | Key |
|-------------------|-------|--------|-----|
| Auth (signup/signin) | 5 | 15 min | IP |
| Public reads (events list) | 100 | 1 min | IP |
| Authenticated reads | 300 | 1 min | User ID |
| Ticket purchase | 3 | 5 min | User ID |
| Scanner validate | 60 | 1 min | Access code |
| Webhook endpoints | 1000 | 1 min | IP (Paystack/Stripe IPs) |

### 9. File Upload Strategy

Event thumbnails, fliers, and user avatars use **Supabase Storage**:

1. Frontend requests a presigned upload URL from Go gateway
2. Frontend uploads directly to Supabase Storage (no backend proxy)
3. Frontend sends the resulting URL in the event create/update payload
4. Supabase Storage handles CDN, resizing, and access control

### 10. Monitoring & Observability

| Concern | Tool | Notes |
|---------|------|-------|
| Logs | Render native logs | Structured JSON, request ID tracing |
| Errors | Sentry (both Go + Rust) | Panic recovery, error grouping |
| Metrics | Prometheus + Grafana | Render provides basic metrics free |
| Uptime | Render health checks | `/health` endpoints on both services |
| DB monitoring | Supabase dashboard | Query performance, connection pool |

### 11. Migration Path to Full Microservices

When scale demands it, the modular monolith can be split:

| Phase | Action |
|-------|--------|
| **Phase 1 (now)** | Monolith modules, shared DB, Go gateway proxies to Rust |
| **Phase 2** | Extract Payments into standalone service with its own DB |
| **Phase 3** | Extract Tickets + Scanner into standalone service |
| **Phase 4** | Add message queue (NATS/RabbitMQ) for async communication |
| **Phase 5** | Per-service databases, event sourcing for cross-service consistency |

The current architecture supports each phase without rewriting — modules already communicate through service interfaces, not direct DB access across boundaries.
