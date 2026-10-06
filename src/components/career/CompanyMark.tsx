import { cn } from "@/lib/utils";
import { monogram } from "@/lib/data/career";

const TONES = ["bg-success-on-paper", "bg-info-on-paper", "bg-primary-on-paper", "bg-paper-ink"] as const;

/** Company colour card with a monogram (correction #3 / flow §5): never a real logo, never an
 *  AI photo of a fake office. The colour is stable per company name. */
export function CompanyMark({ name, className }: { name: string; className?: string }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-xl font-display-serif font-medium text-white", TONES[h % TONES.length], className ?? "size-12 text-[18px]")}>
      {monogram(name)}
    </span>
  );
}
