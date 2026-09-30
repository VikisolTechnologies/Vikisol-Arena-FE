/**
 * Preview fixtures for Arena Admin screens whose APIs aren't live yet (P10).
 * Used only when !isRealMode(); real mode shows honest empty/error states.
 */

import type { AuditEvent } from "@/lib/types";

export interface LaunchMetric {
  id: string;
  label: string;
  value: number | null;
  hint?: string;
}

export interface VerificationRequest {
  id: string;
  companyName: string;
  domain: string;
  website: string;
  gstin?: string;
  cin?: string;
  domainMatch: boolean;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  rejectReason?: string;
}

export interface AdminContentItem {
  id: string;
  kind: "activity" | "need" | "job";
  title: string;
  authorName: string;
  area: string;
  status: "live" | "removed";
  createdAt: string;
  reportCount: number;
}

export interface AttendanceDispute {
  id: string;
  activityTitle: string;
  hostName: string;
  joinerName: string;
  openedAt: string;
  deadlineAt: string;
  status: "open" | "resolved_host" | "resolved_joiner" | "expired";
  note: string;
}

export interface JennyAutomationRow {
  id: string;
  label: string;
  status: "running" | "paused" | "failed";
  lastRunAt?: string;
  failureReason?: string;
}

export interface JennyCoverFlag {
  id: string;
  activityTitle: string;
  reason: string;
  flaggedAt: string;
}

export interface AiProviderStatus {
  name: string;
  reachable: boolean;
  detail: string;
}

export interface AdminTeamMember {
  id: string;
  name: string;
  email: string;
  twoFactorEnabled: boolean;
  launchAreas: string[];
  lastActiveAt: string;
}

const ago = (hours: number) => new Date(Date.now() - hours * 3600000).toISOString();
const agoDays = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

export function getLaunchMetrics(): LaunchMetric[] {
  return [
    { id: "signups", label: "Sign-ups", value: null, hint: "No data yet" },
    { id: "onboarding", label: "Onboarding completed", value: null, hint: "No data yet" },
    { id: "activities-created", label: "Activities created", value: null, hint: "No data yet" },
    { id: "activities-joined", label: "Activities joined", value: null, hint: "No data yet" },
    { id: "activities-completed", label: "Activities completed", value: null, hint: "No data yet" },
    { id: "needs-resolved", label: "Needs resolved", value: null, hint: "No data yet" },
    { id: "jobs", label: "Jobs posted", value: 11, hint: "From platform analytics" },
    { id: "applications", label: "Applications", value: 64, hint: "From platform analytics" },
    { id: "d1", label: "D1 return", value: null, hint: "No data yet" },
    { id: "d7", label: "D7 return", value: null, hint: "No data yet" },
    { id: "reports", label: "Reports filed", value: 2, hint: "Moderation queue" },
  ];
}

export function getVerificationQueue(): VerificationRequest[] {
  return [
    {
      id: "ver-1",
      companyName: "GreenLeaf Labs",
      domain: "greenleaflabs.example",
      website: "https://greenleaflabs.example",
      gstin: "36AABCG1234A1Z5",
      domainMatch: true,
      submittedAt: ago(6),
      status: "pending",
    },
    {
      id: "ver-2",
      companyName: "MapMyLane",
      domain: "mapmylane.example",
      website: "https://mapmylane.io",
      cin: "U72900TG2020PTC123456",
      domainMatch: false,
      submittedAt: ago(28),
      status: "pending",
    },
    {
      id: "ver-3",
      companyName: "CivicReach",
      domain: "civicreach.example",
      website: "https://civicreach.example",
      gstin: "36AAECC5678B2Z1",
      domainMatch: true,
      submittedAt: agoDays(3),
      status: "approved",
    },
  ];
}

export function getAdminContent(): AdminContentItem[] {
  return [
    {
      id: "cnt-1",
      kind: "activity",
      title: "Sunrise run at Durgam Lake",
      authorName: "Priya Sharma",
      area: "Gachibowli",
      status: "live",
      createdAt: agoDays(2),
      reportCount: 0,
    },
    {
      id: "cnt-2",
      kind: "need",
      title: "Help moving a sofa this weekend",
      authorName: "Arjun Nair",
      area: "Gopanapally",
      status: "live",
      createdAt: ago(18),
      reportCount: 1,
    },
    {
      id: "cnt-3",
      kind: "job",
      title: "Community Program Assistant",
      authorName: "GreenLeaf Labs",
      area: "Hyderabad",
      status: "live",
      createdAt: agoDays(5),
      reportCount: 0,
    },
  ];
}

