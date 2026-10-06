"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { recordJoinOutcome } from "@/lib/api/posts";
import { acceptDispute, getAttendance, hostCheckIn, type AttendanceRow } from "@/lib/api/activities";
import type { PostJoinRequest } from "@/lib/types";

/** Flow §3 A12 — the host marks who came, via the activity-specific attendance sheet
 * (`PUT /activities/{id}/attendance/{joinId}/check-in`, `GET /activities/{id}/attendance`,
 * `PUT .../accept-dispute`), so disputes show up here too. `specimen` is compare-page-only
 * (`/dev/screen/[id]`): a fixed join-request list rendered statically with no network call, for
 * visual review. */
export function CheckInSheet({ postId, onClose, specimen }: { postId: string | null; onClose: () => void; specimen?: PostJoinRequest[] }) {
  const [rows, setRows] = useState<AttendanceRow[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!postId || specimen) return;
    let cancelled = false;
    getAttendance(postId)
      .then((r) => !cancelled && setRows(r))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "Attendance didn't load."));
    return () => {
      cancelled = true;
    };
  }, [postId, specimen]);

  const approved = (specimen ?? []).filter((j) => j.status === "approved");

  return (
    <BottomSheet open={!!postId} onClose={onClose} title="Check in">
      <h2 className="mt-3 pr-12 font-display-serif text-[26px] font-medium">Who showed up?</h2>
      <p className="mt-2 text-[14px] text-paper-ink-muted">Attendance stays private between you and each person.</p>
      {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      {!specimen ? (
        <ul className="mt-4 space-y-2.5">
          {!rows && !error && <li className="text-[14px] text-paper-ink-muted">Loading…</li>}
          {rows?.length === 0 && <li className="text-[14px] text-paper-ink-muted">Nobody joined this one.</li>}
          {rows?.map((r) => (
            <li key={r.joinId} className="rounded-tile bg-paper-muted p-3">
              <p className="text-[15px] font-semibold">{r.name}</p>
              {r.checkedInAt && <p className="text-[13px] text-success-on-paper">Checked in</p>}
              {r.outcome ? (
                <p className="text-[13px] text-paper-ink-muted">{r.outcome === "attended" ? "Attended" : "Marked absent"}</p>
              ) : (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="min-h-11 rounded-full border border-paper-ink/55 px-4 text-[14px] font-semibold"
                    onClick={() =>
                      postId &&
                      recordJoinOutcome(postId, r.joinId, "no_show")
                        .then(() => getAttendance(postId).then(setRows))
                        .catch((err: unknown) => setError(err instanceof Error ? err.message : "That didn't save."))
                    }
                  >
                    Didn&apos;t show
                  </button>
                  <button
                    type="button"
                    className={cn("min-h-11 rounded-full bg-primary px-4 text-[14px] font-bold text-paper-ink")}
                    onClick={() =>
                      postId &&
                      hostCheckIn(postId, r.joinId)
                        .then(setRows)
                        .catch((err: unknown) => setError(err instanceof Error ? err.message : "That didn't save."))
                    }
                  >
                    Mark present
                  </button>
                </div>
              )}
              {r.disputeStatus === "open" && (
                <div className="mt-2 rounded-xl bg-warning/20 p-2.5">
                  <p className="text-[13px] font-semibold">Disputed: &ldquo;{r.disputeReason}&rdquo;</p>
                  <button
                    type="button"
                    className={cn("mt-1.5 min-h-10 rounded-full bg-primary px-3.5 text-[13px] font-bold text-paper-ink")}
                    onClick={() =>
                      postId &&
                      acceptDispute(postId, r.joinId)
                        .then(setRows)
                        .catch((err: unknown) => setError(err instanceof Error ? err.message : "That didn't save."))
                    }
                  >
                    Accept — mark present
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {approved.length === 0 && <li className="text-[14px] text-paper-ink-muted">Nobody joined this one.</li>}
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
                        recordJoinOutcome(postId, j.id, o).catch((err: unknown) => setError(err instanceof Error ? err.message : "That didn't save."))
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
      )}
    </BottomSheet>
  );
}
