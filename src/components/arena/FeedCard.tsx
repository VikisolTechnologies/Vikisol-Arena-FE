"use client";

import Link from "next/link";
import { useState } from "react";
import { Briefcase, CalendarDays, Gift, HandHelping, Heart, MapPin, Megaphone, MessageCircle, Share2, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/bplus/Avatar";
import { DemoBadge } from "@/components/bplus/Primitives";
import { Cover } from "@/components/covers/Cover";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { reactToPost, unreactToPost } from "@/lib/api/posts";
import { getSession } from "@/lib/session";
import { formatKm, goingLabel, hrefFor, isDemo, whenLabel, type FeedItem } from "@/lib/data/feed";

/** The mockup's coloured type label. Colour is never the only signal: the word is always shown. */
const KIND: Record<string, { label: string; icon: typeof Sparkles; cls: string }> = {
  activity: { label: "Activity", icon: CalendarDays, cls: "bg-primary-on-paper text-white" },
  job: { label: "Job", icon: Briefcase, cls: "bg-info-on-paper text-white" },
  ask: { label: "Need", icon: HandHelping, cls: "bg-[color-mix(in_oklch,var(--slate)_62%,black)] text-white" },
  offer: { label: "Offer", icon: Gift, cls: "bg-success-on-paper text-white" },
  project: { label: "Project", icon: Users, cls: "bg-paper-ink text-paper" },
  freelance: { label: "Freelance", icon: Briefcase, cls: "bg-paper-ink text-paper" },
  company: { label: "Company", icon: Megaphone, cls: "bg-paper-ink text-paper" },
};

function ago(iso: string, now = Date.now()) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(s)) return "";
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86_400) return `${Math.round(s / 3600)}h`;
  if (s < 7 * 86_400) return `${Math.round(s / 86_400)}d`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const titleOf = (item: FeedItem) => item.title?.trim() || item.body.trim().slice(0, 80);
const POSTS = new Set(["activity", "ask", "offer", "update", "company", "collab"]);

/** One feed post: who, what kind, photo, title, where and when, and Like · Comment · Share. */
export function FeedCard({ item, km, priority }: { item: FeedItem; km: number | null; priority?: boolean }) {
  const href = hrefFor(item);
  const author = item.authorCompanyName ?? item.authorName ?? "Arena member";
  const kind = KIND[item.itemType];
  const KindIcon = kind?.icon;
  const title = titleOf(item);
  const body = item.title?.trim() && item.body.trim() !== item.title.trim() ? item.body.trim() : "";
  const when = whenLabel(item.startsAt ?? undefined);
  const going = goingLabel(item);
  const canReact = POSTS.has(item.itemType);
  const showPhoto = item.mediaUrls.length > 0 || item.itemType === "activity";

  const [reacted, setReacted] = useState(Boolean(item.myReacted));
  const [likes, setLikes] = useState(item.reactionCount ?? 0);
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState(false);
  const [shared, setShared] = useState("");

  const like = async () => {
    if (busy) return;
    if (!getSession()) return setPrompt(true);
    setBusy(true);
    const next = !reacted;
    setReacted(next);
    setLikes((c) => c + (next ? 1 : -1));
    try {
      await (next ? reactToPost(item.id) : unreactToPost(item.id));
    } catch {
      setReacted(!next);
      setLikes((c) => c + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const url = new URL(href, window.location.origin).toString();
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared("Link copied");
        window.setTimeout(() => setShared(""), 2500);
      }
    } catch {
      /* the person closed the share sheet */
    }
  };

  const chip = kind && KindIcon && (
    <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] font-semibold", kind.cls)}>
      <KindIcon className="size-4" strokeWidth={2} aria-hidden />
      {kind.label}
    </span>
  );
  const action = "inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[14px] font-medium text-paper-ink-muted outline-none hover:bg-paper-ink/5 hover:text-paper-ink focus-visible:outline-2 focus-visible:outline-primary";

  return (
    <article className="overflow-hidden rounded-[20px] bg-paper text-paper-ink shadow-[0_1px_2px_rgba(30,23,20,0.08)]">
      <div className="flex items-center gap-3 px-4 pt-4">
        <Avatar name={author} className="size-11 text-[15px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{author}</p>
          <p className="truncate text-[13px] text-paper-ink-muted">{[ago(item.createdAt), km != null ? formatKm(km).replace(" away", "") : null, item.locationText].filter(Boolean).join(" · ")}</p>
        </div>
        {isDemo(item) && <DemoBadge />}
        {!showPhoto && chip}
      </div>

      {/* Phone: photo above the text. Desktop: text left, photo right (founder mockup). */}
      <div className={cn(showPhoto && "lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start")}>
      {showPhoto && (
        <Link href={href} tabIndex={-1} aria-hidden className="relative mx-4 mt-3 block aspect-[16/9] overflow-hidden rounded-2xl lg:order-2 lg:ml-0 lg:aspect-[16/10]">
          <Cover source={{ id: item.id, kind: item.itemType, media: item.mediaUrls[0], tags: item.tags, title: item.title, body: item.body, startsAt: item.startsAt, company: item.authorCompanyName ?? item.authorName }} className="absolute inset-0" priority={priority} />
          <span className="absolute left-3 top-3">{chip}</span>
        </Link>
      )}

      <div className="min-w-0 px-4 pt-3">
        <h3 className="text-[17px] font-semibold leading-snug">
          <Link href={href} className="outline-none hover:underline focus-visible:outline-2 focus-visible:outline-primary">
            {title}
          </Link>
        </h3>
        {body && <p className="arena-clamp-3 mt-1 whitespace-pre-line text-[15px] leading-relaxed text-paper-ink-muted">{body}</p>}
        {(item.locationText || when) && (
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-paper-ink">
            {item.locationText && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 text-paper-ink-muted" strokeWidth={1.75} aria-hidden />
                {item.locationText}
              </span>
            )}
            {when && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4 text-paper-ink-muted" strokeWidth={1.75} aria-hidden />
                {when}
              </span>
            )}
          </p>
        )}
        {going && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[14px] text-paper-ink-muted">
            <Users className="size-4" strokeWidth={1.75} aria-hidden />
            {going}
          </p>
        )}
      </div>

      </div>

      <div className="mt-3 flex items-center gap-1 border-t border-paper-ink/10 px-2 py-1">
        {canReact && (
          <button type="button" onClick={like} aria-pressed={reacted} className={cn(action, reacted && "text-primary-on-paper")}>
            <Heart className={cn("size-5", reacted && "fill-current")} strokeWidth={1.75} aria-hidden />
            Like{likes > 0 ? ` ${likes}` : ""}
          </button>
        )}
        <Link href={canReact ? `${href}#comments` : href} className={action}>
          <MessageCircle className="size-5" strokeWidth={1.75} aria-hidden />
          {canReact ? `Comment${item.commentCount ? ` ${item.commentCount}` : ""}` : "View"}
        </Link>
        <button type="button" onClick={share} className={action}>
          <Share2 className="size-5" strokeWidth={1.75} aria-hidden />
          <span aria-live="polite">{shared || "Share"}</span>
        </button>
      </div>
      <SignInPrompt open={prompt} onOpenChange={setPrompt} action="like posts" />
    </article>
  );
}