export function getDisputes(): AttendanceDispute[] {
  const deadline = new Date(Date.now() + 36 * 3600000).toISOString();
  return [
    {
      id: "disp-1",
      activityTitle: "Weekend cricket — tennis ball",
      hostName: "Rohit K.",
      joinerName: "Meera S.",
      openedAt: ago(12),
      deadlineAt: deadline,
      status: "open",
      note: "Joiner says they attended; host marked no-show.",
    },
    {
      id: "disp-2",
      activityTitle: "Morning yoga in the park",
      hostName: "Ananya P.",
      joinerName: "Vikram D.",
      openedAt: agoDays(4),
      deadlineAt: agoDays(1),
      status: "resolved_host",
      note: "Resolved in favour of the host after chat review.",
    },
  ];
}

export function getJennyAutomations(): JennyAutomationRow[] {
  return [
    { id: "ja-1", label: "Calendar reminders for approved activities", status: "running", lastRunAt: ago(2) },
    { id: "ja-2", label: "Draft need posts from voice intent", status: "paused" },
    { id: "ja-3", label: "Cover image generation", status: "failed", lastRunAt: ago(5), failureReason: "Gateway timeout" },
  ];
}

export function getJennyCoverFlags(): JennyCoverFlag[] {
  return [
    { id: "jc-1", activityTitle: "Late-night football at turf", reason: "Reported as misleading imagery", flaggedAt: ago(8) },
  ];
}

export function getAiProviders(): AiProviderStatus[] {
  return [
    { name: "JennySol gateway", reachable: true, detail: "Healthy — last check 2 min ago" },
    { name: "Cover generation", reachable: false, detail: "Unavailable in preview — no live provider" },
  ];
}

export function getJennyActionLog(): AuditEvent[] {
  return [
    { id: "ai-1", actorName: "Jenny", action: "draft.created", target: "Need — help with groceries", createdAt: ago(3) },
    { id: "ai-2", actorName: "Jenny", action: "approval.requested", target: "Message to activity host", createdAt: ago(7) },
  ];
}

export function getAdminTeam(): AdminTeamMember[] {
  return [
    {
      id: "adm-1",
      name: "Vikisol Platform Admin",
      email: "platform-admin@vikisol.dev",
      twoFactorEnabled: true,
      launchAreas: ["Gachibowli", "Gopanapally"],
      lastActiveAt: ago(1),
    },
    {
      id: "adm-2",
      name: "Safety lead",
      email: "safety@vikisol.dev",
      twoFactorEnabled: true,
      launchAreas: ["All areas"],
      lastActiveAt: agoDays(1),
    },
  ];
}

export function getPlatformAuditEvents(): AuditEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("arena_platform_activity");
    if (raw) return JSON.parse(raw) as AuditEvent[];
  } catch {
    /* fall through */
  }
  return [
    {
      id: "audit-seed-1",
      actorName: "Platform Admin",
      action: "moderation.dismissed",
      target: "Room report — badminton doubles",
      metadata: "Reviewed chat context; no policy breach",
      createdAt: agoDays(1),
    },
  ];
}

export function pushPlatformAudit(entry: Omit<AuditEvent, "id" | "createdAt">) {
  const all = getPlatformAuditEvents();
  all.unshift({ ...entry, id: `pa-audit-${Date.now()}`, createdAt: new Date().toISOString() });
  localStorage.setItem("arena_platform_activity", JSON.stringify(all.slice(0, 200)));
}

/** Extended user profile for admin (never includes passwords). */
export interface AdminUserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantName?: string;
  createdAt: string;
  suspended: boolean;
  dataExportPending: boolean;
  deleteRequested: boolean;
  joinedActivities: number;
  area?: string;
}

export function getAdminUserProfile(userId: string): AdminUserProfile | null {
  const map: Record<string, AdminUserProfile> = {
    "u-1": {
      id: "u-1",
      name: "Lakeshore Tech Talent Team",
      email: "demo.enterprise@vikisol.dev",
      role: "company_admin",
      tenantName: "Lakeshore Tech",
      createdAt: agoDays(90),
      suspended: false,
      dataExportPending: false,
      deleteRequested: false,
      joinedActivities: 0,
      area: "Gachibowli",
    },
    "u-4": {
      id: "u-4",
      name: "Priya Nair",
      email: "priya@example.dev",
      role: "talent",
      createdAt: agoDays(20),
      suspended: false,
      dataExportPending: true,
      deleteRequested: false,
      joinedActivities: 3,
      area: "Gachibowli",
    },
  };
  return map[userId] ?? null;
}
