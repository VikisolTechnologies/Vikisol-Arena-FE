"use client";

import Link from "next/link";
import { SectionHeader } from "@/components/bplus/Primitives";
import { Cover } from "@/components/covers/Cover";
import { whenLabel } from "@/lib/data/feed";
import type { Post } from "@/lib/types";

/** Finished and past things, with their photos (or covers). */
export function Outcomes({ outcomes, seeAll }: { outcomes: Post[]; seeAll?: boolean }) {
  return (
    <section className="mt-6" aria-label="Recent outcomes">
      <SectionHeader title="Recent outcomes" href={seeAll && outcomes.length ? "/work?tab=completed" : undefined} />
      {outcomes.length === 0 ? (
        <p className="text-[14px] text-faint">Outcomes show here once a need is resolved or an activity happens.</p>
      ) : (
        <ul className="space-y-3">
          {outcomes.map((p) => (
            <li key={p.id}>
              <Link href={`/feed/${p.id}`} className="flex items-center gap-3 rounded-tile outline-none focus-visible:outline-2 focus-visible:outline-primary">
                <Cover source={{ id: p.id, kind: p.intentType, media: p.mediaUrls[0], tags: p.tags, title: p.title, body: p.body, startsAt: p.startsAt }} className="size-14 shrink-0 rounded-xl" />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">{p.title || p.body.slice(0, 60)}</span>
                  <span className="block text-[13px] text-faint">{[p.locationText, whenLabel(p.startsAt ?? p.createdAt)].filter(Boolean).join(" · ")}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
