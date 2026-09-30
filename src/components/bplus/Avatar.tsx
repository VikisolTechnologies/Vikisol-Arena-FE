import { cn } from "@/lib/utils";
import { isRealMode } from "@/lib/api/mode";
import { previewPhotoForName } from "@/lib/mock/people";

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** A person's own photo, or their initials on a warm disc. In preview (mock) mode only, the
 *  fictional preview neighbours show their credited fixture photo (public/fixtures/CREDITS.md). */
export function Avatar({ src, name, className, eager }: { src?: string | null; name: string; className?: string; eager?: boolean }) {
  const photo = src || (isRealMode() ? undefined : previewPhotoForName(name));
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element -- user photo / local data URL / fixture
    return <img src={photo} alt="" loading={eager ? "eager" : "lazy"} decoding="async" className={cn("size-12 rounded-full bg-paper-muted object-cover", className)} />;
  }
  return (
    <span aria-hidden className={cn("grid size-12 place-items-center rounded-full bg-[color-mix(in_oklch,var(--primary)_24%,var(--paper))] font-display-serif text-[18px] text-paper-ink", className)}>
      {initials(name)}
    </span>
  );
}

/** Up to three overlapping faces + a count (board: "+12 going", "3 offers"). */
export function AvatarStack({ names, total, label, ring = "ring-surface", className }: { names: string[]; total: number; label: string; ring?: string; className?: string }) {
  const shown = names.slice(0, 3);
  const rest = Math.max(0, total - shown.length);
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {shown.length > 0 && (
        <span className="flex -space-x-2.5" aria-hidden>
          {shown.map((n) => <Avatar key={n} name={n} className={cn("size-8 text-[11px] ring-2", ring)} />)}
        </span>
      )}
      <span>{rest > 0 && shown.length > 0 ? `+${rest} ${label}` : `${total} ${label}`}</span>
    </span>
  );
}
