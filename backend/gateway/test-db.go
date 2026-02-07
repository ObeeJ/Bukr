package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5"
)

func main() {
	// Supabase connection string
	dbURL := "postgresql://postgres.emcezfurwhednbfssqfk:bukrishere26@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

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
