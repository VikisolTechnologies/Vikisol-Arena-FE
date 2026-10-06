import type { Role } from "@/lib/types";
import { API_BASE_URL } from "./mode";
import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

// ---- Shared types (Company Admin console only - not part of the core app data model) ----

export interface TeamMember {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  status: "invited" | "active" | "suspended";
  invitedByName?: string;
  joinedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  inviteLink: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expiresAt: string;
  invitedByName: string;
  createdAt: string;
}

export interface InvitationPreview {
  email: string | null;
  role: Role | null;
  companyName: string | null;
  companyLogoEmoji: string | null;
  valid: boolean;
  invalidReason?: string;
}

export interface AuditEvent {
  id: string;
  actorName: string;
  action: string;
  target?: string;
  metadata?: string;
  createdAt: string;
}

export interface AdminDashboard {
  rangeDays: number;
  totals: { postings: number; unlocks: number; stageMoves: number; interviews: number; messages: number };
  recruiterActivity: {
    userId: string; name: string; role: Role; postings: number; unlocks: number; stageMoves: number;
    interviewsHeld: number; messagesSent: number; avgHoursBetweenStageMoves: number | null;
  }[];
  creditsBalance: number;
  creditsTotal: number;
  creditsSpentInRange: number;
}

export interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: string;
}

export interface Billing {
  plan: "free" | "pro" | "enterprise";
  seatsUsed: number;
  seatsTotal: number;
  creditsUsed: number;
  creditsTotal: number;
  invoices: Invoice[];
}

export interface ConsentEntry {
  candidateId: string;
  candidateName: string;
  unlockedAt: string;
  stillConsenting: boolean;
}

// ---- Dashboard (CA1) ----

export async function getDashboard(rangeDays: number): Promise<AdminDashboard> {
  return apiFetch<AdminDashboard>("/enterprise/admin/dashboard", { query: { range: rangeDays } });
}

// ---- Team (CA2) ----

export async function getTeam(): Promise<TeamMember[]> {
  return apiFetch<TeamMember[]>("/enterprise/admin/team");
}

export async function getPendingInvitations(): Promise<Invitation[]> {
  return apiFetch<Invitation[]>("/enterprise/admin/team/invitations");
}

export async function inviteMember(email: string, role: Role): Promise<Invitation> {
  return apiFetch<Invitation>("/enterprise/admin/team/invite", { method: "POST", body: { email, role } });
}

export async function revokeInvitation(id: string): Promise<void> {
  await apiFetch(`/enterprise/admin/team/invitations/${id}`, { method: "DELETE" });
  return;
}

export async function changeMemberRole(membershipId: string, role: Role): Promise<void> {
  await apiFetch(`/enterprise/admin/team/${membershipId}/role`, { method: "PUT", body: { role } });
  return;
}

export async function setMemberSuspended(membershipId: string, suspended: boolean): Promise<void> {
  await apiFetch(`/enterprise/admin/team/${membershipId}/${suspended ? "suspend" : "reactivate"}`, { method: "PUT" });
  return;
}

export async function removeMember(membershipId: string): Promise<void> {
  await apiFetch(`/enterprise/admin/team/${membershipId}`, { method: "DELETE" });
  return;
}

export async function previewInvitation(token: string): Promise<InvitationPreview> {
  return apiFetch<InvitationPreview>(`/auth/invitations/${token}`, { auth: false });
}

export async function acceptInvitation(token: string, name: string, password: string): Promise<void> {
  await apiFetch("/auth/invitations/accept", { method: "POST", auth: false, body: { token, name, password } });
  return;
}

// ---- Audit (CA3) ----

export async function searchAudit(params: { actorId?: string; action?: string; sinceDays?: number; page?: number; size?: number }): Promise<PagedResponse<AuditEvent>> {
  return apiFetch<PagedResponse<AuditEvent>>("/enterprise/admin/audit", { query: params });
}

export function auditExportUrl(): string {
  return `${apiBaseForExport()}/enterprise/admin/audit/export`;
}
function apiBaseForExport() {
  return typeof window !== "undefined" ? API_BASE_URL : "";
}

// ---- Billing (CA4) ----

export async function getBilling(): Promise<Billing> {
  return apiFetch<Billing>("/enterprise/admin/billing");
}

export async function changePlan(plan: "free" | "pro" | "enterprise"): Promise<Billing> {
  return apiFetch<Billing>("/enterprise/admin/billing/plan", { method: "PUT", body: { plan } });
}

// ---- Shared with recruiter workspace (HM3) ----

/** Unlike getTeam() (company_admin-only, CA2's full team-management surface), this is scoped
 * for any workspace member who needs to pick a hiring manager when scheduling an interview -
 * see /enterprise/profile/hiring-managers, callable by RECRUITER or COMPANY_ADMIN alike. */
export async function getHiringManagersForTeam(): Promise<TeamMember[]> {
  return apiFetch<TeamMember[]>("/enterprise/profile/hiring-managers");
}

// ---- Consent view (CA6) ----

export async function getConsentView(): Promise<ConsentEntry[]> {
  return apiFetch<ConsentEntry[]>("/enterprise/admin/consent");
}
