#!/bin/bash
# Run all numbered migrations in order (skips one-off bundle files).
# Usage: DATABASE_URL='postgresql://...' ./run-migrations.sh

set -e

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL is not set"
    echo "Usage: DATABASE_URL='postgresql://...' ./run-migrations.sh"
    exit 1
fi

MIGRATIONS_DIR="$(dirname "$0")/migrations"

echo "Migrations: $MIGRATIONS_DIR"
echo ""

for migration in "$MIGRATIONS_DIR"/[0-9]*.sql; do
    [ -f "$migration" ] || continue
    echo "Running: $(basename "$migration")"
    psql "$DATABASE_URL" -f "$migration"
    echo "✓ Done: $(basename "$migration")"
    echo ""
done

echo "All migrations completed successfully!"
