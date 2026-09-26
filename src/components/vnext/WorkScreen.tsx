"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyApplications } from "@/lib/api/applications";
import { getMyAssignedInterviews } from "@/lib/api/interviews";
import { getMyBids } from "@/lib/api/myBids";
import { getJoinedPosts, getMyPosts } from "@/lib/api/posts";
import { getSession } from "@/lib/session";
import type { Post } from "@/lib/types";
import { JennySlot, Card, useLoad } from "./shared";
import { Status, VNextShell } from "./Shell";

type Row = { id: string; group: "Active" | "Done"; title: string; meta: string; href: string };

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
        href: next === "Open room" && post.roomId ? `/rooms/${post.roomId}` : `/feed/${post.id}`,
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
  }, [guest]);

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
                  <Card key={row.id} href={row.href} title={row.title} meta={row.meta} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </VNextShell>
  );
}
