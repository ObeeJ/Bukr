use uuid::Uuid;

use crate::error::{AppError, Result};
use super::dto::*;
use super::repository::PromoRepository;

pub struct PromoService {
    repo: PromoRepository,
}

impl PromoService {
    pub fn new(repo: PromoRepository) -> Self {
        Self { repo }
    }

    pub async fn list_by_event(&self, event_id: Uuid) -> Result<Vec<PromoResponse>> {
        let promos = self.repo.list_by_event(event_id).await.map_err(AppError::Database)?;

        Ok(promos.into_iter().map(|p| PromoResponse {
            id: p.id,
            event_id: p.event_id,
            code: p.code,
            discount_percentage: p.discount_percentage,
            ticket_limit: p.ticket_limit,
            used_count: p.used_count,
            is_active: p.is_active,
            expires_at: p.expires_at,
            created_at: p.created_at,
        }).collect())
    }

    pub async fn create(&self, event_id: Uuid, req: CreatePromoRequest) -> Result<PromoResponse> {
        if req.code.is_empty() {
            return Err(AppError::Validation("Promo code is required".into()));
        }

        let promo = self.repo.create(
            event_id,
            &req.code,
            req.discount_percentage,
            req.ticket_limit,
            req.expires_at,
        ).await.map_err(|e| {
            if e.to_string().contains("unique") || e.to_string().contains("duplicate") {
                AppError::Conflict("Promo code already exists for this event".into())
            } else {
                AppError::Database(e)
            }
        })?;

        Ok(PromoResponse {
            id: promo.id,
            event_id: promo.event_id,
            code: promo.code,
            discount_percentage: promo.discount_percentage,
            ticket_limit: promo.ticket_limit,
            used_count: promo.used_count,
            is_active: promo.is_active,
            expires_at: promo.expires_at,
            created_at: promo.created_at,
        })
    }

    pub async fn delete(&self, promo_id: Uuid, event_id: Uuid) -> Result<()> {
        let deleted = self.repo.delete(promo_id, event_id).await.map_err(AppError::Database)?;
        if !deleted {
            return Err(AppError::NotFound("Promo code not found".into()));
        }
        Ok(())
    }

    pub async fn toggle_active(&self, promo_id: Uuid, event_id: Uuid) -> Result<PromoResponse> {
        let promo = self.repo.toggle_active(promo_id, event_id)
            .await
            .map_err(AppError::Database)?
            .ok_or_else(|| AppError::NotFound("Promo code not found".into()))?;

        Ok(PromoResponse {
            id: promo.id,
            event_id: promo.event_id,
            code: promo.code,
            discount_percentage: promo.discount_percentage,
            ticket_limit: promo.ticket_limit,
            used_count: promo.used_count,
            is_active: promo.is_active,
            expires_at: promo.expires_at,
            created_at: promo.created_at,
        })
    }

    pub async fn validate(&self, req: ValidatePromoRequest) -> Result<ValidatePromoResponse> {
        let promo = self.repo.validate(req.event_id, &req.code)
            .await
            .map_err(AppError::Database)?;

        match promo {
            Some(p) => {
                let remaining = if p.ticket_limit > 0 {
                    Some(p.ticket_limit - p.used_count)
                } else {
                    None
                };

                Ok(ValidatePromoResponse {
                    valid: true,
                    discount_percentage: p.discount_percentage,
                    remaining_uses: remaining,
                })
            }
            None => Err(AppError::PromoInvalid("Promo code is invalid, expired, or has reached its usage limit".into())),
        }
    }
}
