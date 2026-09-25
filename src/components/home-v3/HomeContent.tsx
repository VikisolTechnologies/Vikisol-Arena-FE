"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { CreateComposer } from "@/components/create-v3/CreateComposer";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { JobCard, PostCard, ProjectCard } from "./FeedCards";
import { getMyProfile } from "@/lib/api/profile";
import { getFeed } from "@/lib/api/posts";
import { getJobs } from "@/lib/api/jobs";
import { getProjects } from "@/lib/api/market";
import { getNotifications } from "@/lib/api/notifications";
import { allowGuestBrowsing } from "@/lib/auth-guard";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { CandidateProfile, Job, Post, Project } from "@/lib/types";

// One feed, every kind of content. The chips narrow it to a single kind - "All" is the default
// so a first visit shows everything with no setup.
type Filter = "all" | "activities" | "discussions" | "jobs" | "bidding";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "activities", label: "Activities" },
  { key: "discussions", label: "Discussions" },
  { key: "jobs", label: "Jobs" },
  { key: "bidding", label: "Bidding" },
];

type FeedEntry =
  | { kind: "post"; id: string; post: Post }
  | { kind: "job"; id: string; job: Job }
  | { kind: "project"; id: string; project: Project };

// Round-robin across kinds - activity, discussion, job, bidding, repeat - so the top of "All"
// always shows every kind rather than whichever one ranks highest (the post feed ranks
// soon-starting activities first, which made "All" read as an activities-only feed). Each kind
// keeps its own order; when one runs out the rest carry on.
function interleave(posts: Post[], jobs: Job[], projects: Project[]): FeedEntry[] {
  const lanes: FeedEntry[][] = [
    posts.filter((p) => p.intentType === "activity").map((post) => ({ kind: "post", id: `post-${post.id}`, post })),
    posts.filter((p) => p.intentType !== "activity").map((post) => ({ kind: "post", id: `post-${post.id}`, post })),
    jobs.map((job) => ({ kind: "job", id: `job-${job.id}`, job })),
    projects.map((project) => ({ kind: "project", id: `project-${project.id}`, project })),
  ];
  const out: FeedEntry[] = [];
  for (let i = 0; lanes.some((lane) => i < lane.length); i++) {
    for (const lane of lanes) if (i < lane.length) out.push(lane[i]);
  }
  return out;
}

/**
 * Home - opens on the feed: activities, discussions, jobs and open bidding in one scroll, with
 * chips to narrow it to one kind. Jenny sits above it as a slim entry into the existing conversation and approval flow. Each item still opens in the space
 * that owns it (activity/thread detail, job, project).
 */
