"use client";

import { useEffect, useState } from "react";
import { LogOut, Search, UserX, UserCheck } from "lucide-react";
import { AdminShell, usePlatformAdminGate } from "@/components/admin/AdminShell";
import { AdminList, AdminLoading, AdminRow, ReasonSheet } from "@/components/admin/parts";
import { getAdminUserProfile, pushPlatformAudit, type AdminUserProfile } from "@/components/admin/fixtures";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Pills, StateCard } from "@/components/bplus/Primitives";
import { DashButton, StatusPill } from "@/components/dash/Parts";
import { searchPlatformUsers } from "@/lib/api/platformAdmin";
import { formatDate } from "@/lib/format";
import { isRealMode } from "@/lib/api/mode";
import type { PlatformUser, Role } from "@/lib/types";

const ROLE_FILTERS: { key: Role | ""; label: string }[] = [
  { key: "", label: "All" },
  { key: "talent", label: "Talent" },
  { key: "recruiter", label: "Recruiter" },
  { key: "company_admin", label: "Company admin" },
  { key: "hiring_manager", label: "Hiring manager" },
  { key: "platform_admin", label: "Platform admin" },
];

export default function PlatformUsersPage() {
  const gate = usePlatformAdminGate();
  const [users, setUsers] = useState<PlatformUser[] | null>(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [profile, setProfile] = useState<AdminUserProfile | null>(null);
  const [suspended, setSuspended] = useState<Record<string, boolean>>({});
  const [action, setAction] = useState<{ user: PlatformUser; kind: "suspend" | "restore" } | null>(null);

  const load = (q: string, r: Role | "") => searchPlatformUsers(q, r || undefined).then(setUsers);

  useEffect(() => {
    if (gate === "ready") load(query, role);
  }, [gate, role]); // eslint-disable-line react-hooks/exhaustive-deps

  const openProfile = (u: PlatformUser) => {
    if (isRealMode()) {
      setProfile({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        tenantName: u.tenantName,
        createdAt: u.createdAt,
        suspended: false,
        dataExportPending: false,
        deleteRequested: false,
        joinedActivities: 0,
      });
      return;
    }
    setProfile(
      getAdminUserProfile(u.id) ?? {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        tenantName: u.tenantName,
        createdAt: u.createdAt,
        suspended: suspended[u.id] ?? false,
        dataExportPending: false,
        deleteRequested: false,
        joinedActivities: 0,
      },
    );
  };

  const confirmSuspendRestore = async (reason: string) => {
    if (!action || isRealMode()) return;
    const next = action.kind === "suspend";
    setSuspended((s) => ({ ...s, [action.user.id]: next }));
    pushPlatformAudit({
      actorName: "Platform Admin",
      action: next ? "user.suspended" : "user.restored",
      target: action.user.email,
      metadata: reason,
    });
    if (profile?.id === action.user.id) {
      setProfile((p) => (p ? { ...p, suspended: next } : p));
    }
  };

  const forceSignOut = (u: PlatformUser) => {
    if (isRealMode()) return;
    pushPlatformAudit({
      actorName: "Platform Admin",
      action: "user.force_signout",
      target: u.email,
      metadata: "All sessions invalidated (preview)",
    });
  };

  return (
    <AdminShell title="Users">
      <div className="mb-4 flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4">
        <Search className="size-4 text-faint" aria-hidden />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            load(e.target.value, role);
          }}
          placeholder="Search by name or email…"
          aria-label="Search users"
          className="w-full bg-transparent py-2.5 text-[15px] outline-none placeholder:text-faint"
        />
      </div>
      <Pills
        options={ROLE_FILTERS.map((r) => ({ id: r.key, label: r.label }))}
        value={role}
        onChange={(k) => setRole(k)}
        label="Role filter"
        compact
      />

      {!users ? (
        <AdminLoading className="mt-5" />
      ) : users.length === 0 ? (
        <div className="mt-5">
          <StateCard kind="empty" title="No users match that search." />
        </div>
      ) : (
        <AdminList>
          {users.map((u) => {
            const isSuspended = suspended[u.id];
            return (
              <AdminRow key={u.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => openProfile(u)} className="min-w-0 flex-1 text-left outline-none focus-visible:underline">
                    <p className="truncate text-[15px] font-semibold">{u.name}</p>
                    <p className="truncate text-[13px] text-faint">{u.email}</p>
                  </button>
                  {u.tenantName && <span className="text-[12px] text-faint">{u.tenantName}</span>}
                  <StatusPill status={isSuspended ? "suspended" : "active"} />
                  <span className="text-[12px] capitalize text-faint">{u.role.replace(/_/g, " ")}</span>
                  <span className="text-[12px] text-faint">{formatDate(u.createdAt)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <DashButton variant="outline" onClick={() => openProfile(u)}>
                    View profile
                  </DashButton>
                  {!isRealMode() && (
                    <>
                      {isSuspended ? (
                        <DashButton variant="primary" onClick={() => setAction({ user: u, kind: "restore" })}>
                          <UserCheck className="size-4" aria-hidden /> Restore…
                        </DashButton>
                      ) : (
                        <DashButton variant="danger" onClick={() => setAction({ user: u, kind: "suspend" })}>
                          <UserX className="size-4" aria-hidden /> Suspend…
                        </DashButton>
                      )}
                      <DashButton variant="outline" onClick={() => forceSignOut(u)}>
                        <LogOut className="size-4" aria-hidden /> Force sign-out
                      </DashButton>
                    </>
                  )}
                </div>
              </AdminRow>
            );
          })}
        </AdminList>
      )}

      <BottomSheet open={!!profile} onClose={() => setProfile(null)} title="User profile">
        {profile && (
          <div className="space-y-3 text-[14px] text-paper-ink">
            <p className="font-display-serif text-[22px] font-medium">{profile.name}</p>
            <p>{profile.email}</p>
            <p className="text-paper-ink-muted capitalize">Role: {profile.role.replace(/_/g, " ")}</p>
            {profile.tenantName && <p className="text-paper-ink-muted">Company: {profile.tenantName}</p>}
            {profile.area && <p className="text-paper-ink-muted">Area: {profile.area}</p>}
            <p className="text-paper-ink-muted">Joined {formatDate(profile.createdAt)}</p>
            <p className="text-paper-ink-muted">Activities joined: {profile.joinedActivities}</p>
            {profile.dataExportPending && (
              <p className="rounded-xl bg-warning/20 px-3 py-2 text-[13px]">Data export requested — pending</p>
            )}
            {profile.deleteRequested && (
              <p className="rounded-xl bg-danger/15 px-3 py-2 text-[13px] text-danger-on-paper">Account deletion requested</p>
            )}
            <p className="text-[12px] text-paper-ink-muted">Passwords are never shown in Arena Admin.</p>
            {!isRealMode() && (
              <p className="text-[12px] text-paper-ink-muted">Suspend, restore and force sign-out are preview actions until gap #51 ships.</p>
            )}
          </div>
        )}
      </BottomSheet>

      <ReasonSheet
        open={!!action}
        title={action?.kind === "suspend" ? "Suspend user" : "Restore user"}
        detail={action ? `${action.user.email} — reason is logged in the audit trail.` : undefined}
        confirmLabel={action?.kind === "suspend" ? "Suspend" : "Restore"}
        onClose={() => setAction(null)}
        onConfirm={confirmSuspendRestore}
        tone={action?.kind === "suspend" ? "danger" : "primary"}
      />
    </AdminShell>
  );
}
