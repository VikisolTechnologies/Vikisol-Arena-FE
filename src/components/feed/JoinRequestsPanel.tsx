"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getJoinRequests, decideJoin, recordJoinOutcome } from "@/lib/api/posts";
import type { PostJoinRequest } from "@/lib/types";

export function JoinRequestsPanel({ postId, onDecided, recordOutcome = false }: { postId: string; onDecided?: () => void; recordOutcome?: boolean }) {
  const [requests, setRequests] = useState<PostJoinRequest[] | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);

  const load = () => { getJoinRequests(postId).then(setRequests); };
  useEffect(load, [postId]);

  const mark = async (joinId: string, outcome: "attended" | "no_show") => {
    setDeciding(joinId);
    try {
      await recordJoinOutcome(postId, joinId, outcome);
      load();
      onDecided?.();
    } finally {
      setDeciding(null);
    }
  };

  const decide = async (joinId: string, approve: boolean) => {
    setDeciding(joinId);
    try {
      await decideJoin(postId, joinId, approve);
      load();
      onDecided?.();
    } finally {
      setDeciding(null);
    }
  };

  if (!requests) return null;
  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status === "approved" || r.status === "declined" || r.status === "withdrawn");

  return (
    <div className="space-y-3">
      {pending.length === 0 && decided.length === 0 && (
        <EmptyState title="No join requests yet" className="py-8" />
      )}
      {pending.map((r) => (
        <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-secondary px-3.5 py-2.5">
          <span className="text-lg">{r.userEmoji}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.userName}</span>
          <Button variant="outline" size="icon-sm" disabled={deciding === r.id} onClick={() => decide(r.id, false)} aria-label="Decline">
            <X className="size-3.5" />
          </Button>
          <Button variant="default" size="icon-sm" disabled={deciding === r.id} onClick={() => decide(r.id, true)} aria-label="Approve">
            <Check className="size-3.5" />
          </Button>
        </div>
      ))}
      {decided.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {decided.map((r) => (
            <div key={r.id} className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
              <span>{r.userEmoji}</span> <span className="truncate">{r.userName}</span>
              <span className={r.status === "approved" ? "text-emerald-400" : "text-muted-foreground"}>
                · {r.outcome === "attended" ? "showed up" : r.outcome === "no_show" ? "no-show" : r.status === "approved" ? "approved" : r.status === "withdrawn" ? "left" : "declined"}
              </span>
              {recordOutcome && r.status === "approved" && (
                <span className="ml-auto flex gap-2">
                  <button type="button" disabled={deciding === r.id} className="font-semibold text-foreground" onClick={() => mark(r.id, "attended")}>Present</button>
                  <button type="button" disabled={deciding === r.id} onClick={() => mark(r.id, "no_show")}>No-show</button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
