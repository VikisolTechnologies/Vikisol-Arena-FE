"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { m } from "motion/react";
import { rise } from "@/lib/motion";
import { Button } from "@/components/bplus/Button";
import { decideAgentAction } from "@/lib/api/agent";
import type { AgentAction } from "@/lib/types";

const LABELS: Record<string, string> = {
  "arena.createPost": "Publish this post",
  "arena.joinActivity": "Join this activity",
  "arena.createProject": "Publish this project",
  "arena.placeBid": "Submit this bid",
  "arena.applyToJob": "Apply to this job",
};
const STATUS: Record<AgentAction["status"], string> = {
  pending: "Review before approving",
  done: "Completed",
  declined: "Not approved",
  expired: "This proposal has expired. Ask Jenny again.",
  failed: "The action failed.",
  unknown: "Result unconfirmed. Check Arena before trying this action again.",
};
const FIELDS: Record<string, string> = {
  kind: "Post type", body: "Post", title: "Title", locationText: "Area", startsAt: "Starts at",
  capacity: "Places", anonymous: "Post anonymously", description: "Description", skills: "Skills",
  budgetMin: "Minimum budget (₹)", budgetMax: "Maximum budget (₹)", durationWeeks: "Duration (weeks)",
  amount: "Bid amount (₹)", communityId: "Community",
};
const DESTINATIONS: Record<string, { path: string; label: string }> = {
  postId: { path: "/feed/", label: "View activity" },
  jobId: { path: "/jobs/", label: "View job" },
  projectId: { path: "/marketplace/", label: "View project" },
};

/**
 * A real proposal from Jenny. Only the backend-owned proposal id is sent, and nothing runs
 * without this click — whatever the person's autonomy setting.
 */
export function JennyActionCard({ action, onChange }: { action: AgentAction; onChange: (action: AgentAction) => void }) {
  const busyRef = useRef(false);
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(approve ? "approve" : "decline");
    setError(null);
    try {
      onChange(await decideAgentAction(action.id, approve));
    } catch {
      // The response can be lost after execution. Don't encourage a blind retry.
      setError("Couldn't confirm the result. Reload this conversation and check Arena before trying again.");
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }

  return (
    <m.section initial="hidden" animate="shown" variants={rise} aria-label="Proposed action" className="rounded-[var(--radius-card)] bg-paper p-5 text-paper-ink">
      <h3 className="font-display-serif text-[20px] leading-snug">{LABELS[action.toolName] ?? "Review proposed action"}</h3>
      <dl className="mt-3 space-y-2.5 text-[15px]">
        {Object.entries(action.args).map(([key, value]) => (
          <div key={key}>
            <dt className="text-[13px] text-paper-ink-muted">{FIELDS[key] ?? (DESTINATIONS[key] ? "Review the details" : key.replace(/([A-Z])/g, " $1"))}</dt>
            <dd className="whitespace-pre-wrap break-words">
              {DESTINATIONS[key] && typeof value === "string" ? (
                <Link className="font-semibold text-primary-on-paper underline underline-offset-4" href={`${DESTINATIONS[key].path}${encodeURIComponent(value)}`}>{DESTINATIONS[key].label}</Link>
              ) : typeof value === "boolean" ? (value ? "Yes" : "No") : Array.isArray(value) ? value.join(", ") : String(value ?? "—")}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[14px] font-semibold" role="status">{STATUS[action.status]}</p>
      {action.error && <p className="mt-1 text-[14px] text-paper-ink-muted">{action.error}</p>}
      {action.status === "done" && action.toolName === "arena.joinActivity" && action.result?.status === "pending" && (
        <p className="mt-1 text-[14px]">Your request was sent. The host still needs to approve it.</p>
      )}
      {error && <p role="alert" className="mt-2 text-[14px] text-danger-on-paper">{error}</p>}
      {action.status === "pending" && !error && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button onClick={() => void decide(true)} loading={busy === "approve"} disabled={busy !== null} className="h-12">Approve</Button>
          <Button variant="outline" onClick={() => void decide(false)} loading={busy === "decline"} disabled={busy !== null} className="h-12 border-paper-ink/55 text-paper-ink">Not now</Button>
        </div>
      )}
    </m.section>
  );
}
