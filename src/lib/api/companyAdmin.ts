import { getCandidateById, MOCK_CANDIDATES } from "@/lib/mock/candidates";
import type { EnterpriseProfile, Role } from "@/lib/types";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";
import { getUnlockedCandidateIds } from "./enterprise";
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

// ---- Mock-mode local store ----

const TEAM_KEY = "arena_admin_team";
const INVITES_KEY = "arena_admin_invitations";
const AUDIT_KEY = "arena_admin_audit";

function seedTeam(): TeamMember[] {
  return [
    { membershipId: "m-you", userId: "me", name: "Enterprise Admin", email: "you@company.dev", role: "company_admin", status: "active", joinedAt: new Date(Date.now() - 60 * 86400000).toISOString() },
    { membershipId: "m-1", userId: "u-1", name: "Priyanka Rao", email: "priyanka@company.dev", role: "recruiter", status: "active", invitedByName: "Enterprise Admin", joinedAt: new Date(Date.now() - 30 * 86400000).toISOString() },
    { membershipId: "m-2", userId: "u-2", name: "Karthik Iyer", email: "karthik@company.dev", role: "hiring_manager", status: "active", invitedByName: "Enterprise Admin", joinedAt: new Date(Date.now() - 14 * 86400000).toISOString() },
  ];
}

function readTeam(): TeamMember[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TEAM_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeded = seedTeam();
  localStorage.setItem(TEAM_KEY, JSON.stringify(seeded));
  return seeded;
}
function writeTeam(team: TeamMember[]) {
  localStorage.setItem(TEAM_KEY, JSON.stringify(team));
}

function readInvites(): Invitation[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(INVITES_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeInvites(invites: Invitation[]) {
  localStorage.setItem(INVITES_KEY, JSON.stringify(invites));
}

function readAudit(): AuditEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]");
  } catch {
    return [];
  }
}
function pushAudit(entry: Omit<AuditEvent, "id" | "createdAt">) {
  const all = readAudit();
  all.unshift({ ...entry, id: `audit-${Date.now()}`, createdAt: new Date().toISOString() });
  localStorage.setItem(AUDIT_KEY, JSON.stringify(all.slice(0, 200)));
}

// ---- Dashboard (CA1) ----

export async function getDashboard(rangeDays: number): Promise<AdminDashboard> {
  if (isRealMode()) return apiFetch<AdminDashboard>("/enterprise/admin/dashboard", { query: { range: rangeDays } });
  const team = readTeam().filter((m) => m.status === "active");
  const audit = readAudit();
  const activity = team.map((m) => {
    const mine = audit.filter((a) => a.actorName === m.name);
    return {
      userId: m.userId, name: m.name, role: m.role,
      postings: mine.filter((a) => a.action === "posting.created").length,
      unlocks: mine.filter((a) => a.action === "candidate.unlocked").length,
      stageMoves: mine.filter((a) => a.action === "stage.moved").length,
      interviewsHeld: mine.filter((a) => a.action === "interview.scheduled").length,
      messagesSent: mine.filter((a) => a.action === "message.sent").length,
      avgHoursBetweenStageMoves: null,
    };
  });
  return delay({
    rangeDays,
    totals: {
      postings: activity.reduce((s, a) => s + a.postings, 0),
      unlocks: activity.reduce((s, a) => s + a.unlocks, 0),
      stageMoves: activity.reduce((s, a) => s + a.stageMoves, 0),
      interviews: activity.reduce((s, a) => s + a.interviewsHeld, 0),
      messages: activity.reduce((s, a) => s + a.messagesSent, 0),
    },
    recruiterActivity: activity,
    creditsBalance: 23,
    creditsTotal: 25,
    creditsSpentInRange: 2,
  }, 300);
}

// ---- Team (CA2) ----

export async function getTeam(): Promise<TeamMember[]> {
  if (isRealMode()) return apiFetch<TeamMember[]>("/enterprise/admin/team");
  return delay(readTeam(), 200);
}

export async function getPendingInvitations(): Promise<Invitation[]> {
  if (isRealMode()) return apiFetch<Invitation[]>("/enterprise/admin/team/invitations");
  return delay(readInvites().filter((i) => i.status === "pending"), 150);
}

