// Validates international phone numbers — E.164 format or common local formats.
// Accepts +234XXXXXXXXXX, 0XXXXXXXXXX, and similar patterns.
export function validatePhone(phone: string): boolean {
  return /^\+?[0-9\s\-().]{7,20}$/.test(phone.trim());
}
