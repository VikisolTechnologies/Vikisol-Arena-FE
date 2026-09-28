/**
 * Work domain: everything the signed-in person is part of, from the existing endpoints
 * (applications, bids, own posts, joined activities, assigned interviews). Unchanged calls;
 * this only groups them into Active / Upcoming / Completed and says what *you* are doing.
 */
import { getMyApplications } from "@/lib/api/applications";
import { getMyAssignedInterviews } from "@/lib/api/interviews";
import { getMyBids } from "@/lib/api/myBids";
import { closeNeed, getJoinedPosts, getJoinRequests, getMyPosts, recordJoinOutcome } from "@/lib/api/posts";
import type { Post } from "@/lib/types";

export { closeNeed, getJoinRequests, recordJoinOutcome };

export type WorkGroup = "active" | "upcoming" | "completed";

export interface WorkRow {
  id: string;
  group: WorkGroup;
  title: string;
  when?: string;
  role: string;
  href?: string;
  media?: string;
  action?: "resolve" | "attendance";
  postId?: string;
  replies?: number;
  /** Board "See the outcome": which switch it sits under — needs you posted, or help you offered. */
  side?: "need" | "offer";
  /** Post kind, for the cover (activities get a generated one). */
  kind?: string;
}

/** One failing or malformed source must never blank the whole Work screen. */
const settled = <T,>(r: PromiseSettledResult<T[]>, empty: T[]): T[] => (r.status === "fulfilled" && Array.isArray(r.value) ? r.value : empty);
const finished = (status: string) => status === "closed" || status === "cancelled" || status === "expired";
const future = (iso?: string) => !!iso && new Date(iso).getTime() > Date.now();
const past = (iso?: string) => !!iso && new Date(iso).getTime() <= Date.now();
const titleOf = (p: Post) => p.title?.trim() || p.body.trim().slice(0, 80);

export async function loadWork(role: string): Promise<WorkRow[]> {
  const [applications, bids, mine, joined, interviews] = await Promise.allSettled([
    getMyApplications(),
    getMyBids(),
    getMyPosts(),
    getJoinedPosts(),
    role === "hiring_manager" ? getMyAssignedInterviews() : Promise.resolve([]),
  ]);
  const rows: WorkRow[] = [];

  for (const a of settled(applications, [])) {
    rows.push({
      id: `application-${a.id}`,
      group: a.stage === "rejected" ? "completed" : "active",
      title: "Job application",
      when: a.updatedAt,
      role: a.stage === "interview" ? "Interview stage" : a.stage === "offer" ? "Offer received" : a.stage === "rejected" ? "Not selected" : "You applied",
      href: a.stage === "interview" ? `/interviews/${a.id}` : `/applications/${a.id}`,
    });
  }
  for (const b of settled(bids, [])) {
    rows.push({
      id: `bid-${b.bidId}`,
      group: b.status === "won" || b.status === "lost" ? "completed" : "active",
      title: "Project bid",
      when: b.submittedAt,
      role: b.status === "won" ? "You won this" : b.status === "lost" ? "Not selected" : "You bid",
      href: `/marketplace/${b.projectId}`,
    });
  }
  for (const i of settled(interviews, [])) {
    rows.push({
      id: `interview-${i.id}`,
      group: i.status === "completed" || i.status === "cancelled" ? "completed" : "upcoming",
      title: `Interview · ${i.jobTitle}`,
      role: "You're interviewing",
      href: `/enterprise/interviews/mine/${i.id}`,
    });
  }
  for (const p of settled(mine, []).filter((p) => p.intentType === "activity" || p.intentType === "ask" || p.intentType === "offer")) {
    const done = finished(p.status);
    const isNeed = p.intentType === "ask";
    const needsAttendance = p.intentType === "activity" && past(p.startsAt) && !done;
    rows.push({
      id: `post-${p.id}`,
      group: done ? "completed" : p.intentType === "activity" && future(p.startsAt) ? "upcoming" : "active",
      title: titleOf(p),
      when: p.startsAt,
      role: isNeed ? "Your need" : p.intentType === "offer" ? "Your offer" : "You're hosting",
      href: isNeed && !done ? undefined : needsAttendance ? undefined : p.roomId ? `/rooms/${p.roomId}` : `/feed/${p.id}`,
      media: p.mediaUrls[0],
      action: isNeed && !done ? "resolve" : needsAttendance ? "attendance" : undefined,
      postId: p.id,
      replies: p.commentCount,
      side: isNeed ? "need" : p.intentType === "offer" ? "offer" : undefined,
      kind: p.intentType,
    });
  }
  for (const p of settled(joined, []).filter((p) => p.intentType === "activity" || p.intentType === "ask")) {
    rows.push({
      id: `joined-${p.id}`,
      group: finished(p.status) ? "completed" : future(p.startsAt) ? "upcoming" : "active",
      title: titleOf(p),
      when: p.startsAt,
      role: p.intentType === "ask" ? "You're helping" : "You're going",
      href: p.roomId ? `/rooms/${p.roomId}` : `/feed/${p.id}`,
      media: p.mediaUrls[0],
      replies: p.commentCount,
      side: p.intentType === "ask" ? "offer" : undefined,
      kind: p.intentType,
    });
  }
  return rows;
}
