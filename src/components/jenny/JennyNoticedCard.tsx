"use client";

import Link from "next/link";
import { m } from "motion/react";
import { ChevronRight, Sparkles } from "lucide-react";
import { rise } from "@/lib/motion";
import { ButtonLink } from "@/components/bplus/Button";
import { PreviewPill } from "@/components/bplus/Primitives";
import { QueueTile } from "@/components/jenny/QueueTile";
import { useJennyQueue } from "@/components/jenny/useJenny";
import { guessType } from "@/lib/activities/taxonomy";
import { distanceKm, type FeedItem } from "@/lib/data/feed";
import { opportunities, shortWhen, type Me } from "@/lib/data/jenny";

/** VNext AI-layer board #1 — "Jenny noticed" at the top of the Feed: up to two things nearby that
 *  touch your interests, plus the first thing waiting for your approval. */
export function JennyNoticedCard({ items, me }: { items: FeedItem[]; me: Me }) {
  const queue = useJennyQueue();
  if (!queue) return null;
  const found = opportunities(items, me);
  const pending = queue.filter((q) => q.group === "approval");
  const first = pending[0];
  if (found.length === 0 && !first) return null;
  const summary = [found.length ? `${found.length} ${found.length === 1 ? "opportunity" : "opportunities"} near you` : "", pending.length ? `${pending.length} pending ${pending.length === 1 ? "action" : "actions"}` : ""].filter(Boolean);

  return (
    <m.section variants={rise} custom={0} initial="hidden" animate="shown" data-surface="paper" aria-label="Jenny noticed" className="rounded-[var(--radius-card)] bg-paper p-4 text-paper-ink">
      <Link href="/agent" className="-m-1 flex min-h-11 items-center gap-2.5 rounded-xl p-1 outline-none focus-visible:outline-2 focus-visible:outline-primary">
        <Sparkles className="size-6 text-primary-on-paper" strokeWidth={2} fill="currentColor" aria-hidden />
        <span className="flex-1 text-[19px] font-semibold">Jenny noticed</span>
        <PreviewPill />
        <ChevronRight className="size-5 text-paper-ink-muted" strokeWidth={1.75} aria-hidden />
      </Link>
      <p className="mt-1 text-[16px] leading-snug">
        {summary[0]}
        {summary[1] && (
          <>
            <br />+ {summary[1]}
          </>
        )}
      </p>
      <ul className="mt-3 space-y-1">
        {found.map((i) => {
          const Icon = guessType(i).subtype.icon;
          const km = distanceKm(me.origin, { lat: i.approxLat, lng: i.approxLng });
          return (
            <li key={i.id}>
              <Link href={`/agent/match/${i.id}`} className="flex min-h-14 items-center gap-3 rounded-xl py-1 outline-none focus-visible:outline-2 focus-visible:outline-primary">
                <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#5cc486,#1f6e3e)] text-white">
                  <Icon className="size-5" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold">{i.title ?? i.body.slice(0, 60)}</span>
                  <span className="block truncate text-[14px] text-paper-ink-muted">{[shortWhen(i), km != null ? `${Math.round(km * 10) / 10} km` : null].filter(Boolean).join(" · ")}</span>
                </span>
              </Link>
            </li>
          );
        })}
        {first && (
          <li className="flex min-h-14 items-center gap-3 py-1">
            <QueueTile icon={first.icon} className="size-11 rounded-full" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[16px] font-semibold">{first.icon === "post" ? "Review your draft post" : first.title}</span>
              <span className="block truncate text-[14px] text-paper-ink-muted">{first.flag}</span>
            </span>
          </li>
        )}
      </ul>
      {first && (
        <ButtonLink href={first.href ?? "/work?tab=approval"} className="mt-3 h-12">Review</ButtonLink>
      )}
    </m.section>
  );
}
