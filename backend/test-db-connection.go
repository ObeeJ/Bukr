package main

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
)

func main() {
	// Build connection string from environment or use default
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres.emcezfurwhednbfssqfk:bukrishere26@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
	}

	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}
	defer conn.Close(context.Background())

	// Test connection with version query
	var version string
	if err := conn.QueryRow(context.Background(), "SELECT version()").Scan(&version); err != nil {
		log.Fatalf("Query failed: %v", err)
	}

	log.Println("✅ Successfully connected to PostgreSQL!")
	log.Println("Database version:", version)
}
