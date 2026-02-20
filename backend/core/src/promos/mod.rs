/**
 * INFRASTRUCTURE LAYER - Module Exports
 * 
 * Promos Module: Exposes promo code handlers, services, and repositories
 * 
 * Architecture Layer: Infrastructure (Layer 6)
 * Exports:
 * - handler: Controller layer (HTTP endpoints)
 * - service: Use case layer (business logic)
 * - repository: Repository layer (database operations)
 * - dto: Domain layer (data structures)
 */

pub mod handler;
pub mod service;
pub mod repository;
pub mod dto;
