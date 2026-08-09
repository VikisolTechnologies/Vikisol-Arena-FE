import type {
  AuditEvent, FeatureFlag, ModerationItem, ModerationStatus, PlatformAnalytics,
  PlatformDashboard, PlatformUser, Role, TenantStatus, TenantSummary,
} from "@/lib/types";
import { delay } from "./shared";
import { isRealMode } from "./mode";
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
    { id: "t-1", companyName: "Techolution", logoEmoji: "🏢", plan: "pro", status: "active", seatsUsed: 3, seatsTotal: 10, unlockCreditsUsed: 27, unlockCreditsTotal: 50, ownerEmail: "demo.enterprise@vikisol.dev", createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
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
    { id: "u-1", name: "Techolution Talent Team", email: "demo.enterprise@vikisol.dev", role: "company_admin", tenantId: "t-1", tenantName: "Techolution", createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
    { id: "u-2", name: "Demo Recruiter", email: "demo.recruiter@vikisol.dev", role: "recruiter", tenantId: "t-1", tenantName: "Techolution", createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
    { id: "u-3", name: "Demo Hiring Manager", email: "demo.hiringmanager@vikisol.dev", role: "hiring_manager", tenantId: "t-1", tenantName: "Techolution", createdAt: new Date(Date.now() - 45 * 86400000).toISOString() },
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
    { id: "flag-3", key: "agent_autopilot", label: "Agent autopilot mode", description: "Lets candidates set their agent to fully autonomous (no per-action approval).", enabled: false },
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
  if (isRealMode()) return apiFetch<PlatformDashboard>("/admin/dashboard");
  const tenants = readTenants();
  return delay({
    tenantsTotal: tenants.length,
    tenantsSuspended: tenants.filter((t) => t.status === "suspended").length,
    usersTotal: readUsers().length,
    moderationPending: readModeration().filter((m) => m.status === "pending").length,
    recentActivity: readActivity().slice(0, 15),
  }, 250);
}

// ---- Tenants (PA1) + Subscriptions (PA2) ----

export async function listTenants(query?: string): Promise<TenantSummary[]> {
  if (isRealMode()) {
    const page = await apiFetch<PagedResponse<TenantSummary>>("/admin/tenants", { query: { query, size: 100 } });
    return page.content;
  }
  const q = (query || "").toLowerCase();
  const tenants = readTenants().filter((t) => !q || t.companyName.toLowerCase().includes(q));
  return delay(tenants, 250);
}

export async function setTenantSuspended(tenantId: string, suspended: boolean): Promise<void> {
  if (isRealMode()) {
    await apiFetch(`/admin/tenants/${tenantId}/${suspended ? "suspend" : "reactivate"}`, { method: "PUT" });
    return;
  }
  const tenant = readTenants().find((t) => t.id === tenantId);
  writeTenants(readTenants().map((t) => (t.id === tenantId ? { ...t, status: (suspended ? "suspended" : "active") as TenantStatus } : t)));
  if (tenant) pushActivity({ actorName: "Platform Admin", action: suspended ? "tenant.suspended" : "tenant.reactivated", target: tenant.companyName });
  return delay(undefined, 250);
}

export interface AdjustSubscriptionInput {
  plan?: "free" | "pro" | "enterprise";
  seatsTotal?: number;
  creditDelta?: number;
  reason: string;
}

export async function adjustSubscription(tenantId: string, input: AdjustSubscriptionInput): Promise<TenantSummary> {
  if (isRealMode()) return apiFetch<TenantSummary>(`/admin/tenants/${tenantId}/subscription`, { method: "PUT", body: input });
  const tenants = readTenants();
  const tenant = tenants.find((t) => t.id === tenantId);
  if (!tenant) throw new Error("Tenant not found");
  const updated: TenantSummary = {
    ...tenant,
    plan: input.plan ?? tenant.plan,
    seatsTotal: input.seatsTotal ?? tenant.seatsTotal,
    unlockCreditsTotal: tenant.unlockCreditsTotal + (input.creditDelta ?? 0),
  };
  writeTenants(tenants.map((t) => (t.id === tenantId ? updated : t)));
  pushActivity({ actorName: "Platform Admin", action: "subscription.adjusted", target: `${tenant.companyName} (${input.reason})` });
  return delay(updated, 300);
}

// ---- Global user search (PA3) ----

export async function searchPlatformUsers(query?: string, role?: Role): Promise<PlatformUser[]> {
  if (isRealMode()) {
    const page = await apiFetch<PagedResponse<PlatformUser>>("/admin/users", { query: { query, role, size: 100 } });
    return page.content;
  }
  const q = (query || "").toLowerCase();
  const users = readUsers().filter((u) =>
    (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) && (!role || u.role === role));
  return delay(users, 250);
}

// ---- Moderation queue (PA4) ----

export async function getModerationQueue(status: ModerationStatus = "pending"): Promise<ModerationItem[]> {
  if (isRealMode()) {
    const page = await apiFetch<PagedResponse<ModerationItem>>("/admin/moderation", { query: { status, size: 100 } });
    return page.content;
  }
  return delay(readModeration().filter((m) => m.status === status), 200);
}

export async function resolveModerationItem(itemId: string, action: "dismiss" | "takedown"): Promise<void> {
  if (isRealMode()) {
    await apiFetch(`/admin/moderation/${itemId}/${action}`, { method: "PUT" });
    return;
  }
  const item = readModeration().find((m) => m.id === itemId);
  writeModeration(readModeration().map((m) => (m.id === itemId ? { ...m, status: (action === "dismiss" ? "dismissed" : "taken_down") as ModerationStatus } : m)));
  if (item) pushActivity({ actorName: "Platform Admin", action: action === "dismiss" ? "moderation.dismissed" : "moderation.takedown", target: item.postingTitle });
  return delay(undefined, 250);
}

// ---- Platform analytics (PA5) ----

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  if (isRealMode()) return apiFetch<PlatformAnalytics>("/admin/analytics");
  const tenants = readTenants();
  const users = readUsers();
  const tenantsByPlan: Record<string, number> = {};
  for (const t of tenants) tenantsByPlan[t.plan] = (tenantsByPlan[t.plan] ?? 0) + 1;
  const usersByRole: Record<string, number> = {};
  for (const u of users) usersByRole[u.role] = (usersByRole[u.role] ?? 0) + 1;
  return delay({
    tenantsTotal: tenants.length,
    tenantsSuspended: tenants.filter((t) => t.status === "suspended").length,
    tenantsByPlan,
    usersTotal: users.length,
    usersByRole,
    postingsTotal: 18,
    postingsOpen: 11,
    applicationsTotal: 64,
    interviewsTotal: 22,
    newTenantsLast7d: 1,
    newUsersLast7d: 3,
  }, 250);
}

// ---- Feature flags / demo tools (PA6) ----

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  if (isRealMode()) return apiFetch<FeatureFlag[]>("/admin/flags");
  return delay(readFlags(), 200);
}

export async function createFeatureFlag(input: { key: string; label: string; description?: string; enabled: boolean }): Promise<FeatureFlag> {
  if (isRealMode()) return apiFetch<FeatureFlag>("/admin/flags", { method: "POST", body: input });
  const flag: FeatureFlag = { id: `flag-${Date.now()}`, ...input };
  writeFlags([...readFlags(), flag]);
  pushActivity({ actorName: "Platform Admin", action: "flag.toggled", target: `${flag.key} created (enabled=${flag.enabled})` });
  return delay(flag, 250);
}

export async function toggleFeatureFlag(id: string, enabled: boolean): Promise<FeatureFlag> {
  if (isRealMode()) return apiFetch<FeatureFlag>(`/admin/flags/${id}`, { method: "PUT", body: { enabled } });
  const flags = readFlags();
  const flag = flags.find((f) => f.id === id);
  const updated = flags.map((f) => (f.id === id ? { ...f, enabled } : f));
  writeFlags(updated);
  if (flag) pushActivity({ actorName: "Platform Admin", action: "flag.toggled", target: `${flag.key} -> ${enabled}` });
  return delay(updated.find((f) => f.id === id)!, 200);
}
