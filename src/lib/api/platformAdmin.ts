import type {
  AuditEvent, FeatureFlag, ModerationItem, ModerationStatus, PlatformAnalytics,
  PlatformDashboard, PlatformUser, Role, TenantStatus, TenantSummary,
} from "@/lib/types";
import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

// PA1-PA7 (platform_admin only). Mock mode seeds a small fixed roster of tenants/users/
// moderation items into localStorage the first time any of these are read, mirroring
// companyAdmin.ts's pattern exactly - a demo needs to work identically with or without
// arena-api running.

const TENANTS_KEY = "arena_platform_tenants";
const USERS_KEY = "arena_platform_users";
const MODERATION_KEY = "arena_platform_moderation";
const FLAGS_KEY = "arena_platform_flags";
const ACTIVITY_KEY = "arena_platform_activity";

function seedTenants(): TenantSummary[] {
  return [
    { id: "t-1", companyName: "Lakeshore Tech", logoEmoji: "🏢", plan: "pro", status: "active", seatsUsed: 3, seatsTotal: 10, unlockCreditsUsed: 27, unlockCreditsTotal: 50, ownerEmail: "demo.enterprise@vikisol.dev", createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
    { id: "t-2", companyName: "Nimbus Health", logoEmoji: "🩺", plan: "free", status: "active", seatsUsed: 1, seatsTotal: 3, unlockCreditsUsed: 4, unlockCreditsTotal: 10, ownerEmail: "admin@nimbushealth.dev", createdAt: new Date(Date.now() - 40 * 86400000).toISOString() },
    { id: "t-3", companyName: "Fleetwise Logistics", logoEmoji: "🚚", plan: "enterprise", status: "suspended", seatsUsed: 12, seatsTotal: 50, unlockCreditsUsed: 140, unlockCreditsTotal: 200, ownerEmail: "ops@fleetwise.dev", createdAt: new Date(Date.now() - 200 * 86400000).toISOString() },
  ];
}

function readTenants(): TenantSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TENANTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeded = seedTenants();
  localStorage.setItem(TENANTS_KEY, JSON.stringify(seeded));
  return seeded;
}
function writeTenants(tenants: TenantSummary[]) {
  localStorage.setItem(TENANTS_KEY, JSON.stringify(tenants));
}

function seedUsers(): PlatformUser[] {
  return [
    { id: "u-1", name: "Lakeshore Tech Talent Team", email: "demo.enterprise@vikisol.dev", role: "company_admin", tenantId: "t-1", tenantName: "Lakeshore Tech", createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
    { id: "u-2", name: "Demo Recruiter", email: "demo.recruiter@vikisol.dev", role: "recruiter", tenantId: "t-1", tenantName: "Lakeshore Tech", createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
    { id: "u-3", name: "Demo Hiring Manager", email: "demo.hiringmanager@vikisol.dev", role: "hiring_manager", tenantId: "t-1", tenantName: "Lakeshore Tech", createdAt: new Date(Date.now() - 45 * 86400000).toISOString() },
    { id: "u-4", name: "Priya Nair", email: "priya@example.dev", role: "talent", createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
  ];
}

function readUsers(): PlatformUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeded = seedUsers();
  localStorage.setItem(USERS_KEY, JSON.stringify(seeded));
  return seeded;
}

function seedModeration(): ModerationItem[] {
  return [
    { id: "mod-1", contentType: "job_posting", postingId: "posting-mock-1", postingTitle: "Remote Data Entry — guaranteed income", tenantName: "Nimbus Health", reason: "Flagged terms: guaranteed income", status: "pending", createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    // ARENA-V2-PRODUCT-ARCHITECTURE.md §4 - room reports now feed the same queue (see
    // DECISIONS.md's ModerationItem-generalized-additively entry), demo'd here so the admin
    // moderation UI has a room-shaped item to render even in mock mode.
    { id: "mod-2", contentType: "room", roomId: "room-1", postingTitle: "Badminton at 6pm today, Gachibowli - need 2 more for doubles", reporterName: "Someone in the room", reason: "Reported from the room chat", status: "pending", createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  ];
}

function readModeration(): ModerationItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MODERATION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeded = seedModeration();
  localStorage.setItem(MODERATION_KEY, JSON.stringify(seeded));
  return seeded;
}
function writeModeration(items: ModerationItem[]) {
  localStorage.setItem(MODERATION_KEY, JSON.stringify(items));
}

function seedFlags(): FeatureFlag[] {
  return [
    { id: "flag-1", key: "pricing_beta_banner", label: "Pricing beta banner", description: "Shows the early-access pricing banner on the marketing site.", enabled: true },
    { id: "flag-2", key: "open_market_bidding", label: "Open Market bidding", description: "Enables project bidding for talent accounts.", enabled: true },
  ];
}

function readFlags(): FeatureFlag[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FLAGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeded = seedFlags();
  localStorage.setItem(FLAGS_KEY, JSON.stringify(seeded));
  return seeded;
}
function writeFlags(flags: FeatureFlag[]) {
  localStorage.setItem(FLAGS_KEY, JSON.stringify(flags));
}

function readActivity(): AuditEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
  } catch {
    return [];
  }
}
function pushActivity(entry: Omit<AuditEvent, "id" | "createdAt">) {
  const all = readActivity();
  all.unshift({ ...entry, id: `pa-audit-${Date.now()}`, createdAt: new Date().toISOString() });
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(all.slice(0, 100)));
}

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
