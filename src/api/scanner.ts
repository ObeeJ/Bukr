import api, { mapFromApi } from '@/lib/api';
import { ScanValidationResult, ScannerStats } from '@/types';

/** POST /scanner/validate — validate ticket by QR data */
export const validateTicket = async (ticketId: string, eventKey: string): Promise<ScanValidationResult> => {
  const { data } = await api.post('/scanner/validate', {
    ticket_id: ticketId,
    event_key: eventKey,
  });
  return mapFromApi<ScanValidationResult>(data);
};

/** POST /scanner/manual-validate — manual ticket ID entry */
export const manualValidateTicket = async (ticketId: string, eventId: string): Promise<ScanValidationResult> => {
  const { data } = await api.post('/scanner/manual-validate', {
    ticket_id: ticketId,
    event_id: eventId,
  });
  return mapFromApi<ScanValidationResult>(data);
};

/** PATCH /scanner/mark-used/:ticketId — mark ticket as used */
export const markTicketUsed = async (ticketId: string): Promise<void> => {
  await api.patch(`/scanner/mark-used/${ticketId}`);
};

/** GET /scanner/:eventId/stats */
export const getScannerStats = async (eventId: string): Promise<ScannerStats> => {
  const { data } = await api.get(`/scanner/${eventId}/stats`);
  return mapFromApi<ScannerStats>(data);
};

/** POST /scanner/verify-access — verify scanner access code */
export const verifyAccess = async (eventId: string, accessCode: string): Promise<{ valid: boolean }> => {
  const { data } = await api.post('/scanner/verify-access', {
    event_id: eventId,
    access_code: accessCode,
  });
  return data;
};
