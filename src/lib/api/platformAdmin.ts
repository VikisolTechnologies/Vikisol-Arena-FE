import type {
  FeatureFlag, ModerationItem, ModerationStatus, PlatformAnalytics,
  PlatformDashboard, PlatformUser, Role, TenantSummary,
} from "@/lib/types";
import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

// ---- Dashboard (PA1 landing) ----

export async function getPlatformDashboard(): Promise<PlatformDashboard> {
  return apiFetch<PlatformDashboard>("/admin/dashboard");
}

// ---- Tenants (PA1) + Subscriptions (PA2) ----

export async function listTenants(query?: string): Promise<TenantSummary[]> {
  const page = await apiFetch<PagedResponse<TenantSummary>>("/admin/tenants", { query: { query, size: 100 } });
  return page.content;
}

export async function setTenantSuspended(tenantId: string, suspended: boolean): Promise<void> {
  await apiFetch(`/admin/tenants/${tenantId}/${suspended ? "suspend" : "reactivate"}`, { method: "PUT" });
}

export interface AdjustSubscriptionInput {
  plan?: "free" | "pro" | "enterprise";
  seatsTotal?: number;
  creditDelta?: number;
  reason: string;
}

export async function adjustSubscription(tenantId: string, input: AdjustSubscriptionInput): Promise<TenantSummary> {
  return apiFetch<TenantSummary>(`/admin/tenants/${tenantId}/subscription`, { method: "PUT", body: input });
}

// ---- Global user search (PA3) ----

export async function searchPlatformUsers(query?: string, role?: Role): Promise<PlatformUser[]> {
  const page = await apiFetch<PagedResponse<PlatformUser>>("/admin/users", { query: { query, role, size: 100 } });
  return page.content;
}

// MARATHON-FE-2 Step B item 5: AdminAccountController's account-level actions (row 51) were
// live on the backend the whole time - this screen hid Suspend/Restore/Force sign-out entirely
// in real mode and the profile sheet showed a hardcoded "suspended: false" stub, same
// "preview-only" gap pattern as moderation's warn/suspend/ban had.
export interface AdminAccountDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  lastActiveAt?: string;
  suspendedUntil?: string;
  suspensionReason?: string;
  bannedAt?: string;
  posts: number;
  reportsAgainst: number;
  reportsFiled: number;
}

export async function getAdminAccountDetail(userId: string): Promise<AdminAccountDetail> {
  return apiFetch<AdminAccountDetail>(`/admin/users/${userId}`);
}

export async function suspendUser(userId: string, reason: string, durationDays: number): Promise<AdminAccountDetail> {
  return apiFetch<AdminAccountDetail>(`/admin/users/${userId}/suspend`, { method: "PUT", body: { reason, durationDays } });
}

export async function restoreUser(userId: string, reason?: string): Promise<AdminAccountDetail> {
  return apiFetch<AdminAccountDetail>(`/admin/users/${userId}/restore`, { method: "PUT", body: reason ? { reason } : undefined });
}

export async function forceSignOutUser(userId: string, reason?: string): Promise<void> {
  await apiFetch(`/admin/users/${userId}/force-signout`, { method: "POST", body: reason ? { reason } : undefined });
}

// ---- Moderation queue (PA4) ----

export async function getModerationQueue(status: ModerationStatus = "pending"): Promise<ModerationItem[]> {
  const page = await apiFetch<PagedResponse<ModerationItem>>("/admin/moderation", { query: { status, size: 100 } });
  return page.content;
}

export async function resolveModerationItem(itemId: string, action: "dismiss" | "takedown"): Promise<void> {
  await apiFetch(`/admin/moderation/${itemId}/${action}`, { method: "PUT" });
}