export async function inviteMember(email: string, role: Role): Promise<Invitation> {
  if (isRealMode()) return apiFetch<Invitation>("/enterprise/admin/team/invite", { method: "POST", body: { email, role } });
  const invite: Invitation = {
    id: `invite-${Date.now()}`, email, role, inviteLink: `${window.location.origin}/invite/mock-${Date.now()}`,
    status: "pending", expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    invitedByName: "Enterprise Admin", createdAt: new Date().toISOString(),
  };
  writeInvites([invite, ...readInvites()]);
  pushAudit({ actorName: "Enterprise Admin", action: "member.invited", target: `${email} as ${role}` });
  return delay(invite, 300);
}

export async function revokeInvitation(id: string): Promise<void> {
  if (isRealMode()) { await apiFetch(`/enterprise/admin/team/invitations/${id}`, { method: "DELETE" }); return; }
  writeInvites(readInvites().map((i) => (i.id === id ? { ...i, status: "revoked" as const } : i)));
  return delay(undefined, 150);
}

export async function changeMemberRole(membershipId: string, role: Role): Promise<void> {
  if (isRealMode()) { await apiFetch(`/enterprise/admin/team/${membershipId}/role`, { method: "PUT", body: { role } }); return; }
  writeTeam(readTeam().map((m) => (m.membershipId === membershipId ? { ...m, role } : m)));
  return delay(undefined, 200);
}

export async function setMemberSuspended(membershipId: string, suspended: boolean): Promise<void> {
  if (isRealMode()) {
    await apiFetch(`/enterprise/admin/team/${membershipId}/${suspended ? "suspend" : "reactivate"}`, { method: "PUT" });
    return;
  }
  writeTeam(readTeam().map((m) => (m.membershipId === membershipId ? { ...m, status: suspended ? "suspended" as const : "active" as const } : m)));
  return delay(undefined, 200);
}

export async function removeMember(membershipId: string): Promise<void> {
  if (isRealMode()) { await apiFetch(`/enterprise/admin/team/${membershipId}`, { method: "DELETE" }); return; }
  const member = readTeam().find((m) => m.membershipId === membershipId);
  writeTeam(readTeam().filter((m) => m.membershipId !== membershipId));
  if (member) pushAudit({ actorName: "Enterprise Admin", action: "member.removed", target: member.name });
  return delay(undefined, 200);
}

export async function previewInvitation(token: string): Promise<InvitationPreview> {
  if (isRealMode()) return apiFetch<InvitationPreview>(`/auth/invitations/${token}`, { auth: false });
  const invite = readInvites().find((i) => i.inviteLink.endsWith(token));
  if (!invite || invite.status !== "pending") {
    return { email: null, role: null, companyName: null, companyLogoEmoji: null, valid: false, invalidReason: "This invite link isn't valid" };
  }
  return delay({ email: invite.email, role: invite.role, companyName: "Your Company", companyLogoEmoji: "🏢", valid: true }, 200);
}

export async function acceptInvitation(token: string, name: string, password: string): Promise<void> {
  if (isRealMode()) { await apiFetch("/auth/invitations/accept", { method: "POST", auth: false, body: { token, name, password } }); return; }
  const invites = readInvites();
  const invite = invites.find((i) => i.inviteLink.endsWith(token));
  if (!invite) return delay(undefined, 200);
  writeInvites(invites.map((i) => (i.id === invite.id ? { ...i, status: "accepted" as const } : i)));
  writeTeam([...readTeam(), {
    membershipId: `m-${Date.now()}`, userId: `u-${Date.now()}`, name, email: invite.email, role: invite.role,
    status: "active", invitedByName: invite.invitedByName, joinedAt: new Date().toISOString(),
  }]);
  return delay(undefined, 300);
}

// ---- Audit (CA3) ----

export async function searchAudit(params: { actorId?: string; action?: string; sinceDays?: number; page?: number; size?: number }): Promise<PagedResponse<AuditEvent>> {
  if (isRealMode()) return apiFetch<PagedResponse<AuditEvent>>("/enterprise/admin/audit", { query: params });
  let events = readAudit();
  if (params.action) events = events.filter((e) => e.action === params.action);
  if (params.sinceDays) {
    const cutoff = Date.now() - params.sinceDays * 86400000;
    events = events.filter((e) => new Date(e.createdAt).getTime() >= cutoff);
  }
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const slice = events.slice(page * size, page * size + size);
  return delay({ content: slice, page, size, totalElements: events.length, totalPages: Math.ceil(events.length / size) || 1, last: (page + 1) * size >= events.length }, 200);
}

