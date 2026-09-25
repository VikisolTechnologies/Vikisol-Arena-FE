"use client";

import { useRef, useState } from "react";
import { decideAgentAction } from "@/lib/api/agent";
import type { AgentAction } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const LABELS: Record<string, string> = {
  "arena.createPost": "Publish this post",
  "arena.joinActivity": "Join this activity",
  "arena.createProject": "Publish this project",
  "arena.placeBid": "Submit this bid",
  "arena.applyToJob": "Apply to this job",
};
const STATUS: Record<AgentAction["status"], string> = {
  pending: "Review before approving", done: "Completed", declined: "Not approved",
  expired: "This proposal has expired. Ask Jenny again.", failed: "The action failed.",
  unknown: "Result unconfirmed. Check Arena before trying this action again.",
};
const FIELDS: Record<string, string> = {
  kind: "Post type", body: "Post", title: "Title", locationText: "Area", startsAt: "Starts at",
  capacity: "Places", anonymous: "Post anonymously", description: "Description", skills: "Skills",
  budgetMin: "Minimum budget (₹)", budgetMax: "Maximum budget (₹)", durationWeeks: "Duration (weeks)",
  amount: "Bid amount (₹)", communityId: "Community",
};
const DESTINATIONS: Record<string, { path: string; label: string }> = {
  postId: { path: "/feed/", label: "View activity" }, jobId: { path: "/jobs/", label: "View job" },
  projectId: { path: "/marketplace/", label: "View project" },
};

export function AgentActionCard({ action, onChange }: { action: AgentAction; onChange: (action: AgentAction) => void }) {
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function decide(approve: boolean) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try { onChange(await decideAgentAction(action.id, approve)); }
    catch {
      // The response can be lost after execution. Do not encourage a blind retry.
      setError("Couldn't confirm the result. Reload this conversation and check Arena before trying again.");
    } finally { busyRef.current = false; setBusy(false); }
  }
  return (
    <section aria-label="Proposed action" className="mt-3 max-w-md rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <h3 className="text-sm font-semibold">{LABELS[action.toolName] ?? "Review proposed action"}</h3>
      <dl className="mt-3 space-y-2 text-sm">
        {Object.entries(action.args).map(([key, value]) => (
          <div key={key}>
            <dt className="text-muted-foreground">{FIELDS[key] ?? (DESTINATIONS[key] ? "Review the details" : key.replace(/([A-Z])/g, " $1"))}</dt>
            <dd className="whitespace-pre-wrap break-words">{DESTINATIONS[key] && typeof value === "string" ? (
              <Link className="underline" href={`${DESTINATIONS[key].path}${encodeURIComponent(value)}`}>{DESTINATIONS[key].label}</Link>
            ) : typeof value === "boolean" ? (value ? "Yes" : "No") : Array.isArray(value) ? value.join(", ") : String(value ?? "—")}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm" role="status">{STATUS[action.status]}</p>
      {action.error && <p className="mt-2 text-sm text-muted-foreground">{action.error}</p>}
      {action.status === "done" && action.toolName === "arena.joinActivity" && action.result?.status === "pending" &&
        <p className="mt-2 text-sm">Your request was sent. The host still needs to approve it.</p>}
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
      {action.status === "pending" && !error && (
        <div className="mt-3 flex gap-2">
          <Button disabled={busy} onClick={() => void decide(true)}>{busy ? "Please wait…" : "Approve"}</Button>
          <Button variant="outline" disabled={busy} onClick={() => void decide(false)}>Not now</Button>
        </div>
      )}
    </section>
  );
}
