"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { getJoinRequests, recordJoinOutcome } from "@/lib/api/posts";
import type { PostJoinRequest } from "@/lib/types";

/** Flow §3 A12 — the host marks who came (real `recordJoinOutcome`). Private to host and person. */
export function CheckInSheet({ postId, onClose, specimen }: { postId: string | null; onClose: () => void; specimen?: PostJoinRequest[] }) {
  const [joins, setJoins] = useState<PostJoinRequest[] | null>(specimen ?? null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!postId || specimen) return;
    let cancelled = false;
    getJoinRequests(postId)
      .then((j) => !cancelled && setJoins(j))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "Attendance didn't load."));
    return () => {
      cancelled = true;
    };
  }, [postId, specimen]);
  const approved = (joins ?? []).filter((j) => j.status === "approved");
  return (
    <BottomSheet open={!!postId} onClose={onClose} title="Check in">
      <h2 className="mt-3 pr-12 font-display-serif text-[26px] font-medium">Who showed up?</h2>
      <p className="mt-2 text-[14px] text-paper-ink-muted">Attendance stays private between you and each person.</p>
      {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      <ul className="mt-4 space-y-2.5">
        {!joins && !error && <li className="text-[14px] text-paper-ink-muted">Loading…</li>}
        {joins && approved.length === 0 && <li className="text-[14px] text-paper-ink-muted">Nobody joined this one.</li>}
        {approved.map((j) => (
          <li key={j.id} className="rounded-tile bg-paper-muted p-3">
            <p className="text-[15px] font-semibold">{j.userName}</p>
            {j.outcome ? (
              <p className="text-[13px] text-paper-ink-muted">{j.outcome === "attended" ? "Attended" : "Didn't show"}</p>
            ) : (
              <div className="mt-2 flex gap-2">
                {(["attended", "no_show"] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    className={cn("min-h-11 rounded-full border px-4 text-[14px] font-semibold", "border-paper-ink/55")}
                    onClick={() =>
                      postId &&
                      recordJoinOutcome(postId, j.id, o)
                        .then(() => setJoins((cur) => (cur ?? []).map((x) => (x.id === j.id ? { ...x, outcome: o } : x))))
                        .catch((err: unknown) => setError(err instanceof Error ? err.message : "That didn't save."))
                    }
                  >
                    {o === "attended" ? "Attended" : "Didn't show"}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
