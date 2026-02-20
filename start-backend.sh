#!/bin/bash
# Quick Start - Bukr Backend Services

set -e

echo "🚀 Starting Bukr Backend Services"
echo "=================================="

# Check if .env exists
if [ ! -f backend/.env ]; then
    echo "❌ backend/.env not found"
    echo "Copy backend/.env.example to backend/.env and configure"
    exit 1
fi

# Start Rust Core Service
echo ""
echo "1️⃣  Starting Rust Core Service (port 8081)..."
cd backend/core
cargo build --release 2>&1 | grep -E "Compiling|Finished" || true
RUST_LOG=info cargo run --release > ../../rust-core.log 2>&1 &
RUST_PID=$!
echo "   Rust Core PID: $RUST_PID"
cd ../..

# Wait for Rust to be ready
echo "   Waiting for Rust Core..."
for i in {1..10}; do
    if curl -sf http://localhost:8081/health > /dev/null 2>&1; then
        echo "   ✅ Rust Core ready"
        break
    fi
    sleep 1
done

# Start Go Gateway
echo ""
echo "2️⃣  Starting Go Gateway (port 8080)..."
cd backend/gateway
go run cmd/main.go > ../../gateway.log 2>&1 &
GATEWAY_PID=$!
echo "   Gateway PID: $GATEWAY_PID"
cd ../..

# Wait for Gateway to be ready
echo "   Waiting for Gateway..."
for i in {1..10}; do
    if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
        echo "   ✅ Gateway ready"
        break
    fi
    sleep 1
done

echo ""
echo "✅ Backend services running"
echo ""
echo "Services:"
echo "  - Gateway:   http://localhost:8080"
echo "  - Rust Core: http://localhost:8081"
echo ""
echo "Logs:"
echo "  - Gateway:   tail -f gateway.log"
echo "  - Rust Core: tail -f rust-core.log"
echo ""
echo "Stop services:"
echo "  kill $GATEWAY_PID $RUST_PID"
echo ""
echo "PIDs saved to .backend-pids"
echo "$GATEWAY_PID $RUST_PID" > .backend-pids
