package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
)

func main() {
	// Supabase connection string - Load from environment
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("❌ DATABASE_URL environment variable not set")
	}

	fmt.Println("🔌 Connecting to Supabase PostgreSQL...")

	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("❌ Failed to connect to the database: %v", err)
	}
	defer conn.Close(context.Background())

	// Test connection with version query
	var version string
	if err := conn.QueryRow(context.Background(), "SELECT version()").Scan(&version); err != nil {
		log.Fatalf("❌ Query failed: %v", err)
	}

	fmt.Println("✅ Successfully connected to PostgreSQL!")
	fmt.Println("📊 Database version:", version)

	// Test a simple query to ensure read access
	var count int
	if err := conn.QueryRow(context.Background(), "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'").Scan(&count); err != nil {
		log.Printf("⚠️  Warning: Could not query tables: %v", err)
	} else {
		fmt.Printf("📋 Found %d tables in public schema\n", count)
	}

	fmt.Println("🎉 Database connection test completed successfully!")
}
