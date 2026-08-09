import type { VerificationStatus, VerificationLevel } from "@/lib/types";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";

// ARENA-V2-PRODUCT-ARCHITECTURE.md §4 (Phase B). Mirrors VerificationService's phone-OTP flow:
// request -> confirm. Mock mode simulates the round-trip with a fixed demo code instead of a
// real SMS provider (same spirit as the backend's NoopPhoneOtpProvider, which logs instead of
// sending). dateOfBirth is intentionally never returned by the real /verification endpoint
// (VerificationStatusResponse only exposes verification tier state, not the birthdate itself) -
// mock mode mirrors that by keeping it out of VerificationStatus too, exposing it only via the
// mock-only helper below that posts.ts's age-gate reads directly.

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
  return { verificationLevel: s.verificationLevel, phoneVerified: s.phoneVerified, phoneNumber: s.phoneNumber, otpPending: s.otpPending };
}

export async function getVerificationStatus(): Promise<VerificationStatus> {
  if (isRealMode()) return apiFetch<VerificationStatus>("/verification");
  return delay(toStatus(readState()), 200);
}

/** Mock mode "sends" a fixed demo code (123456) rather than a real SMS - shown inline in the
 * Settings UI so the demo path is self-explanatory with no backend running. */
export async function requestPhoneOtp(phoneNumber: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>("/verification/phone/request", { method: "POST", body: { phoneNumber } });
    return;
  }
  writeState({ ...readState(), phoneNumber, otpPending: true, pendingCode: MOCK_OTP });
  await delay(undefined, 300);
}

export async function confirmPhoneOtp(code: string): Promise<VerificationStatus> {
  if (isRealMode()) return apiFetch<VerificationStatus>("/verification/phone/confirm", { method: "POST", body: { code } });
  const state = readState();
  if (state.pendingCode && code.trim() !== state.pendingCode) {
    throw new Error("That code doesn't match. Try again.");
  }
  const next: MockVerificationState = {
    ...state,
    phoneVerified: true,
    otpPending: false,
    pendingCode: undefined,
    verificationLevel: state.verificationLevel === "id" ? "id" : "phone",
  };
  writeState(next);
  return delay(toStatus(next), 250);
}

export async function setDateOfBirth(dateOfBirth: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>("/verification/date-of-birth", { method: "PUT", body: { dateOfBirth } });
    return;
  }
  writeState({ ...readState(), dateOfBirth });
  await delay(undefined, 200);
}
