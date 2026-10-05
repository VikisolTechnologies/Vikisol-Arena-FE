import type { VerificationStatus, VerificationLevel } from "@/lib/types";
import { apiFetch } from "./httpClient";

// ARENA-V2-PRODUCT-ARCHITECTURE.md §4 (Phase B). Mirrors VerificationService's phone-OTP flow:
// request -> confirm. Mock mode simulates the round-trip with a fixed demo code instead of a
// real SMS provider (same spirit as the backend's NoopPhoneOtpProvider, which logs instead of
// sending). The birthdate itself is intentionally never returned by the real /verification
// endpoint - only whether one is on file (`dateOfBirthSet`, B10), which onboarding's age gate
// uses to skip itself for an account that already gave one at sign-up. Mock mode mirrors that
// shape but derives it from the mock-only helper below, which posts.ts's age-gate reads
// directly for the actual date.

const KEY = "arena_verification";
const MOCK_OTP = "123456";

interface MockVerificationState {
  verificationLevel: VerificationLevel;
  phoneVerified: boolean;
  phoneNumber?: string;
  otpPending: boolean;
  pendingCode?: string;
  dateOfBirth?: string;
}

const DEFAULT_STATE: MockVerificationState = { verificationLevel: "basic", phoneVerified: false, otpPending: false };

function readState(): MockVerificationState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MockVerificationState) : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}
function writeState(state: MockVerificationState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

/** Mock-mode-only: posts.ts's age-gate reads this directly, mirroring how AgeUtil.isAdult gates
 * ACTIVITY creation/joining server-side off the User entity's real dateOfBirth column. */
export function getMockDateOfBirth(): string | undefined {
  return readState().dateOfBirth;
}

function toStatus(s: MockVerificationState): VerificationStatus {
  return { verificationLevel: s.verificationLevel, phoneVerified: s.phoneVerified, phoneNumber: s.phoneNumber, otpPending: s.otpPending, dateOfBirthSet: !!s.dateOfBirth };
}

export async function getVerificationStatus(): Promise<VerificationStatus> {
  return apiFetch<VerificationStatus>("/verification");
}

export async function requestPhoneOtp(phoneNumber: string): Promise<void> {
  await apiFetch<void>("/verification/phone/request", { method: "POST", body: { phoneNumber } });
  return;
}

export async function confirmPhoneOtp(code: string): Promise<VerificationStatus> {
  return apiFetch<VerificationStatus>("/verification/phone/confirm", { method: "POST", body: { code } });
}

export async function setDateOfBirth(dateOfBirth: string): Promise<void> {
  await apiFetch<void>("/verification/date-of-birth", { method: "PUT", body: { dateOfBirth } });
  return;
}
