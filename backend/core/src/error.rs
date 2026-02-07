use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("not found: {0}")]
    NotFound(String),

    #[error("validation error: {0}")]
    Validation(String),

    #[error("unauthorized")]
    Unauthorized,

    #[error("forbidden")]
    Forbidden,

    #[error("conflict: {0}")]
    Conflict(String),

    #[error("tickets exhausted")]
    TicketsExhausted,

    #[error("invalid promo code: {0}")]
    PromoInvalid(String),

    #[error("payment failed: {0}")]
    PaymentFailed(String),

    #[error("ticket already used")]
    TicketAlreadyUsed,

    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("internal error: {0}")]
    Internal(String),
}

#[derive(Serialize)]
struct ErrorBody {
    status: String,
    error: ErrorDetail,
}

#[derive(Serialize)]
struct ErrorDetail {
    code: String,
    message: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, "NOT_FOUND", msg.clone()),
            AppError::Validation(msg) => (StatusCode::BAD_REQUEST, "VALIDATION_ERROR", msg.clone()),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized".to_string()),
            AppError::Forbidden => (StatusCode::FORBIDDEN, "FORBIDDEN", "Forbidden".to_string()),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, "CONFLICT", msg.clone()),
            AppError::TicketsExhausted => (StatusCode::CONFLICT, "TICKETS_EXHAUSTED", "No tickets available".to_string()),
            AppError::PromoInvalid(msg) => (StatusCode::BAD_REQUEST, "PROMO_INVALID", msg.clone()),
            AppError::PaymentFailed(msg) => (StatusCode::PAYMENT_REQUIRED, "PAYMENT_FAILED", msg.clone()),
            AppError::TicketAlreadyUsed => (StatusCode::CONFLICT, "TICKET_ALREADY_USED", "Ticket has already been scanned".to_string()),
            AppError::Database(err) => {
                tracing::error!("Database error: {:?}", err);
                (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Internal server error".to_string())
            }
            AppError::Internal(msg) => {
                tracing::error!("Internal error: {}", msg);
                (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Internal server error".to_string())
            }
        };

        let body = ErrorBody {
            status: "error".to_string(),
            error: ErrorDetail {
                code: code.to_string(),
                message,
            },
        };

        (status, Json(body)).into_response()
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
