/**
 * USE CASE LAYER - Promo Code Business Logic
 * 
 * Promo Service: The discount calculator - managing promotional offers
 * 
 * Architecture Layer: Use Case (Layer 3)
 * Dependencies: Repository (database operations)
 * Responsibility: Promo code validation, creation, lifecycle management
 * 
 * Business Rules:
 * 1. Unique codes per event (no duplicates)
 * 2. Usage limits (prevent over-redemption)
 * 3. Expiration dates (time-bound offers)
 * 4. Active/inactive states (pause without deleting)
 * 
 * Validation Logic:
 * - Code must be active
 * - Not expired
 * - Usage limit not exceeded
 * - Belongs to correct event
 */

use uuid::Uuid;

use crate::error::{AppError, Result};
use super::dto::*;
use super::repository::PromoRepository;

/**
 * PromoService: The discount manager
 * 
 * Handles promo code lifecycle:
 * - Creation with validation
 * - Listing and filtering
 * - Activation/deactivation
 * - Validation during checkout
 */
pub struct PromoService {
    repo: PromoRepository,    // Database operations
}

impl PromoService {
    /**
     * Constructor: Initialize promo service
     */
    pub fn new(repo: PromoRepository) -> Self {
        Self { repo }
    }

    /**
     * List Promo Codes by Event
     * 
     * Fetch all promo codes for an event
     * Includes active, inactive, and expired codes
     * 
     * @param event_id - Event ID
     * @returns List of promo codes
     */
    pub async fn list_by_event(&self, event_id: Uuid) -> Result<Vec<PromoResponse>> {
        let promos = self.repo.list_by_event(event_id).await.map_err(AppError::Database)?;

        // Map database models to response DTOs
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

    /**
     * Create Promo Code
     * 
     * Business logic:
     * 1. Validate code is not empty
     * 2. Create in database
     * 3. Handle duplicate code errors
     * 
     * @param event_id - Event ID
     * @param req - Promo creation request
     * @returns Created promo code
     */
    pub async fn create(&self, event_id: Uuid, req: CreatePromoRequest) -> Result<PromoResponse> {
        // Validation: code cannot be empty
        if req.code.is_empty() {
            return Err(AppError::Validation("Promo code is required".into()));
        }

        // Create promo code
        let promo = self.repo.create(
            event_id,
            &req.code,
            req.discount_percentage,
            req.ticket_limit,
            req.expires_at,
        ).await.map_err(|e| {
            // Handle duplicate code error
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

    /**
     * Delete Promo Code
     * 
     * Remove promo code from event
     * Does not affect tickets already purchased with code
     * 
     * @param promo_id - Promo code ID
     * @param event_id - Event ID (for authorization)
     * @returns Success or NotFound error
     */
    pub async fn delete(&self, promo_id: Uuid, event_id: Uuid) -> Result<()> {
        let deleted = self.repo.delete(promo_id, event_id).await.map_err(AppError::Database)?;
        if !deleted {
            return Err(AppError::NotFound("Promo code not found".into()));
        }
        Ok(())
    }

    /**
     * Toggle Promo Active Status
     * 
     * Enable or disable promo code
     * Useful for pausing codes without deleting them
     * 
     * @param promo_id - Promo code ID
     * @param event_id - Event ID (for authorization)
     * @returns Updated promo code
     */
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

    /**
     * Validate Promo Code
     * 
     * Check if promo code can be used for ticket purchase
     * 
     * Validation Rules:
     * 1. Code exists for event
     * 2. Code is active
     * 3. Not expired
     * 4. Usage limit not reached (if set)
     * 
     * @param req - Validation request (event_id, code)
     * @returns Discount percentage and remaining uses
     */
    pub async fn validate(&self, req: ValidatePromoRequest) -> Result<ValidatePromoResponse> {
        // Query promo code with all validation checks
        let promo = self.repo.validate(req.event_id, &req.code)
            .await
            .map_err(AppError::Database)?;

        match promo {
            Some(p) => {
                // Calculate remaining uses
                let remaining = if p.ticket_limit > 0 {
                    Some(p.ticket_limit - p.used_count)
                } else {
                    None    // Unlimited uses
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
