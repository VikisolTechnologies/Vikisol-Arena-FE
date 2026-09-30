import { BriefcaseBusiness, CalendarDays, FilePen, Mail, Send, Share2, UserRoundCheck, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QueueIcon } from "@/lib/data/jenny";

const ICON: Record<QueueIcon, { icon: typeof Send; cls: string }> = {
  post: { icon: FilePen, cls: "bg-[#f1e2c8] text-[#7a4d00]" },
  invite: { icon: Mail, cls: "bg-[#f1e2c8] text-[#7a4d00]" },
  share: { icon: Share2, cls: "bg-[#f1e2c8] text-[#7a4d00]" },
  calendar: { icon: CalendarDays, cls: "bg-[#dcebfb] text-[#1d57b8]" },
  notify: { icon: Send, cls: "bg-[#d9f0e2] text-[#1f6e3e]" },
  project: { icon: UsersRound, cls: "bg-[#e7e2dc] text-[#4a3f38]" },
  join: { icon: UserRoundCheck, cls: "bg-[#e7e2dc] text-[#4a3f38]" },
  job: { icon: BriefcaseBusiness, cls: "bg-[#e7e2dc] text-[#4a3f38]" },
};

/** Board's rounded-square tiles on Work's Jenny rows. */
export function QueueTile({ icon, className }: { icon: QueueIcon; className?: string }) {
  const { icon: Glyph, cls } = ICON[icon];
  return (
    <span aria-hidden className={cn("grid size-12 shrink-0 place-items-center rounded-xl", cls, className)}>
      <Glyph className="size-6" strokeWidth={1.75} />
    </span>
  );
}

