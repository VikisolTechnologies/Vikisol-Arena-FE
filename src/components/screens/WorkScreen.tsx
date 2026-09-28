"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { m } from "motion/react";
import { Check, ChevronRight, CircleCheck, MessageSquare, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";
import { press, rise, spring } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { Pills, SectionHeader, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { useGuest, useSessionRole } from "@/hooks/use-arena-session";
import { closeNeed, getJoinRequests, loadWork, recordJoinOutcome, type WorkGroup, type WorkRow } from "@/lib/data/work";
import { whenLabel } from "@/lib/data/feed";
import type { PostJoinRequest } from "@/lib/types";

const TABS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
] as const;
type Tab = (typeof TABS)[number]["id"];
const GROUPS: { id: WorkGroup; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
];

export function WorkScreen() {
  const guest = useGuest();
  const role = useSessionRole();
  const [tab, setTab] = useState<Tab>("all");
  const [side, setSide] = useState<"all" | "need" | "offer">("all");
  const [rows, setRows] = useState<WorkRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);

  useEffect(() => {
    if (guest !== false) return;
    let cancelled = false;
    loadWork(role)
      .then((r) => !cancelled && (setError(null), setRows(r)))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "Work didn't load."));
    return () => {
      cancelled = true;
    };
  }, [guest, role, reload]);

  const groups = useMemo(
    () =>
      GROUPS.filter((g) => tab === "all" || tab === g.id).map((g) => ({
        ...g,
        rows: (rows ?? []).filter((r) => r.group === g.id && (side === "all" || r.side === side)),
      })),
    [rows, tab, side],
  );

  return (
    <AppShell>
      <header className="pt-3">
        <h1 className="font-display-serif text-[34px] font-medium leading-tight">Work</h1>
        <p className="mt-1 text-[15px] text-faint">From chats to real progress.</p>
      </header>
      <div className="mt-5">
        <Pills label="Show" options={TABS} value={tab} onChange={setTab} />
      </div>
      <div className="mt-3">
        <Pills
          label="Whose"
          tone="cream"
          segmented
          options={[
            { id: "all", label: "Everything" },
            { id: "need", label: "My needs" },
            { id: "offer", label: "My offers" },
          ]}
          value={side}
          onChange={setSide}
        />
      </div>

      <div className="mt-6">
        {guest ? (
          <StateCard kind="empty" title="Sign in to see your work" detail="Needs you're helping with, activities you're going to and applications stay on your account." action={<ButtonLink href="/auth?mode=signin">Sign in</ButtonLink>} />
        ) : error ? (
          <StateCard kind="error" title="Work didn't load" detail={error} action={<Button variant="outline" onClick={() => setReload((n) => n + 1)}>Try again</Button>} />
        ) : !rows ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading your work">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <StateCard kind="empty" title="Nothing in progress yet" detail="When you help with a need, join an activity or apply, it's tracked here." action={<ButtonLink href="/discover">Find something nearby</ButtonLink>} />
        ) : (
          <m.div key={`${tab}-${side}`} initial="hidden" animate="shown" className="space-y-7">
            {groups.map((g, gi) => (
              <m.section key={g.id} variants={rise} custom={gi} aria-label={g.label}>
                <SectionHeader title={g.label} />
                {g.rows.length === 0 ? (
                  <p className="text-[14px] text-faint">Nothing {g.label.toLowerCase()} right now.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {g.rows.map((row) => (
                      <li key={row.id}>
                        <WorkRowCard row={row} onAction={() => (row.action === "resolve" ? setResolveId(row.postId ?? null) : setAttendanceId(row.postId ?? null))} />
                      </li>
                    ))}
                  </ul>
                )}
              </m.section>
            ))}
          </m.div>
        )}
      </div>

      <figure className="mt-10 flex items-center justify-center gap-3 text-center">
        <Sprout className="size-6 shrink-0 text-faint" strokeWidth={1.25} aria-hidden />
        <blockquote className="font-display-serif text-[17px] italic leading-snug text-foreground/85">
          “Small actions, real change.
          <br />
          That&apos;s the Arena way.”
        </blockquote>
        <Sprout className="size-6 shrink-0 -scale-x-100 text-faint" strokeWidth={1.25} aria-hidden />
      </figure>

      <ResolveSheet postId={resolveId} onClose={() => setResolveId(null)} onDone={() => setReload((n) => n + 1)} />
      <AttendanceSheet postId={attendanceId} onClose={() => setAttendanceId(null)} />
    </AppShell>
  );
}

