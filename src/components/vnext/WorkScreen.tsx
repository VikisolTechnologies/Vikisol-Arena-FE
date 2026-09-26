"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyApplications } from "@/lib/api/applications";
import { getMyAssignedInterviews } from "@/lib/api/interviews";
import { getMyBids } from "@/lib/api/myBids";
import { closeNeed, getJoinedPosts, getJoinRequests, getMyPosts, recordJoinOutcome } from "@/lib/api/posts";
import { getSession } from "@/lib/session";
import type { Post } from "@/lib/types";
import { JennySlot, Card, useLoad } from "./shared";
import { Status, VNextShell } from "./Shell";

type Row = { id: string; group: "Active" | "Done"; title: string; meta: string; href?: string; action?: "resolve" | "attendance"; postId?: string };

function settled<T>(result: PromiseSettledResult<T>, empty: T): T {
  return result.status === "fulfilled" ? result.value : empty;
}

function pastActivity(post: Post) {
  return post.intentType === "activity" && !!post.startsAt && new Date(post.startsAt).getTime() <= Date.now();
}

function finished(status: string) {
  return status === "closed" || status === "cancelled" || status === "expired";
}

export function WorkScreen() {
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [joins, setJoins] = useState<{ id: string; userName: string; status: string; outcome?: string }[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [guest, setGuest] = useState<boolean | null>(null);
  useEffect(() => {
    setGuest(!getSession());
  }, []);
  const { data, error } = useLoad(async () => {
    if (guest !== false) return null;
    const role = getSession()?.role;
    const [applications, bids, mine, joined, interviews] = await Promise.allSettled([
      getMyApplications(),
      getMyBids(),
      getMyPosts(),
      getJoinedPosts(),
      role === "hiring_manager" ? getMyAssignedInterviews() : Promise.resolve([]),
    ]);
    const rows: Row[] = [];
    for (const application of settled(applications, [])) {
      const done = application.stage === "rejected";
      rows.push({
        id: `application-${application.id}`,
        group: done ? "Done" : "Active",
        title: `Application · ${application.stage}`,
        meta: application.stage === "interview" ? "Prepare interview" : "Open the record",
        href: application.stage === "interview" ? `/interviews/${application.id}` : `/applications/${application.id}`,
      });
    }
    for (const bid of settled(bids, [])) {
      const done = bid.status === "won" || bid.status === "lost";
      rows.push({
        id: `bid-${bid.bidId}`,
        group: done ? "Done" : "Active",
        title: `Bid · ${bid.status}`,
        meta: "See bids",
        href: `/marketplace/${bid.projectId}`,
      });
    }
    for (const interview of settled(interviews, [])) {
      const done = interview.status === "completed" || interview.status === "cancelled";
      rows.push({
        id: `interview-${interview.id}`,
        group: done ? "Done" : "Active",
        title: `Interview · ${interview.jobTitle}`,
        meta: "Prepare interview",
        href: `/enterprise/interviews/mine/${interview.id}`,
      });
    }
    for (const post of settled(mine, []).filter((post) => post.intentType === "activity" || post.intentType === "ask")) {
      const done = finished(post.status);
      const next = post.intentType === "ask" && !done
        ? "Close need"
        : pastActivity(post) && !done
          ? "Mark attendance"
          : post.roomId
            ? "Open room"
            : "Open the post";
      rows.push({
        id: `post-${post.id}`,
        group: done ? "Done" : "Active",
        title: `${post.intentType === "ask" ? "Need" : "Activity"} · ${post.title || post.body.slice(0, 80)}`,
        meta: `${post.status} · ${next}`,
        href: next === "Close need" || next === "Mark attendance" ? undefined : next === "Open room" && post.roomId ? `/rooms/${post.roomId}` : `/feed/${post.id}`,
        action: next === "Close need" ? "resolve" : next === "Mark attendance" ? "attendance" : undefined,
        postId: post.id,
      });
    }
    for (const post of settled(joined, []).filter((post) => post.intentType === "activity")) {
      rows.push({
        id: `joined-${post.id}`,
        group: finished(post.status) ? "Done" : "Active",
        title: `Joined · ${post.title || post.body.slice(0, 80)}`,
        meta: post.roomId ? "Open room" : "Open the post",
        href: post.roomId ? `/rooms/${post.roomId}` : `/feed/${post.id}`,
      });
    }
    return rows;
  }, [guest, reloadKey]);

  const active = data?.filter((row) => row.group === "Active") ?? [];
  const done = data?.filter((row) => row.group === "Done") ?? [];

  return (
    <VNextShell>
      <p className="font-display text-2xl font-semibold">Work</p>
      <JennySlot surface="Work" />
      {guest && (
        <Status kind="empty" title="Sign in to see your work" detail="Applications, joins, and projects you are part of stay on your account." />
      )}
      {guest && (
        <p className="mt-3 text-center">
          <Link href="/auth" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-soft">Sign in</Link>
        </p>
      )}
      {!guest && error && <Status kind="error" title="Work did not load" detail={error} />}
      {!guest && !error && !data && <Status kind="loading" title="Loading" />}
      {!guest && data && data.length === 0 && <Status kind="empty" title="You are not in anything yet" detail="When you apply, join, or start a project, it will be listed here." />}
      {!guest && data && data.length > 0 && (
        <div className="grid gap-6">
          {[["Active", active], ["Done", done]].map(([label, rows]) => (
            <section key={String(label)}>
              <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">{label}</h2>
              {(rows as Row[]).length === 0 && <p className="text-sm text-muted-foreground">Nothing here.</p>}
              <div className="grid gap-3">
                {(rows as Row[]).map((row) => (
                  row.href ? (
                    <Card key={row.id} href={row.href} title={row.title} meta={row.meta} />
                  ) : (
                    <button
                      key={row.id}
                      type="button"
                      className="block min-h-11 w-full rounded-3xl border border-border bg-card px-4 py-4 text-left"
                      onClick={() => {
                        setActionError(null);
                        if (row.action === "resolve") setResolveId(row.postId ?? null);
                        if (row.action === "attendance" && row.postId) {
                          setAttendanceId(row.postId);
                          getJoinRequests(row.postId).then(setJoins).catch((err: unknown) => {
                            setActionError(err instanceof Error ? err.message : "Attendance did not load.");
                          });
                        }
                      }}
                    >
                      <p className="font-medium">{row.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.meta}</p>
                    </button>
                  )
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {resolveId && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/50" onClick={() => setResolveId(null)}>
          <div className="w-full rounded-t-3xl bg-background p-5" onClick={(event) => event.stopPropagation()}>
            <p className="font-display text-lg font-semibold">Mark this need resolved?</p>
            <p className="mt-2 text-sm text-muted-foreground">This sets it to closed. People can still read it.</p>
            {actionError && <p className="mt-2 text-sm text-red-400">{actionError}</p>}
            <button
              type="button"
              className="mt-4 min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
              onClick={() => {
                void closeNeed(resolveId).then(() => {
                  setResolveId(null);
                  setReloadKey((key) => key + 1);
                }).catch((err: unknown) => setActionError(err instanceof Error ? err.message : "That did not close."));
              }}
            >
              Mark resolved
            </button>
            <button type="button" className="mt-2 block min-h-11 text-sm text-muted-foreground" onClick={() => setResolveId(null)}>Cancel</button>
          </div>
        </div>
      )}
      {attendanceId && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/50" onClick={() => setAttendanceId(null)}>
          <div className="max-h-[80svh] w-full overflow-auto rounded-t-3xl bg-background p-5" onClick={(event) => event.stopPropagation()}>
            <p className="font-display text-lg font-semibold">Who showed up?</p>
            {actionError && <p className="mt-2 text-sm text-red-400">{actionError}</p>}
            <div className="mt-3 grid gap-3">
              {joins.filter((join) => join.status === "approved").map((join) => (
                <div key={join.id} className="rounded-2xl border border-border px-3 py-3">
                  <p className="text-sm font-medium">{join.userName}</p>
                  <p className="text-xs text-muted-foreground">{join.outcome ? join.outcome : "Not recorded"}</p>
                  {!join.outcome && (
                    <div className="mt-2 flex gap-2">
                      {(["attended", "no_show"] as const).map((outcome) => (
                        <button
                          key={outcome}
                          type="button"
                          className="min-h-11 rounded-full border border-border px-3 text-sm"
                          onClick={() => {
                            void recordJoinOutcome(attendanceId, join.id, outcome).then(() => {
                              setJoins((current) => current.map((item) => (item.id === join.id ? { ...item, outcome } : item)));
                            }).catch((err: unknown) => setActionError(err instanceof Error ? err.message : "That did not save."));
                          }}
                        >
                          {outcome === "attended" ? "Attended" : "No show"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {joins.filter((join) => join.status === "approved").length === 0 && <p className="text-sm text-muted-foreground">Nobody has joined yet.</p>}
            </div>
            <button type="button" className="mt-3 min-h-11 text-sm text-muted-foreground" onClick={() => setAttendanceId(null)}>Close</button>
          </div>
        </div>
      )}
    </VNextShell>
  );
}