export function auditExportUrl(): string {
  return `${apiBaseForExport()}/enterprise/admin/audit/export`;
}
function apiBaseForExport() {
  return (typeof window !== "undefined" && isRealMode()) ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/api/v1") : "";
}

// ---- Billing (CA4) ----

export async function getBilling(): Promise<Billing> {
  if (isRealMode()) return apiFetch<Billing>("/enterprise/admin/billing");
  const { getEnterpriseProfile } = await import("@/lib/session");
  const profile = getEnterpriseProfile();
  return delay(mockBillingFromProfile(profile), 250);
}

export async function changePlan(plan: "free" | "pro" | "enterprise"): Promise<Billing> {
  if (isRealMode()) return apiFetch<Billing>("/enterprise/admin/billing/plan", { method: "PUT", body: { plan } });
  const { getEnterpriseProfile, saveEnterpriseProfile } = await import("@/lib/session");
  const current = getEnterpriseProfile();
  if (!current) throw new Error("No enterprise profile");
  const seatsTotal = plan === "enterprise" ? Math.max(current.seatsTotal, 50) : plan === "pro" ? Math.max(current.seatsTotal, 10) : current.seatsTotal;
  const unlockCreditsTotal = plan === "enterprise" ? Math.max(current.unlockCreditsTotal, 200) : plan === "pro" ? Math.max(current.unlockCreditsTotal, 50) : current.unlockCreditsTotal;
  const updated: EnterpriseProfile = { ...current, plan, seatsTotal, unlockCreditsTotal };
  saveEnterpriseProfile(updated);
  pushAudit({ actorName: "Enterprise Admin", action: "plan.changed", target: `${current.plan} -> ${plan}` });
  return delay(mockBillingFromProfile(updated), 300);
}

function mockBillingFromProfile(profile: EnterpriseProfile | null): Billing {
  if (!profile) return { plan: "free", seatsUsed: 1, seatsTotal: 3, creditsUsed: 0, creditsTotal: 25, invoices: [] };
  const invoices: Invoice[] = profile.plan === "free" ? [] : [
    { id: "INV-MOCK-1", date: "Jul 1, 2026", amount: profile.plan === "enterprise" ? "Custom" : "₹4,999", status: "paid" },
    { id: "INV-MOCK-2", date: "Aug 1, 2026", amount: profile.plan === "enterprise" ? "Custom" : "₹4,999", status: "paid" },
  ];
  return {
    plan: profile.plan, seatsUsed: profile.seatsUsed, seatsTotal: profile.seatsTotal,
    creditsUsed: profile.unlockCreditsUsed, creditsTotal: profile.unlockCreditsTotal, invoices,
  };
}

// ---- Shared with recruiter workspace (HM3) ----

/** Unlike getTeam() (company_admin-only, CA2's full team-management surface), this is scoped
 * for any workspace member who needs to pick a hiring manager when scheduling an interview -
 * see /enterprise/profile/hiring-managers, callable by RECRUITER or COMPANY_ADMIN alike. */
export async function getHiringManagersForTeam(): Promise<TeamMember[]> {
  if (isRealMode()) return apiFetch<TeamMember[]>("/enterprise/profile/hiring-managers");
  return delay(readTeam().filter((m) => m.role === "hiring_manager" && m.status === "active"), 150);
}

// ---- Consent view (CA6) ----

export async function getConsentView(): Promise<ConsentEntry[]> {
  if (isRealMode()) return apiFetch<ConsentEntry[]>("/enterprise/admin/consent");
  const ids = getUnlockedCandidateIds();
  const entries = ids.map((id) => {
    const candidate = getCandidateById(id) ?? MOCK_CANDIDATES.find((c) => c.id === id);
    return candidate ? {
      candidateId: id, candidateName: candidate.name, unlockedAt: new Date().toISOString(),
      stillConsenting: candidate.consent.searchableByEnterprises,
    } : null;
  }).filter((e): e is ConsentEntry => e !== null);
  return delay(entries, 200);
}
