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

/** Matches Arena BE SignUpRequest/ResetPasswordRequest `@Size(min = 6)`. The board says 8;
 *  the backend is the source of truth (docs/design/DECISIONS.md). */
export const PASSWORD_MIN = 6;

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

/** Honest, specific copy for a failed auth call. The server's own message wins when it has one. */
export function authErrorMessage(err: unknown): string {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "You're offline. Check your connection and try again.";
  if (err instanceof ApiError && err.message) return err.message;
  return "Something went wrong on our side. Nothing was saved — please try again.";
}

/** Which field a server error belongs to, so it's shown next to that field instead of on top. */
export function fieldForServerError(message: string): "email" | "password" | "name" | null {
  const m = message.toLowerCase();
  if (m.includes("email")) return "email";
  if (m.includes("password")) return "password";
  if (m.includes("name")) return "name";
  return null;
}