// MARATHON-FE-2 Step B item 5: AdminAccountController's warn/suspend/ban ("acting on the account
// behind a report") were live on the backend all along - this screen's copy said "preview-only
// until the API supports them" and the fixture path just stashed a local note. Takes the
// moderation item's own id (not a user id); the backend resolves the reported user server-side.
export async function warnReportedUser(itemId: string, reason: string): Promise<void> {
  await apiFetch(`/admin/moderation/${itemId}/warn`, { method: "PUT", body: { reason } });
}

export async function suspendReportedUser(itemId: string, reason: string, durationDays: number): Promise<void> {
  await apiFetch(`/admin/moderation/${itemId}/suspend`, { method: "PUT", body: { reason, durationDays } });
}

export async function banReportedUser(itemId: string, reason: string): Promise<void> {
  await apiFetch(`/admin/moderation/${itemId}/ban`, { method: "PUT", body: { reason } });
}

// ---- Platform analytics (PA5) ----

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  return apiFetch<PlatformAnalytics>("/admin/analytics");
}

// ---- Feature flags / demo tools (PA6) ----

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  return apiFetch<FeatureFlag[]>("/admin/flags");
}

export async function createFeatureFlag(input: { key: string; label: string; description?: string; enabled: boolean }): Promise<FeatureFlag> {
  return apiFetch<FeatureFlag>("/admin/flags", { method: "POST", body: input });
}

export async function toggleFeatureFlag(id: string, enabled: boolean): Promise<FeatureFlag> {
  return apiFetch<FeatureFlag>(`/admin/flags/${id}`, { method: "PUT", body: { enabled } });
}

// ---- Industries (FE-API-GAPS row 62) ----
// MARATHON-FE-2 Step B item 5: /admin/industries (GET/POST/PUT) was live on the backend with no
// frontend screen at all - "add one, and it appears in the company's picker" had nothing to test.
export interface AdminIndustryRow {
  key: string;
  label: string;
  active: boolean;
  position: number;
}

export async function listAdminIndustries(): Promise<AdminIndustryRow[]> {
  return apiFetch<AdminIndustryRow[]>("/admin/industries");
}

export async function addIndustry(label: string): Promise<AdminIndustryRow> {
  return apiFetch<AdminIndustryRow>("/admin/industries", { method: "POST", body: { label } });
}

export async function setIndustryActive(key: string, active: boolean): Promise<AdminIndustryRow> {
  return apiFetch<AdminIndustryRow>(`/admin/industries/${key}`, { method: "PUT", body: { active } });
}

// ---- Disputes (PA9 / FE-API-GAPS row 46) ----
// MARATHON-FE-2 Step B item 5: AdminDisputeController (/admin/disputes) was live on the backend
// the whole time - this screen said "need a platform-admin endpoint" and never called it. Real
// only.
export interface DisputeView {
  id: string;
  activityTitle: string;
  hostName: string;
  joinerName: string;
  openedAt: string;
  deadlineAt: string;
  // The wire field named "status" is the raw DisputeStatus enum (open/accepted/rejected/none) -
  // "state" is the row-46 admin-screen vocabulary (open/resolved_host/resolved_joiner/expired)
  // this UI actually filters tabs on. Reading the wrong one was caught live: every resolved
  // dispute vanished from every tab instead of moving to "Host/Joiner upheld".
  state: "open" | "resolved_host" | "resolved_joiner" | "expired";
  note?: string;
}

// The backend has no "all statuses" query - queue() defaults to OPEN only and otherwise filters
// to exactly one status (it accepts this screen's own tab vocabulary as aliases). Fetch per tab
// rather than fetch-once-and-filter-client-side.
export async function getDisputeQueue(status: "open" | "resolved_host" | "resolved_joiner" | "expired" = "open"): Promise<DisputeView[]> {
  return apiFetch<DisputeView[]>("/admin/disputes", { query: { status, size: 100 } });
}

export async function resolveDispute(attendanceId: string, side: "host" | "joiner", reason: string): Promise<DisputeView> {
  return apiFetch<DisputeView>(`/admin/disputes/${attendanceId}/resolve`, { method: "PUT", body: { side, reason } });
}