function WorkRowCard({ row, onAction }: { row: WorkRow; onAction: () => void }) {
  const done = row.group === "completed";
  const body = (
    <>
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-[radial-gradient(circle_at_30%_20%,var(--warning),var(--primary-pressed)_60%,var(--surface))]">
        {row.media && (
          // eslint-disable-next-line @next/next/no-img-element -- user media
          <img src={row.media} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="line-clamp-1 text-[16px] font-semibold">{row.title}</p>
        {row.when && <p className="text-[13px] text-paper-ink-muted">{whenLabel(row.when)}</p>}
        <p className="mt-0.5 flex items-center gap-1 text-[13px] font-semibold text-success-on-paper">
          <CircleCheck className="size-4" strokeWidth={2} aria-hidden />
          {row.action === "resolve" ? "Mark as resolved" : row.action === "attendance" ? "Record attendance" : row.role}
        </p>
        {done && <span className="mt-1 inline-block rounded-full bg-success/15 px-2 py-0.5 text-[12px] font-semibold text-success-on-paper">Completed</span>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-paper-ink-muted">
        {done ? <Check className="size-5 text-success-on-paper" strokeWidth={2.5} aria-label="Completed" /> : <ChevronRight className="size-5" strokeWidth={1.75} aria-hidden />}
        {row.replies ? (
          <span className="inline-flex items-center gap-1 text-[12px]">
            <MessageSquare className="size-3.5" strokeWidth={1.75} aria-hidden />
            {row.replies}
          </span>
        ) : null}
      </div>
    </>
  );
  const cls = "flex w-full items-center gap-3 rounded-tile bg-paper p-2.5 pr-3.5 text-paper-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  return (
    <m.div whileTap={press} transition={spring.snappy}>
      {row.href ? (
        <Link href={row.href} className={cls}>{body}</Link>
      ) : (
        <button type="button" onClick={onAction} className={cls}>{body}</button>
      )}
    </m.div>
  );
}

function ResolveSheet({ postId, onClose, onDone }: { postId: string | null; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <BottomSheet open={!!postId} onClose={onClose} title="Mark this need resolved">
      <h2 className="mt-3 pr-12 font-display-serif text-[26px] font-medium">Did the need get resolved?</h2>
      <p className="mt-2 text-[15px] text-paper-ink-muted">This closes it. People can still read it, and it counts on your profile.</p>
      {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      <Button
        className="mt-5"
        loading={busy}
        onClick={() => {
          if (!postId) return;
          setBusy(true);
          setError("");
          closeNeed(postId)
            .then(() => {
              onClose();
              onDone();
            })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "That didn't close. Nothing changed."))
            .finally(() => setBusy(false));
        }}
      >
        Mark resolved
      </Button>
    </BottomSheet>
  );
}

function AttendanceSheet({ postId, onClose }: { postId: string | null; onClose: () => void }) {
  const [joins, setJoins] = useState<PostJoinRequest[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    getJoinRequests(postId)
      .then((j) => !cancelled && setJoins(j))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "Attendance didn't load."));
    return () => {
      cancelled = true;
    };
  }, [postId]);
  const approved = (joins ?? []).filter((j) => j.status === "approved");
  return (
    <BottomSheet open={!!postId} onClose={onClose} title="Record attendance">
      <h2 className="mt-3 pr-12 font-display-serif text-[26px] font-medium">Who showed up?</h2>
      <p className="mt-2 text-[14px] text-paper-ink-muted">Attendance stays private between you and each person.</p>
      {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      <ul className="mt-4 space-y-2.5">
        {!joins && !error && <li className="text-[14px] text-paper-ink-muted">Loading…</li>}
        {joins && approved.length === 0 && <li className="text-[14px] text-paper-ink-muted">Nobody joined this one.</li>}
        {approved.map((j) => (
          <li key={j.id} className="rounded-tile bg-paper-muted p-3">
            <p className="text-[15px] font-semibold">{j.userName}</p>
            {j.outcome ? (
              <p className="text-[13px] text-paper-ink-muted">{j.outcome === "attended" ? "Attended" : "Didn't show"}</p>
            ) : (
              <div className="mt-2 flex gap-2">
                {(["attended", "no_show"] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    className={cn("min-h-11 rounded-full border px-4 text-[14px] font-semibold", "border-paper-ink/55")}
                    onClick={() =>
                      postId &&
                      recordJoinOutcome(postId, j.id, o)
                        .then(() => setJoins((cur) => (cur ?? []).map((x) => (x.id === j.id ? { ...x, outcome: o } : x))))
                        .catch((err: unknown) => setError(err instanceof Error ? err.message : "That didn't save."))
                    }
                  >
                    {o === "attended" ? "Attended" : "Didn't show"}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
