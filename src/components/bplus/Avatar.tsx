import { cn } from "@/lib/utils";

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** A person's own photo, or their initials on a warm disc — never a stock face. */
export function Avatar({ src, name, className }: { src?: string | null; name: string; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- user photo / local data URL
    return <img src={src} alt="" className={cn("size-12 rounded-full object-cover", className)} />;
  }
  return (
    <span aria-hidden className={cn("grid size-12 place-items-center rounded-full bg-primary/20 font-display-serif text-[18px] text-paper-ink", className)}>
      {initials(name)}
    </span>
  );
}
