"use client";

import { useEffect, useState, type ReactNode } from "react";
import { m } from "motion/react";
import { Clock, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { rise } from "@/lib/motion";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { TextField } from "@/components/bplus/TextField";
import { Panel, DashButton } from "@/components/dash/Parts";
import { formatDateTime } from "@/lib/format";

/** 24h / 72h SLA timer shown on moderation and dispute rows. */
export function SlaTimer({ deadlineAt, label = "Time left" }: { deadlineAt: string; label?: string }) {
  const [left, setLeft] = useState(() => formatRemaining(deadlineAt));

  useEffect(() => {
    const id = window.setInterval(() => setLeft(formatRemaining(deadlineAt)), 30_000);
    return () => clearInterval(id);
  }, [deadlineAt]);

  const urgent = left.expired || left.hours < 6;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold",
        urgent ? "bg-danger/15 text-danger-on-dark" : "bg-warning/15 text-warning",
      )}
      title={`Deadline ${formatDateTime(deadlineAt)}`}
    >
      <Clock className="size-3.5" aria-hidden />
      {left.expired ? "Overdue" : `${label}: ${left.text}`}
    </span>
  );
}

function formatRemaining(deadlineAt: string) {
  const ms = new Date(deadlineAt).getTime() - Date.now();
  if (ms <= 0) return { expired: true, hours: 0, text: "0h" };
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return { expired: false, hours, text: hours > 0 ? `${hours}h ${mins}m` : `${mins}m` };
}

/** Reason required for reject / warn / suspend / takedown actions. */
export function ReasonSheet({
  open,
  title,
  detail,
  confirmLabel,
  onClose,
  onConfirm,
  tone = "danger",
}: {
  open: boolean;
  title: string;
  detail?: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  tone?: "danger" | "primary";
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    setReason("");
    setError("");
    onClose();
  };

  const submit = async () => {
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onConfirm(reason.trim());
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={close} title={title}>
      {detail && <p className="mb-4 text-[14px] text-paper-ink-muted">{detail}</p>}
      <TextField
        label="Reason"
        labelStyle="stacked"
        value={reason}
        onChange={setReason}
        error={error}
        placeholder="Explain what you saw and why you're taking this action"
      />
      <div className="mt-5 flex flex-wrap gap-2">
        <DashButton variant="outline" onClick={close} onPaper>
          Cancel
        </DashButton>
        <DashButton variant={tone === "danger" ? "danger" : "primary"} onClick={submit} disabled={busy} onPaper>
          {busy ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden /> Working…
            </>
          ) : (
            confirmLabel
          )}
        </DashButton>
      </div>
    </BottomSheet>
  );
}

export function AdminLoading({ className }: { className?: string }) {
  return (
    <div className={cn("grid place-items-center py-24", className)} role="status" aria-label="Loading">
      <LoaderCircle className="size-8 animate-spin text-primary motion-reduce:animate-none" strokeWidth={2} aria-hidden />
    </div>
  );
}

/** Staggered list wrapper for admin rows. */
export function AdminList({ children }: { children: ReactNode }) {
  return (
    <m.div initial="hidden" animate="shown" className="space-y-2.5">
      {children}
    </m.div>
  );
}

export function AdminRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.div variants={rise} custom={0} className={cn("rounded-tile border border-line bg-surface px-4 py-3.5", className)}>
      {children}
    </m.div>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>;
}

export function NoDataYet({ label }: { label: string }) {
  return (
    <Panel tone="paper">
      <p className="text-[15px] font-medium text-paper-ink">{label}</p>
      <p className="mt-1 text-[13px] text-paper-ink-muted">No data yet — we&apos;ll show real numbers once launch tracking is wired.</p>
    </Panel>
  );
}

export const ADMIN_ACTION_LABELS: Record<string, string> = {
  "tenant.suspended": "Suspended a company",
  "tenant.reactivated": "Reactivated a company",
  "subscription.adjusted": "Adjusted a subscription",
  "moderation.dismissed": "Dismissed a report",
  "moderation.takedown": "Removed content",
  "moderation.warned": "Sent a warning",
  "moderation.suspended": "Suspended a person",
  "moderation.banned": "Banned a person",
  "flag.toggled": "Changed a feature flag",
  "user.suspended": "Suspended a user",
  "user.restored": "Restored a user",
  "user.force_signout": "Forced sign-out",
  "verification.approved": "Approved company verification",
  "verification.rejected": "Rejected company verification",
  "content.takedown": "Took down content",
  "dispute.resolved": "Resolved a dispute",
  "draft.created": "Drafted content",
  "approval.requested": "Asked for approval",
};
