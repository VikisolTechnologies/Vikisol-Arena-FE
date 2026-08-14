import type { ArenaRole } from "../fixtures/accounts";

export interface RouteEntry {
  path: string;
  label: string;
  /** "public" = no auth needed (tested logged-out). Otherwise, the role whose storageState to use. */
  role: ArenaRole | "public";
}

/**
 * Static-route manifest (no dynamic [id] segments) - sourced from this repo's own ROUTES.md and
 * PAGE-INVENTORY.md, restricted to routes both docs mark as existing/live today. Dynamic-segment
 * routes (an application detail, a job detail, a specific candidate profile) are deliberately
 * NOT hardcoded here with a fixed UUID - PAGE-INVENTORY.md's own methodology note explains why:
 * seeded-data IDs aren't stable across re-seeds. A couple of the most important ones are covered
 * instead by discovering a real ID live, in tests/e2e/journeys/ - see TESTING.md's "what's not
 * covered yet" section for the honest gap this leaves (full dynamic-route sweep is backlog).
 *
 * `/dashboard`, `/feed`, `/interviews`, `/enterprise/interviews` are deliberately excluded here -
 * they're all `next.config.ts` redirects, not real pages; covered separately in
 * tests/e2e/auth/access-control.spec.ts instead of the plain smoke sweep.
 */
export const PUBLIC_ROUTES: RouteEntry[] = [
  { path: "/", label: "Landing", role: "public" },
  { path: "/pricing", label: "Pricing", role: "public" },
  { path: "/auth", label: "Sign in / Sign up", role: "public" },
  { path: "/discover", label: "Discover (public)", role: "public" },
  { path: "/privacy", label: "Privacy policy", role: "public" },
  { path: "/terms", label: "Terms", role: "public" },
  { path: "/aup", label: "Acceptable use", role: "public" },
];

export const TALENT_ROUTES: RouteEntry[] = [
  { path: "/home", label: "Home / feed", role: "talent" },
  { path: "/onboarding", label: "Onboarding (revisit)", role: "talent" },
  { path: "/discover", label: "Discover", role: "talent" },
  { path: "/map", label: "Map", role: "talent" },
  { path: "/rooms", label: "Rooms / inbox", role: "talent" },
  { path: "/work", label: "Work hub", role: "talent" },
  { path: "/applications", label: "Applications list", role: "talent" },
  { path: "/marketplace", label: "Marketplace (projects)", role: "talent" },
  { path: "/marketplace/bids", label: "Marketplace bids", role: "talent" },
  { path: "/identity", label: "Identity / profile", role: "talent" },
  { path: "/notifications", label: "Notifications", role: "talent" },
  { path: "/settings", label: "Settings", role: "talent" },
  { path: "/companies", label: "Companies list", role: "talent" },
  { path: "/work/saved", label: "Saved work", role: "talent" },
  { path: "/agent", label: "Agent chat", role: "talent" },
  { path: "/messages", label: "Messages", role: "talent" },
];

export const RECRUITER_ROUTES: RouteEntry[] = [
  { path: "/enterprise/dashboard", label: "Enterprise dashboard", role: "recruiter" },
  { path: "/enterprise/posts", label: "Enterprise posts", role: "recruiter" },
  { path: "/enterprise/postings", label: "Postings list", role: "recruiter" },
  { path: "/enterprise/talent", label: "Talent Universe search", role: "recruiter" },
  { path: "/enterprise/messages", label: "Enterprise messages", role: "recruiter" },
];

export const COMPANY_ADMIN_ROUTES: RouteEntry[] = [
  { path: "/enterprise/admin", label: "Admin landing", role: "company_admin" },
  { path: "/enterprise/dashboard", label: "Enterprise dashboard (CA1)", role: "company_admin" },
  { path: "/enterprise/admin/team", label: "Team management", role: "company_admin" },
  { path: "/enterprise/admin/billing", label: "Billing & plan", role: "company_admin" },
  { path: "/enterprise/admin/company", label: "Company profile", role: "company_admin" },
  { path: "/enterprise/admin/audit", label: "Audit log (CA3)", role: "company_admin" },
  { path: "/enterprise/admin/consent", label: "Consent & compliance", role: "company_admin" },
  { path: "/enterprise/posts", label: "Enterprise posts (CA7)", role: "company_admin" },
  { path: "/enterprise/postings", label: "Postings list", role: "company_admin" },
  { path: "/enterprise/talent", label: "Talent Universe search", role: "company_admin" },
  { path: "/enterprise/messages", label: "Enterprise messages", role: "company_admin" },
];

export const HIRING_MANAGER_ROUTES: RouteEntry[] = [
  { path: "/enterprise/interviews/mine", label: "My interviews (HM landing)", role: "hiring_manager" },
];

export const PLATFORM_ADMIN_ROUTES: RouteEntry[] = [
  { path: "/admin", label: "Platform admin overview", role: "platform_admin" },
  { path: "/admin/tenants", label: "Tenants", role: "platform_admin" },
  { path: "/admin/users", label: "Users", role: "platform_admin" },
  { path: "/admin/moderation", label: "Moderation queue", role: "platform_admin" },
  { path: "/admin/analytics", label: "Platform analytics", role: "platform_admin" },
  { path: "/admin/flags", label: "Feature flags", role: "platform_admin" },
];

export const ALL_ROUTES: RouteEntry[] = [
  ...PUBLIC_ROUTES,
  ...TALENT_ROUTES,
  ...RECRUITER_ROUTES,
  ...COMPANY_ADMIN_ROUTES,
  ...HIRING_MANAGER_ROUTES,
  ...PLATFORM_ADMIN_ROUTES,
];
