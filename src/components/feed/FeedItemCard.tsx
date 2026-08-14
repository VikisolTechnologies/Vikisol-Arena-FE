import Link from "next/link";
import { useState } from "react";
import {
  Bookmark,
  Briefcase,
  CalendarClock,
  Coins,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { ReactionButton } from "@/components/feed/ReactionButton";
import { formatFriendlyDateTime } from "@/lib/format";
import { savePost, unsavePost } from "@/lib/api/posts";
import { cn } from "@/lib/utils";
import type { FeedItem } from "@/lib/types";

// ARENA-MASTER-ARCHITECTURE.md PART 7.5 "PostCard anatomy (one component, type variants)" - the
// unified Home feed card. Distinct from feed/PostCard.tsx (kept as-is for pages that only ever
// deal with real Post objects - /feed, /identity, /people/[id] - see those files) because a
// FeedItem can be a Post, JobPosting, or Project (see DECISIONS.md's Step 3 entry); this card
// knows how to render all three from one flat shape.
const TYPE_LABEL: Record<string, string> = {
  job: "Job",
  project: "Project",
  freelance: "Freelance",
  activity: "Activity",
  ask: "Ask",
  update: "Update",
  company: "Company",
};

const TYPE_ICON: Record<string, typeof Sparkles> = {
  job: Briefcase,
  project: Coins,
  freelance: Coins,
  activity: Users,
  ask: Sparkles,
  update: CalendarClock,
  company: Briefcase,
};

// §4 safety-audit: a fresh, zero-track-record account posting an in-person meetup is the exact
// risk signal this surfaces - only relevant to joinable post types, never job/project.
const NEW_ACCOUNT_THRESHOLD_DAYS = 14;

function formatComp(min?: number, max?: number): string | null {
  if (min == null || max == null) return null;
  const fmt = (n: number) => (n >= 100000 ? `${(n / 100000).toFixed(1)}L` : `${Math.round(n / 1000)}k`);
  return `₹${fmt(min)}–${fmt(max)}`;
}

export function FeedItemCard({ item }: { item: FeedItem }) {
  const [saved, setSaved] = useState(false);
  const Icon = TYPE_ICON[item.itemType] ?? Sparkles;
  const isPostOrigin = ["activity", "ask", "update", "company"].includes(item.itemType);
  const isJob = item.itemType === "job";
  const isProjectLike = item.itemType === "project" || item.itemType === "freelance";

  const authorName = item.authorCompanyName ?? item.authorName ?? "Someone";
  const avatarSeed = item.authorCompanyId ?? item.authorUserId ?? item.id;

  const href = isJob ? `/jobs/${item.id}` : isProjectLike ? `/marketplace/${item.id}` : `/feed/${item.id}`;

  // R2 "every job/project a relevant thumbnail... every activity a place photo or map image" -
  // no real media-upload pipeline exists yet for jobs/projects (Step 4), so a deterministic
  // picsum.photos image (same item id -> same photo, every time) stands in exactly the way
  // PersonAvatar's placeholder photos do - see that component's own comment for the same
  // "ship real images now, not after" reasoning. A real uploaded post image (item.mediaUrls[0])
  // always takes priority over this when one exists.
  const thumbnailUrl = item.mediaUrls[0] ?? ((isJob || isProjectLike || item.itemType === "activity")
    ? `https://picsum.photos/seed/${encodeURIComponent(item.id)}/640/360`
    : null);

  async function toggleSave(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isPostOrigin) return;
    try {
      if (saved) await unsavePost(item.id);
      else await savePost(item.id);
      setSaved(!saved);
    } catch {
      // Non-critical UI affordance - a failed save/unsave silently no-ops rather than
      // interrupting the feed with an error toast for a low-stakes action.
    }
  }

  // Nested-interactive fix (axe: 12 instances on /home) - this card used to be a single
  // <button> wrapping ReactionButton and the Save button, which is invalid HTML (buttons can't
  // contain buttons) and unreliable for keyboard/screen-reader users. Standard "stretched link"
  // pattern instead: a real <Link> covers the card (native Tab/Enter navigation, a real href -
  // also closes the "cards aren't real links" gap PAGE-INVENTORY.md finding #5 already flagged
  // for this same component family), positioned behind the actual content so nested controls
  // (ReactionButton, Save) stay independently clickable/focusable on top of it.
  return (
    <div className="relative w-full rounded-[var(--radius-card)] border border-border bg-card p-5 shadow-[var(--shadow-card-rest)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]">
      <Link href={href} className="absolute inset-0 z-0 rounded-[var(--radius-card)]">
        <span className="sr-only">{item.title || `Open ${TYPE_LABEL[item.itemType] ?? "post"} from ${authorName}`}</span>
      </Link>
      <div className="relative z-10">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PersonAvatar seed={avatarSeed} name={authorName} size="sm" />
          <span className="text-sm font-semibold">{authorName}</span>
          {item.mine && <Badge variant="secondary" className="bg-primary/12 text-[11px] text-primary-soft">You</Badge>}
        </div>
        <div className="flex items-center gap-1.5">
          {(item.status === "cancelled" || item.status === "expired" || item.status === "full") && (
            <Badge variant="secondary" className={item.status === "full" ? "bg-white/5 text-[11px] text-muted-foreground" : "bg-red-500/10 text-[11px] text-red-400"}>
              {item.status === "cancelled" ? "Cancelled" : item.status === "expired" ? "Expired" : "Full"}
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1 bg-white/5 text-[11px] text-muted-foreground">
            <Icon className="size-3" /> {TYPE_LABEL[item.itemType] ?? item.itemType}
          </Badge>
        </div>
      </div>

      {item.title && <h3 className="mt-3 text-[15px] font-semibold leading-snug">{item.title}</h3>}
      <p className={cn("line-clamp-3 text-sm leading-relaxed text-foreground/90", item.title ? "mt-1" : "mt-3")}>
        {item.body}
      </p>

      {/* R2/§5 "images sit at radius 16 with a 1px --line inset" - the imagery layer that
          removes the "empty" feeling; see thumbnailUrl's own comment for the placeholder-photo
          reasoning until Step 4's real media pipeline exists. */}
      {thumbnailUrl && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element -- external, per-item seeded
              placeholder URL (picsum/user media) - not a static local asset next/image can
              usefully optimize, and this keeps the card free of a Next image-domain allowlist
              dependency for a URL scheme that's going away once Step 4 lands. */}
          <img src={thumbnailUrl} alt="" width={640} height={360} className="aspect-[16/9] w-full object-cover" loading="lazy" />
        </div>
      )}

      {item.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.tags.slice(0, 4).map((t) => (
            <Badge key={t} variant="secondary" className="bg-white/5 text-[11px] text-muted-foreground">#{t}</Badge>
          ))}
        </div>
      )}

      {/* Type block - PART 7.5: JOB -> company/comp/location; PROJECT/FREELANCE -> budget/deadline/bids. */}
      {isJob && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {item.locationText && <span className="flex items-center gap-1"><MapPin className="size-3" /> {item.locationText}{item.remote ? " · Remote" : ""}</span>}
          {formatComp(item.salaryMin, item.salaryMax) && <span>{formatComp(item.salaryMin, item.salaryMax)}/yr</span>}
        </div>
      )}
      {isProjectLike && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {formatComp(item.budgetMin, item.budgetMax) && <span>{formatComp(item.budgetMin, item.budgetMax)} budget</span>}
          {item.durationWeeks != null && <span>{item.durationWeeks}w</span>}
          {item.bidCount != null && <span>{item.bidCount} bid{item.bidCount === 1 ? "" : "s"}</span>}
          {item.endsAt && <span className="ml-auto">Due {formatFriendlyDateTime(item.endsAt)}</span>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {isPostOrigin && item.locationText && (
          <span className="flex items-center gap-1"><MapPin className="size-3" /> {item.locationText}</span>
        )}
        {item.joinable && (
          <span className="flex items-center gap-1">
            <Users className="size-3" /> {item.spotsFilled}{item.capacity ? `/${item.capacity}` : ""} joined
            {item.visibility === "approval" && " · approval required"}
          </span>
        )}
        <span className="ml-auto">{formatFriendlyDateTime(item.createdAt)}</span>
      </div>

      {item.joinable && !item.mine && item.authorAccountAgeDays != null && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          {item.authorAccountAgeDays < NEW_ACCOUNT_THRESHOLD_DAYS ? (
            <span className="flex items-center gap-1 text-amber-400">New account (joined {item.authorAccountAgeDays}d ago)</span>
          ) : (
            <span>On Arena {item.authorAccountAgeDays}d</span>
          )}
          {!!item.authorJoinCount && item.authorJoinCount > 0 && (
            <span className="flex items-center gap-1"><ShieldCheck className="size-3" /> {item.authorJoinCount} activities joined</span>
          )}
        </div>
      )}

      {isPostOrigin && (
        <div className="mt-3 flex items-center gap-4 border-t border-border pt-3">
          <ReactionButton postId={item.id} reacted={!!item.myReacted} count={item.reactionCount ?? 0} />
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageCircle className="size-3.5" /> {item.commentCount ? item.commentCount : ""}
          </span>
          <button
            type="button"
            onClick={toggleSave}
            className={cn(
              "relative ml-auto flex items-center gap-1 text-xs transition-colors before:absolute before:inset-[-13px] before:content-['']",
              saved ? "text-gold" : "text-muted-foreground hover:text-foreground",
            )}
            aria-label={saved ? "Unsave" : "Save"}
          >
            <Bookmark className="size-3.5" fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
      )}

      {item.myJoinStatus && (
        <p className="mt-2 text-xs font-medium text-primary-soft">
          {item.myJoinStatus === "approved" ? "You're in" : item.myJoinStatus === "pending" ? "Request pending" : "Request declined"}
        </p>
      )}
      </div>
    </div>
  );
}
