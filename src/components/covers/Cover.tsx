"use client";

import { cn } from "@/lib/utils";
import { ProceduralCover } from "@/components/covers/ProceduralCover";
import { guessType } from "@/lib/activities/taxonomy";
import { timeOfDayFor } from "@/lib/covers/procedural";

/** Kinds that get a generated cover when there's no photo (flow §5). Needs keep a neutral card
 *  (their own photos matter); jobs use company colour cards elsewhere. */
const COVERED = new Set(["activity", "project", "community"]);

export interface CoverSource {
  id: string;
  kind?: string;
  media?: string;
  tags?: string[];
  title?: string;
  body?: string;
  startsAt?: string;
}

/** Everywhere an image goes: the person's photo, else a unique procedural cover, else a warm
 *  gradient. The box is sized by the caller (`className`). */
export function Cover({ source, className }: { source: CoverSource; className?: string }) {
  const { id, kind, media } = source;
  if (media) {
    return (
      <span className={cn("relative block overflow-hidden", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- user media from any host */}
        <img src={media} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      </span>
    );
  }
  if (kind && COVERED.has(kind)) {
    const { subtype } = guessType(source);
    return (
      <span className={cn("relative block overflow-hidden", className)}>
        <ProceduralCover seed={id} subtypeId={subtype.id} time={timeOfDayFor(source.startsAt)} className="absolute inset-0" />
      </span>
    );
  }
  return <span aria-hidden className={cn("relative block overflow-hidden bg-[radial-gradient(circle_at_30%_20%,var(--warning),var(--primary-pressed)_55%,var(--surface))]", className)} />;
}
