import type { VerificationStatus } from "@/lib/types";
import { apiFetch } from "./httpClient";

// ARENA-V2-PRODUCT-ARCHITECTURE.md §4 (Phase B). Mirrors VerificationService's phone-OTP flow:
// request -> confirm. The birthdate itself is intentionally never returned by the real
// /verification endpoint - only whether one is on file (`dateOfBirthSet`, B10), which
// onboarding's age gate uses to skip itself for an account that already gave one at sign-up.

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
