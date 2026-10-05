/**
 * MARATHON-FE-2 Step A — company verification (`BusinessController.java` /
 * `AdminVerificationController.java`). Didn't exist on the frontend at all before this; every
 * shape here mirrors `BusinessDtos.java` field-for-field, verified live against the local
 * backend. Real mode only — mock mode has no equivalent (company verification is a real-backend
 * feature from the start, no fixture work per M6's rules).
 */
import { apiFetch } from "./httpClient";

export const SUBMITTER_ROLES = [
  { value: "founder", label: "Founder" },
  { value: "hr", label: "HR" },
  { value: "talent_acquisition", label: "Talent acquisition" },
  { value: "hiring_manager", label: "Hiring manager" },
  { value: "operations", label: "Operations" },
  { value: "other", label: "Other" },
] as const;
export type SubmitterRole = (typeof SUBMITTER_ROLES)[number]["value"];

export interface SubmitVerificationInput {
  legalName: string;
  website: string;
  workEmail: string;
  submitterRole: SubmitterRole;
  gstin?: string;
  cin?: string;
  hqCity?: string;
}

export type VerificationStatus = "pending" | "verified" | "rejected" | "verified_legacy";

export interface VerificationView {
  status: VerificationStatus;
  legalName?: string;
  website?: string;
  domain?: string;
  workEmail?: string;
  submitterRole?: string;
  codeExpiresAt?: string;
  verifiedAt?: string;
  domainConfirmed: boolean;
  reviewNote?: string;
  legacy: boolean;
}

export async function submitVerification(input: SubmitVerificationInput): Promise<VerificationView | undefined> {
  return apiFetch<VerificationView>("/enterprise/verification", { method: "POST", body: input });
}

export async function confirmVerification(code: string): Promise<VerificationView | undefined> {
  return apiFetch<VerificationView>("/enterprise/verification/confirm", { method: "POST", body: { code } });
}

export async function getMyVerification(): Promise<VerificationView | undefined> {
  return apiFetch<VerificationView>("/enterprise/verification");
}

export interface PublicBadge {
  verified: boolean;
  domain?: string;
  verifiedAt?: string;
}

export async function getCompanyVerificationBadge(companyId: string): Promise<PublicBadge | undefined> {
  return apiFetch<PublicBadge>(`/companies/${companyId}/verification`, { auth: false });
}

// --- Platform admin (AdminVerificationController) ---

export interface VerificationQueueItem {
  id: string;
  companyId: string;
  companyName: string;
  legalName?: string;
  website?: string;
  domain?: string;
  workEmail?: string;
  submitterRole?: string;
  gstin?: string;
  cin?: string;
  hqCity?: string;
  status: VerificationStatus;
  domainConfirmedAt?: string;
  reviewNote?: string;
  reviewedAt?: string;
  submittedAt?: string;
  domainMatch: boolean;
}

export async function getVerificationQueue(status?: string, page = 0, size = 50): Promise<VerificationQueueItem[]> {
  return apiFetch<VerificationQueueItem[]>("/admin/verification", { query: { status, page, size } });
}

export async function approveVerification(id: string): Promise<VerificationQueueItem | undefined> {
  return apiFetch<VerificationQueueItem>(`/admin/verification/${id}/approve`, { method: "PUT" });
}

export async function rejectVerification(id: string, note: string): Promise<VerificationQueueItem | undefined> {
  return apiFetch<VerificationQueueItem>(`/admin/verification/${id}/reject`, { method: "PUT", body: { note } });
}

export interface LegacyCompany {
  companyId: string;
  companyName: string;
  hqCity?: string;
  grandfatheredAt: string;
  verificationStatus: string;
}

export async function getLegacyCompanies(page = 0, size = 50): Promise<LegacyCompany[]> {
  return apiFetch<LegacyCompany[]>("/admin/verification/legacy", { query: { page, size } });
}

export async function endLegacyVerification(companyId: string): Promise<void> {
  await apiFetch<void>(`/admin/verification/legacy/${companyId}/end`, { method: "PUT" });
}
