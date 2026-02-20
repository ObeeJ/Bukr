#!/bin/bash
# Run all database migrations in order

set -e

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    echo "Usage: DATABASE_URL='postgresql://...' ./run-migrations.sh"
    exit 1
fi

MIGRATIONS_DIR="$(dirname "$0")/migrations"

echo "Running migrations from: $MIGRATIONS_DIR"
echo "Database: $DATABASE_URL"
echo ""

for migration in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration" ]; then
        echo "Running: $(basename "$migration")"
        psql "$DATABASE_URL" -f "$migration"
        echo "✓ Completed: $(basename "$migration")"
        echo ""
    fi
done

echo "All migrations completed successfully!"
