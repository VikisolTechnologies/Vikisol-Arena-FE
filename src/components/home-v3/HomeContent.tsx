"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Heart, MapPin, Users, Briefcase, Hammer, Clock3, Bell, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { CreateComposer } from "@/components/create-v3/CreateComposer";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { DemoContentBadge } from "./DemoContentBadge";
import { PostMedia } from "@/components/posts/PostMedia";
import { getMyProfile } from "@/lib/api/profile";
import { getFeed } from "@/lib/api/posts";
import { getJobs } from "@/lib/api/jobs";
import { getProjects } from "@/lib/api/market";
import { getNotifications } from "@/lib/api/notifications";
import { allowGuestBrowsing } from "@/lib/auth-guard";
import { getSession } from "@/lib/session";
import { formatINRRange, formatTimeAgo } from "@/lib/format";
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

const KIND_LABEL: Record<string, string> = { activity: "Activity", ask: "Question", update: "Update" };

function KindTag({ icon: Icon, label }: { icon: typeof Users; label: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon className="size-3" /> {label}
    </span>
  );
}

function PostCard({ post }: { post: Post }) {
  const isActivity = post.intentType === "activity";
  const spotsLeft = post.capacity != null ? Math.max(0, post.capacity - post.spotsFilled) : null;
  const href = `/feed/${post.id}`;
  return (
    <article className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-secondary/40">
      <Link href={href} className="block">
        <div className="mb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
          <span className="truncate font-medium text-foreground">{post.authorName}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{formatTimeAgo(post.createdAt)}</span>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            {post.demoContent && <DemoContentBadge />}
            <KindTag icon={isActivity ? Users : MessageCircle} label={KIND_LABEL[post.intentType] ?? "Post"} />
          </span>
        </div>
        {post.title && <p className="font-display text-[16px] font-semibold leading-snug text-foreground">{post.title}</p>}
        {post.body && post.body !== post.title && (
          <p className={cn("line-clamp-3 text-[14px] leading-relaxed", post.title ? "mt-1 text-muted-foreground" : "text-foreground")}>{post.body}</p>
        )}
      </Link>
      <PostMedia urls={post.mediaUrls} className="mt-3" width={720} />
      <Link href={href} className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
        {post.locationText && (
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5" /> {post.locationText}
          </span>
        )}
        {isActivity && post.startsAt && (
          <span className="flex items-center gap-1.5">
            <Clock3 className="size-3.5" />
            {new Date(post.startsAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}
          </span>
        )}
        {isActivity && spotsLeft != null && (
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5" /> {spotsLeft === 0 ? "Full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <MessageCircle className="size-3.5" /> {post.commentCount}
        </span>
        <span className="flex items-center gap-1.5">
          <Heart className="size-3.5" /> {post.reactionCount}
        </span>
        {isActivity && post.joinable && !post.mine && (
          <span className="ml-auto font-semibold text-primary-soft">{post.myJoinStatus ? "Requested" : "Join →"}</span>
        )}
      </Link>
    </article>
  );
}

function JobCard({ job }: { job: Job }) {
  return (
    <Link href={`/jobs/${job.id}`} className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-secondary">
      <div className="mb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
        <span className="truncate font-medium text-foreground">{job.company}</span>
        <span aria-hidden>·</span>
        <span className="shrink-0">{job.postedDaysAgo <= 0 ? "today" : `${job.postedDaysAgo}d ago`}</span>
        <span className="ml-auto shrink-0">
          <KindTag icon={Briefcase} label="Job" />
        </span>
      </div>
      <p className="font-display text-[16px] font-semibold leading-snug text-foreground">{job.title}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="size-3.5" /> {job.remote ? "Remote" : job.location}
        </span>
        {/* Job salaries are stored in lakhs per year (e.g. 18-26), not rupees. */}
        {job.salaryMax > 0 && <span>₹{job.salaryMin}–{job.salaryMax}L</span>}
        {job.matchPercentage > 0 && <span className="ml-auto font-semibold text-primary-soft">{job.matchPercentage}% match</span>}
      </div>
    </Link>
  );
}

function hoursUntil(iso: string) {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000));
}

function ProjectCard({ project }: { project: Project }) {
  const hoursLeft = hoursUntil(project.endsAt);
  return (
    <Link href={`/marketplace/${project.id}`} className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-secondary">
      <div className="mb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
        <span className="font-medium text-foreground">Open for bids</span>
        <span aria-hidden>·</span>
        <span className="shrink-0">{hoursLeft}h left</span>
        <span className="ml-auto shrink-0">
          <KindTag icon={Hammer} label="Bidding" />
        </span>
      </div>
      <p className="font-display text-[16px] font-semibold leading-snug text-foreground">{project.title}</p>
      {project.description && <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-muted-foreground">{project.description}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
        <span>{formatINRRange(project.budgetMin, project.budgetMax)}</span>
        <span>{project.durationWeeks} weeks</span>
        <span className="flex items-center gap-1.5">
          <Users className="size-3.5" /> {project.bids.length} bid{project.bids.length === 1 ? "" : "s"}
        </span>
        <span className="ml-auto font-semibold text-primary-soft">Bid →</span>
      </div>
    </Link>
  );
}

/**
 * Home - opens on the feed: activities, discussions, jobs and open bidding in one scroll, with
 * chips to narrow it to one kind. Jenny sits above it as a slim bar; her conversational input is
 * honestly disabled until JennySol is connected (Phase 3). Each item still opens in the space
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

  useEffect(() => {
    if (!allowGuestBrowsing(router)) return;
    let cancelled = false;
    if (getSession()) {
      getMyProfile().then((p) => !cancelled && setProfile(p)).catch(() => {});
      getNotifications()
        .then((all) => !cancelled && setUnread(all.filter((n) => !n.read).length))
        .catch(() => {});
    }
    getFeed(0, 60)
      .then((all) => !cancelled && setPosts(all.filter((p) => p.status === "open" || p.intentType !== "activity")))
      .catch(() => !cancelled && setPosts([]));
    getJobs()
      .then((all) => !cancelled && setJobs(all.slice().sort((a, b) => a.postedDaysAgo - b.postedDaysAgo)))
      .catch(() => !cancelled && setJobs([]));
    getProjects()
      .then((all) => !cancelled && setProjects(all.filter((p) => p.status === "open")))
      .catch(() => !cancelled && setProjects([]));
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
          <label htmlFor="jenny-input" className="sr-only">Ask Jenny (coming soon)</label>
          <input
            id="jenny-input"
            type="text"
            disabled
            placeholder="Ask Jenny anything — coming soon"
            className="min-w-0 flex-1 cursor-not-allowed bg-transparent text-[14px] text-muted-foreground placeholder:text-muted-foreground focus:outline-none"
          />
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

        {entries === null ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : entries.length === 0 ? (
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
