"use client";

import { useEffect, useState } from "react";
import { m } from "motion/react";
import { Check, Copy, Plus, Trash2, UserCheck, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import { rise, shake } from "@/lib/motion";
import { CompanyAdminShell } from "@/components/app/CompanyAdminShell";
import { Avatar } from "@/components/bplus/Avatar";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button } from "@/components/bplus/Button";
import { Skeleton } from "@/components/bplus/Primitives";
import { DashButton, Panel, StatusPill } from "@/components/dash/Parts";
import {
  changeMemberRole, getPendingInvitations, getTeam, inviteMember, removeMember, revokeInvitation, setMemberSuspended,
  type Invitation, type TeamMember,
} from "@/lib/api/companyAdmin";
import { getMyEnterpriseProfile } from "@/lib/api/enterprise";
import type { EnterpriseProfile, Role } from "@/lib/types";

const ROLES: { key: Role; label: string; detail: string }[] = [
  { key: "recruiter", label: "Recruiter", detail: "Posts jobs, moves candidates, messages." },
  { key: "hiring_manager", label: "Hiring manager", detail: "Runs the interviews they're assigned." },
  { key: "company_admin", label: "Admin", detail: "Everything, plus team, billing and settings." },
];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Company settings — Team (flow §8 B3; no board — designed in B+). Same companyAdmin calls. */
export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [role, setRole] = useState<Role>("recruiter");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pageError, setPageError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<TeamMember | null>(null);

  const load = () => {
    getTeam().then(setTeam).catch(() => { setTeam([]); setPageError("The team didn't load. Refresh to try again."); });
    getPendingInvitations().then(setInvitations).catch(() => {});
    getMyEnterpriseProfile().then(setProfile).catch(() => {});
  };
  useEffect(load, []);

  const act = async (fn: () => Promise<unknown>, fail: string) => {
    setPageError("");
    try {
      await fn();
      load();
    } catch {
      setPageError(fail);
    }
  };

  const seatsUsed = (team?.filter((x) => x.status !== "suspended").length ?? 0) + invitations.length;
  const seatsTotal = profile?.seatsTotal ?? 0;
  const atLimit = seatsTotal > 0 && seatsUsed >= seatsTotal;
  const emailError = touched && !EMAIL.test(email.trim()) ? "Enter a work email, like name@company.com." : "";

  const submitInvite = async () => {
    setTouched(true);
    if (!EMAIL.test(email.trim())) {
      setAttempt((a) => a + 1);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await inviteMember(email.trim(), role);
      setEmail("");
      setTouched(false);
      setInviting(false);
      load();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "The invite didn't send. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (inv: Invitation) => {
    try {
      await navigator.clipboard.writeText(inv.inviteLink);
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setPageError(`Couldn't copy. The link is ${inv.inviteLink}`);
    }
  };

  return (
    <CompanyAdminShell title="Team" actions={<DashButton onClick={() => setInviting(true)} disabled={atLimit}><Plus className="size-4" aria-hidden /> Invite</DashButton>}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-tile border border-line bg-surface px-4 py-3 text-[15px]">
        <span className="text-faint">Seats used</span>
        <span className={cn("font-semibold", atLimit && "text-warning")}>{seatsUsed} of {seatsTotal || "—"}{atLimit && " · change plan in Billing to invite more"}</span>
      </div>
      {pageError && <p role="alert" className="mb-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{pageError}</p>}

      {!team ? (
        <Skeleton className="h-64" />
      ) : (
        <m.div initial="hidden" animate="shown" className="space-y-5">
          {invitations.length > 0 && (
            <m.div variants={rise}>
              <Panel title="Waiting to join">
                <ul className="divide-y divide-line">
                  {invitations.map((inv) => (
                    <li key={inv.id} className="flex flex-wrap items-center gap-3 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium">{inv.email}</span>
                        <span className="text-[13px] text-faint">{ROLES.find((r) => r.key === inv.role)?.label ?? inv.role} · invited by {inv.invitedByName}</span>
                      </span>
                      <DashButton variant="outline" onClick={() => copyLink(inv)}>{copiedId === inv.id ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}{copiedId === inv.id ? "Copied" : "Copy link"}</DashButton>
                      <DashButton variant="outline" onClick={() => act(() => revokeInvitation(inv.id), "The invite wasn't revoked. Try again.")}>Revoke</DashButton>
                    </li>
                  ))}
                </ul>
              </Panel>
            </m.div>
          )}
          <m.div variants={rise} custom={1}>
            <Panel title="Members">
              <ul className="divide-y divide-line">
                {team.map((x) => (
                  <li key={x.membershipId} className="py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={x.name} className="size-10 text-[14px]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">{x.name}</span>
                        <span className="block truncate text-[13px] text-faint">{x.email}</span>
                      </span>
                      <StatusPill status={x.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 pl-[52px]">
                      <label>
                        <span className="sr-only">Role for {x.name}</span>
                        <select value={x.role} onChange={(e) => act(() => changeMemberRole(x.membershipId, e.target.value as Role), "The role didn't change. Try again.")} className="min-h-11 rounded-full border border-field-line bg-transparent px-3 text-[14px] [&>option]:text-paper-ink">
                          {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                        </select>
                      </label>
                      {x.status === "suspended" ? (
                        <DashButton variant="outline" onClick={() => act(() => setMemberSuspended(x.membershipId, false), "Didn't reactivate. Try again.")}><UserCheck className="size-4" aria-hidden /> Reactivate</DashButton>
                      ) : (
                        <DashButton variant="outline" onClick={() => act(() => setMemberSuspended(x.membershipId, true), "Didn't suspend. Try again.")}><UserX className="size-4" aria-hidden /> Suspend</DashButton>
                      )}
                      <button type="button" aria-label={`Remove ${x.name}`} onClick={() => setRemoving(x)} className="ml-auto grid size-11 place-items-center rounded-full text-danger-on-dark hover:bg-danger/10"><Trash2 className="size-4" aria-hidden /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </m.div>
        </m.div>
      )}

      <BottomSheet open={inviting} onClose={() => !busy && setInviting(false)} title="Invite a teammate">
        <h2 className="font-display-serif text-[24px] leading-tight">Invite a teammate</h2>
        <p className="mt-1 text-[14px] text-paper-ink-muted">Arena gives you a link to share with them — invite emails aren&apos;t sent yet.</p>
        <m.div key={attempt} animate={attempt && emailError ? { x: [...shake.x] } : undefined} transition={shake.transition}>
          <label htmlFor="invite-email" className="mt-4 block text-[15px] font-semibold">Work email</label>
          <input id="invite-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched(true)} aria-invalid={!!emailError} aria-describedby="invite-email-error" placeholder="teammate@company.com" className="mt-1.5 min-h-12 w-full rounded-xl border border-paper-ink/25 bg-white px-3 text-[15px] aria-[invalid=true]:border-danger-on-paper" />
          <p id="invite-email-error" className="mt-1 min-h-5 text-[13px] font-semibold text-danger-on-paper">{emailError}</p>
        </m.div>
        <fieldset className="mt-2">
          <legend className="text-[15px] font-semibold">Role</legend>
          <div role="radiogroup" aria-label="Role" className="mt-2 grid gap-2">
            {ROLES.map((r) => (
              <button key={r.key} type="button" role="radio" aria-checked={role === r.key} onClick={() => setRole(r.key)} className={cn("rounded-2xl border-2 p-3 text-left", role === r.key ? "border-primary-on-paper bg-white" : "border-transparent bg-paper-muted")}>
                <span className="block text-[15px] font-semibold">{r.label}</span>
                <span className="block text-[13px] text-paper-ink-muted">{r.detail}</span>
              </button>
            ))}
          </div>
        </fieldset>
        {error && <p role="alert" className="mt-3 text-[14px] font-semibold text-danger-on-paper">{error}</p>}
        <Button className="mt-5" loading={busy} onClick={submitInvite}>Create invite link</Button>
      </BottomSheet>

      <BottomSheet open={!!removing} onClose={() => setRemoving(null)} title="Remove teammate">
        <h2 className="font-display-serif text-[24px] leading-tight">Remove {removing?.name}?</h2>
        <p className="mt-2 text-[15px] text-paper-ink-muted">They lose access to this workspace straight away. Their past actions stay in the audit log.</p>
        <div className="mt-5 grid gap-2">
          <Button onClick={() => { const x = removing; setRemoving(null); if (x) void act(() => removeMember(x.membershipId), "They weren't removed. Try again."); }}>Remove</Button>
          <button type="button" onClick={() => setRemoving(null)} className="min-h-11 text-[15px] font-semibold text-paper-ink-muted">Cancel</button>
        </div>
      </BottomSheet>
    </CompanyAdminShell>
  );
}
