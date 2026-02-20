/**
 * DOMAIN LAYER - Error Handling
 * 
 * AppError: The diplomat of failures - translating problems into HTTP responses
 * 
 * Architecture Layer: Domain (Layer 4)
 * Dependencies: None (pure domain logic)
 * Responsibility: Define all possible errors, map to HTTP status codes
 * 
 * Why custom errors? Because "database error" tells you nothing
 * "TICKETS_EXHAUSTED" tells you exactly what went wrong
 */

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

/**
 * AppError: Every way things can go wrong in Bukr
 * 
 * Each variant represents a specific business error
 * Using thiserror crate for automatic Error trait implementation
 */
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("not found: {0}")]
    NotFound(String),                    // 404 - Resource doesn't exist

    #[error("validation error: {0}")]
    Validation(String),                  // 400 - Bad request data

    #[error("bad request: {0}")]
    BadRequest(String),                  // 400 - Invalid request

    #[error("unauthorized")]
    Unauthorized,                        // 401 - Missing or invalid auth

    #[error("forbidden")]
    Forbidden,                           // 403 - Authenticated but not allowed

    #[error("conflict: {0}")]
    Conflict(String),                    // 409 - Resource conflict

    #[error("tickets exhausted")]
    TicketsExhausted,                    // 409 - Sold out, sorry!

    #[error("invalid promo code: {0}")]
    PromoInvalid(String),                // 400 - Fake discount detected

    #[error("payment failed: {0}")]
    PaymentFailed(String),               // 402 - Money problems

    #[error("ticket already used")]
    TicketAlreadyUsed,                   // 409 - Can't scan twice

    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),       // 500 - Database said no

    #[error("internal error: {0}")]
    Internal(String),                    // 500 - Something unexpected
}

/**
 * ErrorBody: Standard error response format
 * 
 * Consistent structure across all endpoints
 * Frontend knows exactly what to expect
 */
#[derive(Serialize)]
struct ErrorBody {
    status: String,      // Always "error" for errors
    error: ErrorDetail,  // The juicy details
}

/**
 * ErrorDetail: The actual error information
 * 
 * code: Machine-readable error code (TICKETS_EXHAUSTED)
 * message: Human-readable explanation
 */
#[derive(Serialize)]
struct ErrorDetail {
    code: String,        // Error code for frontend logic
    message: String,     // Error message for users
}

/**
 * IntoResponse implementation: Convert AppError to HTTP response
 * 
 * This is Axum magic - any handler can return Result<T, AppError>
 * Axum automatically converts AppError to proper HTTP response
 * 
 * Pattern matching maps each error to:
 * 1. HTTP status code (404, 400, 500, etc)
 * 2. Error code string (for frontend)
 * 3. User-friendly message
 */
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        // Map each error variant to (status, code, message)
        let (status, code, message) = match &self {
            // 404 errors - resource not found
            AppError::NotFound(msg) => 
                (StatusCode::NOT_FOUND, "NOT_FOUND", msg.clone()),
            
            // 400 errors - bad request
            AppError::Validation(msg) => 
                (StatusCode::BAD_REQUEST, "VALIDATION_ERROR", msg.clone()),
            AppError::BadRequest(msg) => 
                (StatusCode::BAD_REQUEST, "BAD_REQUEST", msg.clone()),
            AppError::PromoInvalid(msg) => 
                (StatusCode::BAD_REQUEST, "PROMO_INVALID", msg.clone()),
            
            // 401 error - authentication required
            AppError::Unauthorized => 
                (StatusCode::UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized".to_string()),
            
            // 403 error - authenticated but not allowed
            AppError::Forbidden => 
                (StatusCode::FORBIDDEN, "FORBIDDEN", "Forbidden".to_string()),
            
            // 409 errors - conflicts
            AppError::Conflict(msg) => 
                (StatusCode::CONFLICT, "CONFLICT", msg.clone()),
            AppError::TicketsExhausted => 
                (StatusCode::CONFLICT, "TICKETS_EXHAUSTED", "No tickets available".to_string()),
            AppError::TicketAlreadyUsed => 
                (StatusCode::CONFLICT, "TICKET_ALREADY_USED", "Ticket has already been scanned".to_string()),
            
            // 402 error - payment required
            AppError::PaymentFailed(msg) => 
                (StatusCode::PAYMENT_REQUIRED, "PAYMENT_FAILED", msg.clone()),
            
            // 500 errors - server problems
            // Log these because they're unexpected
            AppError::Database(err) => {
                tracing::error!("Database error: {:?}", err);
                (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Internal server error".to_string())
            }
            AppError::Internal(msg) => {
                tracing::error!("Internal error: {}", msg);
                (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Internal server error".to_string())
            }
        };

        // Build standard error response body
        let body = ErrorBody {
            status: "error".to_string(),
            error: ErrorDetail {
                code: code.to_string(),
                message,
            },
        };

        // Convert to HTTP response with status code and JSON body
        (status, Json(body)).into_response()
    }
}

/**
 * Result type alias: Shorthand for Result<T, AppError>
 * 
 * Instead of writing Result<Ticket, AppError> everywhere,
 * we can just write Result<Ticket>
 * 
 * Rust convention - makes code cleaner
 */
pub type Result<T> = std::result::Result<T, AppError>;
