/**
 * INFRASTRUCTURE LAYER - Database Connection Pool
 * 
 * Database Pool: The connection manager - keeping database connections warm and ready
 * 
 * Architecture Layer: Infrastructure (Layer 6)
 * Dependencies: PostgreSQL (via pgx)
 * Responsibility: Create, configure, and manage database connection pool
 * 
 * Why connection pooling? Because:
 * 1. Opening connections is expensive (TCP handshake, SSL, auth)
 * 2. Databases have connection limits
 * 3. Reusing connections is 10x faster
 * 
 * Think of it as keeping a fleet of taxis ready instead of
 * calling one from the garage every time
 */

package shared

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func NewDatabasePool(databaseURL string) *pgxpool.Pool {
	if databaseURL == "" {
		log.Println("WARNING: No DATABASE_URL provided, skipping database connection")
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		log.Fatalf("Failed to parse DATABASE_URL: %v", err)
	}

	// Transaction-mode pooler (port 6543) does not support prepared statements.
	// SimpleProtocol sends queries as plain text — required for PgBouncer transaction mode.
	config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	// Keep min low: pooler multiplexes connections, no need to pre-warm many.
	config.MaxConns = 20
	config.MinConns = 2
	config.MaxConnLifetime = 30 * time.Minute
	config.MaxConnIdleTime = 5 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		log.Fatalf("Failed to create connection pool: %v", err)
	}

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	log.Println("Database connection pool established (max=20, min=2, simple-protocol)")
	return pool
}
