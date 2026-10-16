/**
 * Indian Mobile Number Normalization and Validation Utilities
 */

/**
 * Extracts and cleans the 10 numeric digits from raw input.
 * Handles pasted values with +91, 91, 0 prefixes, spaces, dashes, etc.
 *
 * @param {string} raw
 * @returns {string} exactly up to 10 numeric digits
 */
export const cleanIndianMobileDigits = (raw) => {
  if (!raw) return '';
  let str = String(raw).trim();

  // Strip all non-digit characters
  let digits = str.replace(/\D/g, '');

  // If starts with 91 and has 12 digits (+91 9876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    // Leading trunk 0 (e.g. 09876543210)
    digits = digits.slice(1);
  }

  // Restrict to max 10 digits
  return digits.slice(0, 10);
};

/**
 * Formats 10 cleaned digits into the standard backend E.164 format (+91XXXXXXXXXX).
 *
 * @param {string} digits 10-digit number
 * @returns {string} E.164 formatted number (+91XXXXXXXXXX)
 */
export const formatToE164 = (digits) => {
  const clean = cleanIndianMobileDigits(digits);
  return clean ? `+91${clean}` : '';
};

/**
 * Validates whether the digits represent a valid 10-digit Indian mobile number.
 *
 * @param {string} digits
 * @returns {boolean}
 */
export const isValidIndianMobile = (digits) => {
  const clean = cleanIndianMobileDigits(digits);
  return /^[6-9]\d{9}$/.test(clean);
};

/**
 * Validates a person's full name:
 * - Must be a non-empty string.
 * - Must contain only alphabetic characters, spaces, periods, hyphens, and apostrophes.
 * - Numbers-only or special-character-only strings are strictly rejected.
 * - Must contain at least 2 alphabetic letters.
 *
 * @param {string} name
 * @returns {boolean}
 */
export const isValidFullName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 70) return false;
  // Must only contain letters, spaces, dots, hyphens, and apostrophes
  if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) return false;
  // Must contain at least 2 letters
  const letters = (trimmed.match(/[a-zA-Z]/g) || []).length;
  return letters >= 2;
};
