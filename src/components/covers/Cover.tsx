"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { mediaDisplayUrl } from "@/lib/api/media";
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
/** `priority`: the screen's largest image (LCP) — fetched eagerly at high priority. */
export function Cover({ source, className, sizes, priority }: { source: CoverSource; className?: string; sizes?: string; priority?: boolean }) {
  const { id, kind, media } = source;
  if (media) {
    // Our own files (preview photos) go through next/image so a thumbnail downloads a thumbnail;
    // the box size decides which width (review A11). User media from any host stays a plain img.
    if (media.startsWith("/")) {
      const thumb = /\bsize-(1\d|2\d|[4-9])\b/.test(className ?? "");
      return (
        <span className={cn("relative block overflow-hidden", className)}>
          <Image src={media} alt="" fill priority={priority} sizes={sizes ?? (thumb ? "96px" : "(max-width: 480px) 100vw, 480px")} className="object-cover" />
        </span>
      );
    }
    // Cloudinary uploads are delivered resized (f_auto,q_auto) with a srcset, so each phone picks
    // the width its box and screen need — a thumbnail row never downloads a full photo.
    const thumb = /\bsize-(1\d|2\d|[4-9])\b|\bw-28\b/.test(className ?? "");
    const isCloudinary = media.includes("res.cloudinary.com") && media.includes("/upload/");
    return (
      <span className={cn("relative block overflow-hidden", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- user media from any host */}
        <img
          src={mediaDisplayUrl(media, thumb ? 240 : 960)}
          srcSet={isCloudinary ? (thumb ? [120, 240] : [480, 720, 960, 1280]).map((w) => `${mediaDisplayUrl(media, w)} ${w}w`).join(", ") : undefined}
          sizes={isCloudinary ? (sizes ?? (thumb ? "112px" : "(max-width: 480px) 100vw, 480px")) : undefined}
          alt=""
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "low"}
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
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