export function HomeContent() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerSession, setComposerSession] = useState(0);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);
  const [reloads, setReloads] = useState(0);
  const [failedLanes, setFailedLanes] = useState<string[]>([]);

  useEffect(() => {
    if (!allowGuestBrowsing(router)) return;
    let cancelled = false;
    if (getSession()) {
      getMyProfile().then((p) => !cancelled && setProfile(p)).catch(() => {});
      getNotifications()
        .then((all) => !cancelled && setUnread(all.filter((n) => !n.read).length))
        .catch(() => {});
    }
    function laneResult(lane: string, failed: boolean) {
      if (!cancelled) setFailedLanes((previous) => failed ? [...new Set([...previous, lane])] : previous.filter((item) => item !== lane));
    }
    getFeed(0, 60)
      .then((all) => { if (!cancelled) { setPosts(all.filter((p) => p.status === "open" || p.intentType !== "activity")); laneResult("posts", false); } })
      .catch(() => { if (!cancelled) { setPosts([]); laneResult("posts", true); } });
    getJobs()
      .then((all) => { if (!cancelled) { setJobs(all.slice().sort((a, b) => a.postedDaysAgo - b.postedDaysAgo)); laneResult("jobs", false); } })
      .catch(() => { if (!cancelled) { setJobs([]); laneResult("jobs", true); } });
    getProjects()
      .then((all) => { if (!cancelled) { setProjects(all.filter((p) => p.status === "open")); laneResult("bidding", false); } })
      .catch(() => { if (!cancelled) { setProjects([]); laneResult("bidding", true); } });
    return () => {
      cancelled = true;
    };
  }, [router, reloads]);

  const entries = useMemo<FeedEntry[] | null>(() => {
    const toPosts = (list: Post[]) => list.map<FeedEntry>((post) => ({ kind: "post", id: `post-${post.id}`, post }));
    switch (filter) {
      case "activities":
        return posts && toPosts(posts.filter((p) => p.intentType === "activity"));
      case "discussions":
        return posts && toPosts(posts.filter((p) => p.intentType === "ask" || p.intentType === "update"));
      case "jobs":
        return jobs && jobs.map((job) => ({ kind: "job", id: `job-${job.id}`, job }));
      case "bidding":
        return projects && projects.map((project) => ({ kind: "project", id: `project-${project.id}`, project }));
      default:
        return posts && jobs && projects && interleave(posts, jobs, projects);
    }
  }, [filter, posts, jobs, projects]);

  function openComposer() {
    if (!getSession()) {
      setSignInPromptOpen(true);
      return;
    }
    setComposerSession((n) => n + 1);
    setComposerOpen(true);
  }

  const relevantFailures = failedLanes.filter((lane) => filter === "all" || lane === filter ||
    (lane === "posts" && (filter === "activities" || filter === "discussions")));

  const seeAll: Partial<Record<Filter, { href: string; label: string }>> = {
    activities: { href: "/map", label: "See them on the map" },
    discussions: { href: "/discuss", label: "Open Discuss" },
    jobs: { href: "/work", label: "Open Work" },
    bidding: { href: "/work?tab=bidding", label: "Open Bidding" },
  };

  return (
    <AppShell profile={profile}>
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4">
        {/* Jenny - slim, above the feed rather than in place of it. */}
        <section aria-label="Ask Jenny" className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5">
          <div aria-hidden className="size-8 shrink-0 rounded-full bg-[radial-gradient(circle_at_32%_30%,var(--primary-soft),var(--primary)_70%)]" />
          <Link href="/agent" className="min-w-0 flex-1 py-2 text-[14px] text-foreground hover:text-primary-soft">
            Ask Jenny to help you find, plan or post
          </Link>
          <button
            type="button"
            onClick={openComposer}
            className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-[12px] font-semibold text-primary-foreground"
          >
            Post
          </button>
        </section>

        {unread > 0 && (
          <Link href="/notifications" className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-secondary">
            <Bell className="size-4 shrink-0 text-primary-soft" />
            <span className="flex-1 text-[13px] text-foreground">
              {unread} update{unread === 1 ? "" : "s"} waiting for you
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        )}

        <div role="tablist" aria-label="Show" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors",
                filter === f.key ? "bg-foreground text-background" : "border border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {relevantFailures.length > 0 && (
          <div role="alert" className="rounded-xl border border-border bg-card p-4 text-sm">
            <p>Some of your feed couldn&apos;t load. Available items are shown below.</p>
            <button type="button" className="mt-2 min-h-11 font-semibold text-primary-soft" onClick={() => setReloads((n) => n + 1)}>Try again</button>
          </div>
        )}

        {entries === null ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : entries.length === 0 && relevantFailures.length > 0 ? null : entries.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
            <p className="mb-2 text-[15px] font-medium text-foreground">Nothing here yet</p>
            <p className="mb-4 text-[13px] text-muted-foreground">Be the first to post something.</p>
            <button type="button" onClick={openComposer} className="rounded-full bg-primary px-5 py-2 text-[13px] font-semibold text-primary-foreground">
              Post something
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((e) =>
              e.kind === "post" ? (
                <PostCard key={e.id} post={e.post} />
              ) : e.kind === "job" ? (
                <JobCard key={e.id} job={e.job} />
              ) : (
                <ProjectCard key={e.id} project={e.project} />
              ),
            )}
            {seeAll[filter] && (
              <Link href={seeAll[filter]!.href} className="self-center py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground">
                {seeAll[filter]!.label} →
              </Link>
            )}
          </div>
        )}
      </div>

      <CreateComposer
        key={composerSession}
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onPublished={() => setReloads((n) => n + 1)}
      />
      <SignInPrompt open={signInPromptOpen} onOpenChange={setSignInPromptOpen} action="post" />
    </AppShell>
  );
}
