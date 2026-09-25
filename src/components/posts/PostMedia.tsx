"use client";

import { isVideoUrl, mediaDisplayUrl, videoPosterUrl } from "@/lib/api/media";
import { cn } from "@/lib/utils";

/**
 * A post's photos/videos. One item shows full width; two to four sit in a two-column grid.
 * Videos use native controls and never autoplay with sound. Keep this OUTSIDE any <Link> - a
 * tap on a video's controls must play it, not navigate to the post.
 */
export function PostMedia({ urls, className, width = 1080 }: { urls: string[]; className?: string; width?: number }) {
  if (urls.length === 0) return null;
  const single = urls.length === 1;
  return (
    <div className={cn("grid gap-1.5 overflow-hidden rounded-xl", single ? "grid-cols-1" : "grid-cols-2", className)}>
      {urls.map((url, i) => {
        // Three items: the first spans both columns so the grid has no hole.
        const span = urls.length === 3 && i === 0 ? "col-span-2" : "";
        const frame = single ? "max-h-[480px]" : "aspect-square";
        return isVideoUrl(url) ? (
          <video
            key={url}
            src={mediaDisplayUrl(url, width)}
            poster={videoPosterUrl(url, width)}
            controls
            playsInline
            preload="metadata"
            className={cn("w-full bg-black object-contain", single ? "max-h-[480px]" : "h-full", !single && frame, span)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary already resizes/formats (mediaDisplayUrl)
          <img
            key={url}
            src={mediaDisplayUrl(url, single ? width : Math.round(width / 2))}
            alt=""
            loading="lazy"
            className={cn("w-full bg-secondary object-cover", frame, span)}
          />
        );
      })}
    </div>
  );
}
