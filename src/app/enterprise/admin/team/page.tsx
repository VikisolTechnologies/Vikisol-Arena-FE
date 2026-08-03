"use client";

import { useEffect, useState } from "react";
import { Plus, Copy, Check, UserX, UserCheck, Trash2 } from "lucide-react";
import { CompanyAdminShell } from "@/components/app/CompanyAdminShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  getTeam, getPendingInvitations, inviteMember, revokeInvitation, changeMemberRole, setMemberSuspended, removeMember,
  type TeamMember, type Invitation,
} from "@/lib/api/companyAdmin";
import { getMyEnterpriseProfile } from "@/lib/api/enterprise";
import type { Role, EnterpriseProfile } from "@/lib/types";

const INVITABLE_ROLES: { key: Role; label: string }[] = [
  { key: "recruiter", label: "Recruiter" },
  { key: "hiring_manager", label: "Hiring manager" },
  { key: "company_admin", label: "Company admin" },
];

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400",
  invited: "bg-amber-500/15 text-amber-400",
  suspended: "bg-red-500/15 text-red-400",
  pending: "bg-amber-500/15 text-amber-400",
};

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("recruiter");
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = () => {
    getTeam().then(setTeam);
    getPendingInvitations().then(setInvitations);
    getMyEnterpriseProfile().then(setProfile);
  };

  useEffect(load, []);

  const seatsUsed = (team?.filter((m) => m.status !== "suspended").length ?? 0) + invitations.length;
  const seatsTotal = profile?.seatsTotal ?? 0;
  const atLimit = seatsTotal > 0 && seatsUsed >= seatsTotal;

  const submitInvite = async () => {
    if (!email.trim()) return;
    setError("");
    try {
      await inviteMember(email.trim(), role);
      setEmail("");
      setInviting(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send invite");
    }
  };

  const copyLink = (invite: Invitation) => {
    navigator.clipboard?.writeText(invite.inviteLink).catch(() => {});
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (!team) {
    return (
      <CompanyAdminShell title="Team">
        <OrbLoader className="h-96" />
      </CompanyAdminShell>
    );
  }

  return (
    <CompanyAdminShell
      title="Team"
      actions={
        <Button variant="primary-gradient" size="sm" className="gap-1.5" onClick={() => setInviting(true)} disabled={atLimit}>
          <Plus className="size-3.5" /> Invite
        </Button>
      }
    >
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-border bg-white/[0.02] px-4 py-3 text-sm">
        <span className="text-muted-foreground">Seats used</span>
        <span className={atLimit ? "font-semibold text-amber-400" : "font-semibold"}>
          {seatsUsed}/{seatsTotal || "—"}
          {atLimit && " · upgrade your plan to invite more"}
        </span>
      </div>

      {invitations.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending invitations</p>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white/[0.02] px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{inv.email}</p>
                  <p className="text-xs capitalize text-muted-foreground">{inv.role.replace("_", " ")}</p>
                </div>
                <Badge variant="secondary" className={STATUS_TONE.pending}>Pending</Badge>
                <Button variant="ghost-glass" size="sm" className="gap-1.5" onClick={() => copyLink(inv)}>
                  {copiedId === inv.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copiedId === inv.id ? "Copied" : "Copy link"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => revokeInvitation(inv.id).then(load)}>Revoke</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Members</p>
      <div className="space-y-2">
        {team.map((m) => (
          <div key={m.membershipId} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white/[0.02] px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.name}</p>
              <p className="truncate text-xs text-muted-foreground">{m.email}</p>
            </div>
            <select
              value={m.role}
              onChange={(e) => changeMemberRole(m.membershipId, e.target.value as Role).then(load)}
              className="rounded-full border border-border bg-white/[0.03] px-3 py-1.5 text-xs capitalize"
            >
              {INVITABLE_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            <Badge variant="secondary" className={STATUS_TONE[m.status]}>{m.status}</Badge>
            {m.status === "suspended" ? (
              <Button variant="ghost-glass" size="sm" className="gap-1.5" onClick={() => setMemberSuspended(m.membershipId, false).then(load)}>
                <UserCheck className="size-3.5" /> Reactivate
              </Button>
            ) : (
              <Button variant="ghost-glass" size="sm" className="gap-1.5" onClick={() => setMemberSuspended(m.membershipId, true).then(load)}>
                <UserX className="size-3.5" /> Suspend
              </Button>
            )}
            <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => removeMember(m.membershipId).then(load)}>
              <Trash2 className="size-4 text-red-400" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={inviting} onOpenChange={setInviting}>
        <DialogContent className="border-border bg-popover">
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>No email provider is configured yet, so you&apos;ll get a link to share directly.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" className="border-border bg-white/[0.03]" />
            <div className="flex gap-2">
              {INVITABLE_ROLES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRole(r.key)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                    role === r.key ? "border-primary/60 bg-primary/10 text-primary-soft" : "border-border bg-white/[0.03] text-muted-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button variant="primary-gradient" size="sm" className="w-full" onClick={submitInvite} disabled={!email.trim()}>
              Send invite
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </CompanyAdminShell>
  );
}
