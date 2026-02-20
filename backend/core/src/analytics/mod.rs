/**
 * INFRASTRUCTURE LAYER - Module Exports
 * 
 * Analytics Module: Exposes analytics handlers
 * 
 * Architecture Layer: Infrastructure (Layer 6)
 * Exports:
 * - handler: Controller layer (HTTP endpoints)
 * 
 * Note: Analytics uses direct database queries (no service/repository layers)
 * for simplicity and performance of read-only aggregations
 */

pub mod handler;
