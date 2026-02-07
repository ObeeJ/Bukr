use rust_decimal::Decimal;
use rust_decimal::prelude::FromPrimitive;
use sqlx::Row;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::promos::repository::PromoRepository;
use super::dto::{PurchaseTicketRequest, TicketResponse, PaymentInitResponse, PurchaseResponse};
use super::repository::TicketRepository;

pub struct TicketService {
    repo: TicketRepository,
    promo_repo: PromoRepository,
}

impl TicketService {
    pub fn new(repo: TicketRepository, promo_repo: PromoRepository) -> Self {
        Self { repo, promo_repo }
    }

    pub async fn purchase(
        &self,
        user_id: Uuid,
        req: PurchaseTicketRequest,
    ) -> Result<PurchaseResponse> {
        if req.quantity < 1 || req.quantity > 10 {
            return Err(AppError::Validation("Quantity must be between 1 and 10".into()));
        }

        let row = sqlx::query(
            r#"SELECT title, date::text as date, time::text as time, location, price, currency, available_tickets
            FROM events WHERE id = $1 AND status = 'active'"#,
        )
        .bind(req.event_id)
        .fetch_optional(self.repo.pool())
        .await
        .map_err(AppError::Database)?
        .ok_or_else(|| AppError::NotFound("Event not found".into()))?;

        let title: String = row.get("title");
        let date: String = row.get("date");
        let time: String = row.get("time");
        let location: String = row.get("location");
        let unit_price: Decimal = row.get("price");
        let currency: String = row.get("currency");
        let available: i32 = row.get("available_tickets");

        if available < req.quantity {
            return Err(AppError::TicketsExhausted);
        }

        let mut discount = Decimal::ZERO;

        let promo_code_id = if let Some(ref code) = req.promo_code {
            let promo = self.promo_repo.validate(req.event_id, code).await
                .map_err(AppError::Database)?;
            if let Some(p) = promo {
                discount = p.discount_percentage;
                Some(p.id)
            } else {
                return Err(AppError::PromoInvalid("Invalid or expired promo code".into()));
            }
        } else {
            None
        };

        let quantity_dec = Decimal::from_i32(req.quantity).unwrap_or(Decimal::ONE);
        let discount_multiplier = (Decimal::from(100) - discount) / Decimal::from(100);
        let total_price = unit_price * quantity_dec * discount_multiplier;

        let short_id = rand::random::<u16>();
        let ticket_id_str = format!("BUKR-{:04}-{}", short_id, &req.event_id.to_string()[..8]);

        let qr_data = serde_json::json!({
            "ticketId": ticket_id_str,
            "eventId": req.event_id.to_string(),
        })
        .to_string();

        let timestamp = chrono::Utc::now().timestamp();
        let pay_rand: u32 = rand::random();
        let payment_ref = format!("BUKR-PAY-{}-{:06x}", timestamp, pay_rand);

        let ticket_type = req.ticket_type.as_deref().unwrap_or("General Admission");

        let ticket = self.repo.create(
            req.event_id, user_id, &ticket_id_str, ticket_type, req.quantity,
            unit_price, total_price, discount, promo_code_id, &currency,
            &qr_data, &payment_ref, &req.payment_provider, req.excitement_rating,
        ).await.map_err(|e| {
            if e.to_string().contains("Not enough tickets") {
                AppError::TicketsExhausted
            } else {
                AppError::Database(e)
            }
        })?;

        let ticket_resp = TicketResponse {
            id: ticket.id, ticket_id: ticket.ticket_id, event_id: ticket.event_id,
            event_title: title, event_date: date, event_time: time, event_location: location,
            ticket_type: ticket.ticket_type, quantity: ticket.quantity,
            unit_price: ticket.unit_price, discount_applied: ticket.discount_applied,
            total_price: ticket.total_price, currency: ticket.currency.clone(),
            status: ticket.status, qr_code_data: ticket.qr_code_data,
            purchase_date: ticket.purchase_date,
        };

        let payment_resp = PaymentInitResponse {
            provider: req.payment_provider.clone(),
            authorization_url: Some(format!("https://checkout.paystack.com/{}", payment_ref)),
            checkout_url: None,
            reference: payment_ref,
            amount: total_price,
            currency: ticket.currency,
        };

        Ok(PurchaseResponse { ticket: ticket_resp, payment: payment_resp })
    }

    pub async fn get_user_tickets(&self, user_id: Uuid) -> Result<Vec<super::dto::Ticket>> {
        self.repo.get_user_tickets(user_id).await.map_err(AppError::Database)
    }

    pub async fn get_event_tickets(&self, event_id: Uuid) -> Result<Vec<super::dto::Ticket>> {
        self.repo.get_event_tickets(event_id).await.map_err(AppError::Database)
    }

    pub async fn mark_used(&self, ticket_id: &str, scanned_by: Option<Uuid>) -> Result<bool> {
        self.repo.mark_used(ticket_id, scanned_by).await.map_err(AppError::Database)
    }
}
