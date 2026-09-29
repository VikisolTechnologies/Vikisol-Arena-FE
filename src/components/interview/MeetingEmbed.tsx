"use client";

import { useState } from "react";
import { Check, Copy, Video } from "lucide-react";

/**
 * The meeting link for an interview: open it, or copy it. `Interview.meetingLink` stays a plain
 * string, so swapping in a live embed later only changes this component. `compact` is kept for
 * callers; both render the same B+ row.
 */
export function MeetingEmbed({ link }: { link: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* the link is visible to copy by hand */
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-foreground/6 p-2 pl-3">
      <Video className="size-4 shrink-0 text-faint" aria-hidden />
      <p className="min-w-0 flex-1 truncate text-[14px] text-foreground/85">{link}</p>
      <button type="button" onClick={copy} aria-label={copied ? "Link copied" : "Copy meeting link"} className="grid size-11 place-items-center rounded-full hover:bg-foreground/8">
        {copied ? <Check className="size-4 text-success-on-dark" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      </button>
      <a href={link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-[15px] font-semibold text-paper-ink hover:bg-primary-pressed">Join call</a>
    </div>
  );
}
