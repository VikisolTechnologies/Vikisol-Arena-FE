"use client";

import { Video, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Where a real WebRTC/Daily.co/Zoom/Teams embed goes once Arena has one — today this is a
 * static placeholder showing the meeting link and a decorative "video preview" area. The
 * `Interview.meetingLink` field this reads is a plain string today for exactly that reason:
 * swapping in a live call only means changing what this one component renders, not the data
 * contract or anything else that touches an Interview record.
 */
export function MeetingEmbed({ link, compact }: { link: string; compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-black">
      {!compact && (
        <div className="flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_50%_40%,#1a1a1f,#09090b)]">
          <div className="text-center">
            <Video className="mx-auto mb-2 size-8 text-white/30" />
            <p className="text-xs text-white/40">Video connects here once you join</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-secondary px-4 py-2.5">
        <p className="truncate text-xs text-muted-foreground">{link}</p>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Copy meeting link"
          onClick={() => navigator.clipboard?.writeText(link)}
        >
          <Copy className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
