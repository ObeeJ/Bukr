import api, { mapFromApi } from '@/lib/api';
import { ScanValidationResult, ScannerStats } from '@/types';

/**
 * normalizeResult
 * High-level: Translates the raw Rust backend response into a clean frontend type.
 * Low-level: Maps `result === 'valid'` → isValid bool; remaps 'already_used' → 'used';
 * normalizes snake_case ticket fields (ticket_id, user_name…) to camelCase.
 * Called by every validate function so the rest of the app never sees raw API shapes.
 */
export function normalizeResult(raw: any): ScanValidationResult {
  return {
    isValid: raw.result === 'valid',
    status: raw.result === 'already_used' ? 'used' : raw.result,
    message: raw.message || '',
    ticket: raw.ticket ? {
      ticketId: raw.ticket.ticket_id || raw.ticket.ticketId,
      userName: raw.ticket.user_name || raw.ticket.userName || '',
      ticketType: raw.ticket.ticket_type || raw.ticket.ticketType || '',
      quantity: raw.ticket.quantity || 1,
      scannedAt: raw.ticket.scanned_at || raw.ticket.scannedAt,
    } : undefined,
  };
}

/**
 * validateTicket
 * High-level: Validates a ticket scanned via QR code at the event gate.
 * Low-level: POSTs { ticket_id, event_key } to /scanner/validate, then normalizes
 * the response. Used by the QR scanner component on the scanner screen.
 */
export const validateTicket = async (ticketId: string, eventKey: string): Promise<ScanValidationResult> => {
  const { data } = await api.post('/scanner/validate', {
    ticket_id: ticketId,
    event_key: eventKey,
  });
  return normalizeResult(data);
};

/**
 * manualValidateTicket
 * High-level: Validates a ticket entered manually (no QR scan) — fallback for damaged QR codes.
 * Low-level: Same payload/response shape as validateTicket but hits /scanner/manual-validate,
 * which may apply different rate-limiting or logging on the backend.
 */
export const manualValidateTicket = async (ticketId: string, eventKey: string): Promise<ScanValidationResult> => {
  const { data } = await api.post('/scanner/manual-validate', {
    ticket_id: ticketId,
    event_key: eventKey,
  });
  return normalizeResult(data);
};

/**
 * markTicketUsed
 * High-level: Explicitly marks a ticket as consumed/used on the backend.
 * Low-level: Sends a PATCH to /scanner/mark-used/:ticketId with no body.
 * Called after a successful validation to prevent double-entry.
 */
export const markTicketUsed = async (ticketId: string): Promise<void> => {
  await api.patch(`/scanner/mark-used/${ticketId}`);
};

/**
 * getScannerStats
 * High-level: Fetches live scan statistics for an event (total scanned, remaining, etc.).
 * Low-level: GETs /scanner/:eventId/stats and runs mapFromApi to convert snake_case
 * fields to camelCase before returning a typed ScannerStats object.
 */
export const getScannerStats = async (eventId: string): Promise<ScannerStats> => {
  const { data } = await api.get(`/scanner/${eventId}/stats`);
  return mapFromApi<ScannerStats>(data);
};

/**
 * verifyAccess
 * High-level: Authenticates a scanner operator before they can scan tickets for an event.
 * Low-level: POSTs { event_key, access_code } to /scanner/verify-access.
 * The backend returns { verified, event }; we remap `verified` → `valid` so the
 * rest of the app uses a consistent boolean field name.
 */
export const verifyAccess = async (eventKey: string, accessCode: string): Promise<{ valid: boolean; event?: { title: string } }> => {
  const { data } = await api.post('/scanner/verify-access', {
    event_key: eventKey,
    access_code: accessCode,
  });
  // Normalize: service returns { verified, event } — map to { valid, event }
  const mapped = mapFromApi<{ verified: boolean; event?: { title: string } }>(data);
  return { valid: mapped.verified, event: mapped.event };
};
