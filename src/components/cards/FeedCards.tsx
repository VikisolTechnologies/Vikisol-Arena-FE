"use client";

import Link from "next/link";
import { m } from "motion/react";
import { CalendarClock, ChevronRight, MapPin, MessageCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { press, spring } from "@/lib/motion";
import { ButtonLink } from "@/components/bplus/Button";
import { DemoBadge, KindChip } from "@/components/bplus/Primitives";
import { formatKm, goingLabel, hrefFor, isDemo, spotsLeft, whenLabel, type FeedItem } from "@/lib/data/feed";

/** A photo that reserves its box before it loads (no layout shift), or a warm gradient when
 *  the item has none — never a stock image standing in for a real one. */
function Photo({ src, className, layoutId }: { src?: string; className?: string; layoutId?: string }) {
  return (
    <m.div layoutId={layoutId} className={cn("relative overflow-hidden bg-[radial-gradient(circle_at_30%_20%,var(--warning),var(--primary-pressed)_55%,var(--surface))]", className)}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- user-supplied media from any host; the box is sized by the parent
        <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      )}
    </m.div>
  );
}

function titleOf(item: FeedItem) {
  return item.title?.trim() || item.body.trim().slice(0, 80);
}

/** Board: the big "Sunrise Run at Durgam Lake" card. One primary action (Join / View). */
export function HeroActivityCard({ item, km }: { item: FeedItem; km: number | null }) {
  const when = whenLabel(item.startsAt);
  const going = goingLabel(item);
  const href = hrefFor(item);
  return (
    <article className="overflow-hidden rounded-[var(--radius-card)] bg-surface">
      <Link href={href} className="block outline-none focus-visible:outline-2 focus-visible:outline-primary" aria-label={titleOf(item)}>
        <div className="relative aspect-[4/3]">
          <Photo src={item.mediaUrls[0]} className="absolute inset-0" layoutId={`media-${item.id}`} />
          <div aria-hidden className="absolute inset-0 bg-linear-to-t from-surface via-surface/30 to-transparent" />
          <div className="absolute left-3 top-3 flex gap-2">
            {when && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 text-[13px] font-semibold text-success-on-paper">
                <CalendarClock className="size-4" strokeWidth={2} aria-hidden />
                {when}
              </span>
            )}
            {isDemo(item) && <DemoBadge />}
          </div>
          <div className="absolute inset-x-4 bottom-3">
            {km != null && (
              <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-background/70 px-2.5 py-1 text-[13px] text-foreground backdrop-blur">
                <MapPin className="size-3.5" strokeWidth={2} aria-hidden />
                {formatKm(km)}
              </span>
            )}
            <h3 className="font-display-serif text-[24px] font-medium leading-tight text-foreground">{titleOf(item)}</h3>
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4">
        {item.title && item.body && <p className="line-clamp-2 text-[15px] leading-snug text-foreground/85">{item.body}</p>}
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-1.5 text-[14px] text-faint">
            {going ? (
              <>
                <Users className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                {going}
              </>
            ) : item.locationText ? (
              <>
                <MapPin className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="truncate">{item.locationText}</span>
              </>
            ) : null}
          </p>
          <ButtonLink href={href} className="h-11 w-auto shrink-0 px-5 text-[17px]">
            {item.myJoinStatus === "approved" ? "View" : item.joinable ? "Join activity" : "View details"}
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}

/** Board: the two-up cream "Need" cards. */
export function NeedCard({ item }: { item: FeedItem }) {
  const replies = item.commentCount ?? 0;
  return (
    <m.div whileTap={press} transition={spring.snappy} className="h-full">
      <Link href={hrefFor(item)} className="flex h-full flex-col rounded-tile bg-paper p-3.5 text-paper-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <div className="flex items-center justify-between gap-2">
          <KindChip kind={item.itemType} />
          {isDemo(item) && <DemoBadge />}
        </div>
        <h3 className="mt-2 line-clamp-2 text-[16px] font-semibold leading-snug">{titleOf(item)}</h3>
        <p className="mt-1 line-clamp-1 text-[13px] text-paper-ink-muted">
          {[item.locationText, whenLabel(item.startsAt ?? undefined)].filter(Boolean).join(" · ") || "Nearby"}
        </p>
        {replies > 0 && (
          <p className="mt-auto inline-flex items-center gap-1 pt-3 text-[13px] font-semibold text-success-on-paper">
            <MessageCircle className="size-4" strokeWidth={2} aria-hidden />
            {replies} {replies === 1 ? "reply" : "replies"}
          </p>
        )}
      </Link>
    </m.div>
  );
}

/** Board: the wide cream "Offer" card with a photo on the left. Also used for other kinds. */
export function RowCard({ item }: { item: FeedItem }) {
  const meta = [item.locationText, whenLabel(item.startsAt)].filter(Boolean).join(" · ");
  const left = spotsLeft(item);
  return (
    <m.div whileTap={press} transition={spring.snappy}>
      <Link href={hrefFor(item)} className="flex items-stretch gap-3 overflow-hidden rounded-tile bg-paper p-2.5 text-paper-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <Photo src={item.mediaUrls[0]} className="w-28 shrink-0 rounded-xl" layoutId={`media-${item.id}`} />
        <div className="min-w-0 flex-1 py-1">
          <div className="flex items-center gap-2">
            <KindChip kind={item.itemType} />
            {isDemo(item) && <DemoBadge />}
          </div>
          <h3 className="mt-1 line-clamp-2 text-[16px] font-semibold leading-snug">{titleOf(item)}</h3>
          {meta && <p className="mt-0.5 line-clamp-1 text-[13px] text-paper-ink-muted">{meta}</p>}
          {left && <p className="mt-1 text-[13px] font-semibold text-success-on-paper">{left}</p>}
        </div>
        <ChevronRight className="size-5 shrink-0 self-center text-paper-ink-muted" strokeWidth={1.75} aria-hidden />
      </Link>
    </m.div>
  );
}
