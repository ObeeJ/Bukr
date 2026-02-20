# Quick Start Guide

## Prerequisites
- Go 1.21+
- Rust 1.70+
- PostgreSQL (via Supabase)
- Node.js 18+

## Setup

### 1. Install Dependencies
```bash
# Backend Go
cd backend/gateway && go mod download && cd ../..

# Backend Rust
cd backend/core && cargo build && cd ../..

# Frontend
npm install
```

### 2. Configure Environment
```bash
# Already configured in backend/.env
# Update if needed: DATABASE_URL, SUPABASE_* keys
```

### 3. Run Database Migrations
```bash
cd backend
./run-migrations.sh
cd ..
```

## Running the Application

### Option 1: Automated (Recommended)
```bash
# Start backend services (Gateway + Rust Core)
./start-backend.sh

# In another terminal, start frontend
npm run dev

# Stop backend when done
./stop-backend.sh
```

### Option 2: Manual
```bash
# Terminal 1: Rust Core
cd backend/core
cargo run

# Terminal 2: Go Gateway
cd backend/gateway
go run cmd/main.go

# Terminal 3: Frontend
npm run dev
```

## Access

- **Frontend:** http://localhost:5173
- **Gateway API:** http://localhost:8080
- **Rust Core API:** http://localhost:8081

## Testing

```bash
# Integration tests (requires backend running)
./test-integration.sh

# API contract tests
cd backend && ./test-api-contract.sh
```

## Troubleshooting

### Gateway won't start
```bash
# Fix dependencies
cd backend/gateway
go mod tidy
```

### Port already in use
```bash
# Kill processes
./stop-backend.sh
# Or manually
lsof -ti:8080 | xargs kill -9
lsof -ti:8081 | xargs kill -9
```

### Database connection failed
- Check `backend/.env` DATABASE_URL
- Verify Supabase project is active
- Test connection: `cd backend && go run test-db-connection.go`

## Development Workflow

1. **Make changes** to code
2. **Restart services** (Ctrl+C and rerun)
3. **Test** with `./test-integration.sh`
4. **Commit** changes

## Production Build

```bash
# Frontend
npm run build

# Backend binaries
cd backend/gateway && go build -o gateway cmd/main.go
cd ../core && cargo build --release
```

## Next Steps

- Review API contract: `backend/openapi.yaml`
- Read architecture docs: `BACKEND_ARCHITECTURE.md`
- Check audit report: `API_CONTRACT_AUDIT.md`
