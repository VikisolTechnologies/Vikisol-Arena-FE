"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { ProceduralCover } from "@/components/covers/ProceduralCover";
import { CompanyMark } from "@/components/career/CompanyMark";
import { guessType } from "@/lib/activities/taxonomy";
import { timeOfDayFor } from "@/lib/covers/procedural";

/** Kinds that get a generated cover when there's no photo (flow §5). Needs keep a neutral card
 *  (their own photos matter); jobs get their company's colour card with a monogram. */
const COVERED = new Set(["activity", "project", "collab", "community"]);

export interface CoverSource {
  id: string;
  kind?: string;
  media?: string;
  tags?: string[];
  title?: string;
  body?: string;
  startsAt?: string;
  /** Jobs: the company name, for its colour card. */
  company?: string;
}

/** Everywhere an image goes: the person's photo, else a unique procedural cover, else a warm
 *  gradient. The box is sized by the caller (`className`). */
export function Cover({ source, className, sizes }: { source: CoverSource; className?: string; sizes?: string }) {
  const { id, kind, media } = source;
  if (media) {
    // Our own files (preview photos) go through next/image so a thumbnail downloads a thumbnail;
    // the box size decides which width (review A11). User media from any host stays a plain img.
    if (media.startsWith("/")) {
      const thumb = /\bsize-(1\d|2\d|[4-9])\b/.test(className ?? "");
      return (
        <span className={cn("relative block overflow-hidden", className)}>
          <Image src={media} alt="" fill sizes={sizes ?? (thumb ? "96px" : "(max-width: 480px) 100vw, 480px")} className="object-cover" />
        </span>
      );
    }
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
  if (kind === "job" && source.company) {
    return (
      <span aria-hidden className={cn("relative grid place-items-center overflow-hidden", className)}>
        <CompanyMark name={source.company} className="absolute inset-0 size-full rounded-none text-[28px]" />
      </span>
    );
  }
  return <span aria-hidden className={cn("relative block overflow-hidden bg-[radial-gradient(circle_at_30%_20%,var(--warning),var(--primary-pressed)_55%,var(--surface))]", className)} />;
}
