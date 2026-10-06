/**
 * Auth domain for B+ screens. A thin, typed layer over the existing calls in src/lib/api/auth —
 * request/response shapes, session storage and cookies are unchanged (FE-BPLUS-BUILD §6).
 */
import { ApiError } from "@/lib/api/httpClient";

export {
  signIn,
  signUp,
  verifyMfa,
  signInWithGoogle,
  forgotPassword,
  resetPassword,
} from "@/lib/api/auth";

/** New passwords need 8 characters (board + architect review 29 Sep, for security). Stricter than
 *  Arena BE's `@Size(min = 6)` on sign-up/reset, so every request the FE sends is still valid;
 *  the BE should match (FE-API-GAPS #36). Sign-in still accepts older 6–7 character passwords. */
export const PASSWORD_MIN = 8;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateName(value: string) {
  return value.trim() ? "" : "Enter your name.";
}

export function validateEmail(value: string) {
  if (!value.trim()) return "Enter your email address.";
  return EMAIL.test(value.trim()) ? "" : "Enter an email address like name@example.com.";
}

export function validateNewPassword(value: string) {
  if (!value) return "Choose a password.";
  return value.length >= PASSWORD_MIN ? "" : `Use at least ${PASSWORD_MIN} characters.`;
}

export function validatePassword(value: string) {
  return value ? "" : "Enter your password.";
}

/** Required on sign-up as of B10 (architect notes on area 2, 1 Oct 2026) — the backend enforces
 *  18+ here now, not only at onboarding's age gate. Just checks the field is a real, non-future
 *  date; the under-18 refusal itself is the backend's own message (fieldForServerError routes
 *  it to this field). */
export function validateDateOfBirth(value: string) {
  if (!value) return "Enter your date of birth.";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Enter a valid date.";
  if (d > new Date()) return "That date hasn't happened yet.";
  return "";
}

/** Honest, specific copy for a failed auth call. The server's own message wins when it has one. */
export function authErrorMessage(err: unknown): string {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "You're offline. Check your connection and try again.";
  if (err instanceof ApiError && err.message) return err.message;
  return "Something went wrong on our side. Nothing was saved — please try again.";
}

/** Which field a server error belongs to, so it's shown next to that field instead of on top. */
export function fieldForServerError(message: string): "email" | "password" | "name" | "dob" | null {
  const m = message.toLowerCase();
  if (m.includes("email")) return "email";
  if (m.includes("password")) return "password";
  // "18 or older" (the age refusal) and "dateofbirth ..." (bad format / future date) both
  // belong on the date-of-birth field, not a generic banner.
  if (m.includes("18 or older") || m.includes("dateofbirth")) return "dob";
  if (m.includes("name")) return "name";
  return null;
}
