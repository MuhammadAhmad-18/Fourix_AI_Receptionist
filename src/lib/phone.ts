import { parsePhoneNumberWithError, ParseError } from "libphonenumber-js";

const DEFAULT_REGION = "PK";

/**
 * Normalizes to E.164 (e.g. "+923001234567"). Runs server-side in
 * PatientService, not in the React form — Phase 2's AI receptionist submits
 * numbers in arbitrary formats and must hit the same normalizer.
 * Returns null if the input can't be parsed as a valid number.
 */
export function normalizePhone(raw: string): string | null {
  try {
    const parsed = parsePhoneNumberWithError(raw, DEFAULT_REGION);
    return parsed.isValid() ? parsed.number : null;
  } catch (err) {
    if (err instanceof ParseError) return null;
    throw err;
  }
}
