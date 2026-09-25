"use client";

import Link from "next/link";
import { MessageCircle, Heart, MapPin, Users, Briefcase, Hammer, Clock3, Building2 } from "lucide-react";
import { DemoContentBadge } from "./DemoContentBadge";
import { PostMedia } from "@/components/posts/PostMedia";
import { formatINRRange, formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Company, Job, Post, Project } from "@/lib/types";

// The cards Home's feed and Search both render - one per kind of content, each opening in the
// space that owns it.

const KIND_LABEL: Record<string, string> = { activity: "Activity", ask: "Question", update: "Update" };

export function KindTag({ icon: Icon, label }: { icon: typeof Users; label: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon className="size-3" /> {label}
    </span>
  );
}

export function PostCard({ post }: { post: Post }) {
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
          <span className="ml-auto font-semibold text-primary-soft">
            {post.myJoinStatus === "approved" ? "You're in" : post.myJoinStatus === "pending" ? "Requested" : post.myJoinStatus === "declined" ? "Declined" : "Join →"}
          </span>
        )}
      </Link>
    </article>
  );
}

export function JobCard({ job }: { job: Job }) {
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

export function ProjectCard({ project }: { project: Project }) {
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

export function CompanyCard({ company }: { company: Company }) {
  return (
    <Link href={`/companies/${company.id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-secondary">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-[22px]">{company.emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[16px] font-semibold text-foreground">{company.name}</span>
        <span className="mt-0.5 block text-[12px] text-muted-foreground">
          {[company.industry, company.size, `${company.openJobCount} open job${company.openJobCount === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
        </span>
      </span>
      <KindTag icon={Building2} label="Company" />
    </Link>
  );
}
