"use client";

import { Avatar, AvatarImage, AvatarFallback, AvatarBadge } from "@/components/ui/avatar";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ARENA-VISUAL-RICHNESS.md R2/§5 — "every author row has a real face... deterministic
 * champagne/ivory initial avatar with black monogram — never a grey silhouette" for anyone
 * without one, "verified users get a small gold tick badge bottom-right" (§6).
 *
 * No real photo-upload pipeline exists yet (that's Step 4's media pipeline / Step 9's profile
 * work) — `seed` drives a deterministic placeholder photo from pravatar.cc (same seed string
 * always returns the same face) so cards read as image-rich *today* rather than waiting for
 * that pipeline, exactly as R2 asks ("ship real images now... not after"). This is a visual
 * placeholder for a feature that doesn't exist yet, the same tier as this project's existing
 * keyless-map/local-disk-storage placeholders — never presented as a real uploaded photo.
 */
export function PersonAvatar({
  seed,
  name,
  size = "default",
  verified = false,
  photoUrl,
  className,
}: {
  seed: string;
  name: string;
  size?: "sm" | "default" | "lg" | "xl";
  verified?: boolean;
  /** Real photo URL, once one exists (e.g. an uploaded profile photo) — takes priority over the
   *  deterministic placeholder. */
  photoUrl?: string;
  className?: string;
}) {
  const monogram = (name.trim()[0] ?? "?").toUpperCase();
  const sizePx = { sm: 24, default: 40, lg: 56, xl: 96 }[size];
  const src = photoUrl ?? `https://i.pravatar.cc/${sizePx * 2}?u=${encodeURIComponent(seed)}`;

  return (
    <Avatar
      size={size === "xl" ? "lg" : size}
      className={cn(size === "xl" && "size-24", className)}
    >
      <AvatarImage src={src} alt={name} />
      {/* Deterministic champagne/ivory monogram, black text - only shows if the image 404s. */}
      <AvatarFallback className="bg-champagne text-ink font-semibold">{monogram}</AvatarFallback>
      {verified && (
        <AvatarBadge className="bg-gold text-ink ring-2 ring-surface">
          <BadgeCheck className="size-full p-[15%]" strokeWidth={2.5} />
        </AvatarBadge>
      )}
    </Avatar>
  );
}
