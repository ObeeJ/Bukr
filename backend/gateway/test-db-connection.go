package main

import (
        "context"
        "log"
        "os"

        "github.com/jackc/pgx/v5"
        "github.com/joho/godotenv"
)

func main() {
        // Load .env file
        if err := godotenv.Load("../.env"); err != nil {
                log.Println("No .env file found in parent directory, continuing with environment variables")
        }

        // Build connection string from environment
        dbURL := os.Getenv("DATABASE_URL")
        if dbURL == "" {
                log.Fatal("DATABASE_URL environment variable is not set")
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

