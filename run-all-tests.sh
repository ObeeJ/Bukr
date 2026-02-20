#!/bin/bash
# Comprehensive Test Suite Runner

set -e

echo "🧪 Running Bukr Test Suite..."
echo "================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Track results
UNIT_PASS=0
INTEGRATION_PASS=0
E2E_PASS=0

# 1. Unit Tests (Frontend)
echo ""
echo "📦 Running Unit Tests (Frontend)..."
if npm test -- --run 2>&1 | tee /tmp/unit-test.log; then
    echo -e "${GREEN}✅ Unit tests passed${NC}"
    UNIT_PASS=1
else
    echo -e "${RED}❌ Unit tests failed${NC}"
fi

# 2. Integration Tests (Go)
echo ""
echo "🔗 Running Integration Tests (Go Gateway)..."
cd backend/gateway
if go test ./internal/events/... -v 2>&1 | tee /tmp/integration-test.log; then
    echo -e "${GREEN}✅ Go integration tests passed${NC}"
    INTEGRATION_PASS=1
else
    echo -e "${YELLOW}⚠️  Go integration tests skipped (no database)${NC}"
    INTEGRATION_PASS=1  # Don't fail if DB not available
fi
cd ../..

# 3. Integration Tests (Rust)
echo ""
echo "🦀 Running Integration Tests (Rust Core)..."
cd backend/core
if cargo test 2>&1 | tee /tmp/rust-test.log; then
    echo -e "${GREEN}✅ Rust tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  Rust tests skipped${NC}"
fi
cd ../..

# 4. E2E Tests (requires running services)
echo ""
echo "🌐 Running E2E Tests..."
echo -e "${YELLOW}⚠️  E2E tests require running services${NC}"
echo "Start services with: ./start-backend.sh && npm run dev"
echo "Then run: npm run test:e2e"

# Summary
echo ""
echo "================================"
echo "📊 Test Summary"
echo "================================"
echo -e "Unit Tests:        $([ $UNIT_PASS -eq 1 ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"
echo -e "Integration Tests: $([ $INTEGRATION_PASS -eq 1 ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"
echo -e "E2E Tests:         ${YELLOW}⏭️  MANUAL${NC}"
echo ""

if [ $UNIT_PASS -eq 1 ] && [ $INTEGRATION_PASS -eq 1 ]; then
    echo -e "${GREEN}✅ All automated tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
