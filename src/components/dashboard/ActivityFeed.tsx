"use client";

import { useEffect, useState } from "react";
import { Search, CheckCircle2, Radar, CalendarCheck2, CalendarClock, MessageCircle, ChevronDown, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { agentRealtime } from "@/lib/realtime";
import type { AgentActivityEvent, ActivityEventType } from "@/lib/types";

const ICONS: Record<ActivityEventType, typeof Search> = {
  scanned: Search,
  applied: CheckCircle2,
  match_found: Radar,
  interview_proposed: CalendarClock,
  interview_confirmed: CalendarCheck2,
  message: MessageCircle,
};

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function ActivityFeed({ initial }: { initial: AgentActivityEvent[] }) {
  const [events, setEvents] = useState(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [undone, setUndone] = useState<Set<string>>(new Set());

  useEffect(() => {
    return agentRealtime.subscribe((event) => setEvents((prev) => [event, ...prev].slice(0, 40)));
  }, []);

  return (
    <div className="space-y-2.5">
      {events.map((ev) => {
        const Icon = ICONS[ev.type];
        const isExpanded = expanded === ev.id;
        const isUndone = undone.has(ev.id);
        return (
          <div key={ev.id} className="rounded-2xl border border-border bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setExpanded(isExpanded ? null : ev.id)}
              className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-primary-soft">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-sm font-medium", isUndone && "text-muted-foreground line-through")}>
                    {ev.title}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(ev.timestamp)}</span>
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{ev.description}</span>
              </span>
              {(ev.rationale || ev.undoable) && (
                <ChevronDown className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
              )}
            </button>
            {isExpanded && (ev.rationale || ev.undoable) && (
              <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                {ev.rationale && <p className="text-xs text-muted-foreground">{ev.rationale}</p>}
                {ev.undoable && !isUndone && (
                  <Button
                    variant="ghost-glass"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => setUndone((prev) => new Set(prev).add(ev.id))}
                  >
                    <Undo2 className="size-3.5" /> Undo
                  </Button>
                )}
                {isUndone && <Badge variant="secondary">Undone</Badge>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
