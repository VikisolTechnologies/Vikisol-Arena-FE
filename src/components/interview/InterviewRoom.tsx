"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { CalendarCheck2, CalendarPlus, CalendarX2, CheckCircle2, Clock3, StickyNote, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { errorIn, rise } from "@/lib/motion";
import { MeetingEmbed } from "./MeetingEmbed";
import { Button } from "@/components/bplus/Button";
import { downloadIcs } from "@/components/activity/ActivityParts";
import { saveInterviewNotes, submitInterviewFeedback } from "@/lib/api/interviews";
import type { Interview, InterviewRecommendation } from "@/lib/types";

type Participant = { name: string; avatarEmoji: string };
type Seen = "strong" | "some" | "none";

const SEEN: { id: Seen; label: string }[] = [
  { id: "strong", label: "Clearly shown" },
  { id: "some", label: "Partly" },
  { id: "none", label: "Not seen" },
];
const RECS: { id: InterviewRecommendation; label: string; detail: string }[] = [
  { id: "advance", label: "Move to offer", detail: "They move to Offer." },
  { id: "hold", label: "Hold", detail: "They stay in Interview." },
  { id: "reject", label: "Not selected", detail: "They move to Not selected and Arena sends its standard notice." },
];
const REC_LABEL: Record<InterviewRecommendation, string> = { advance: "Recommended: move to offer", hold: "On hold", reject: "Recommended: not selected" };

export const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/**
 * Shared by the candidate (/interviews/[applicationId]), recruiter
 * (/enterprise/interviews/[applicationId]) and hiring-manager routes. Flow §8: feedback is
 * structured **per must-have** — there's no overall score in the UI. The API still requires a
 * 1–5 `rating`, so it's derived from the must-have answers (never shown) and the per-must-have
 * answers are written into strengths / concerns (FE-API-GAPS #33).
 */
export function InterviewRoom({
  interview,
  me,
  counterpart,
  canGiveFeedback,
  onInterviewUpdate,
  mustHaves = [],
  place,
}: {
  interview: Interview;
  me: Participant;
  counterpart: Participant;
  canGiveFeedback: boolean;
  onInterviewUpdate: (updated: Interview) => void;
  mustHaves?: string[];
  place?: string;
}) {
  const [notes, setNotes] = useState(interview.notes ?? "");
  const [notesState, setNotesState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [giving, setGiving] = useState(false);
  const [seen, setSeen] = useState<Record<string, Seen>>({});
  const [strengths, setStrengths] = useState("");
  const [concerns, setConcerns] = useState("");
  const [rec, setRec] = useState<InterviewRecommendation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const slot = interview.proposedSlots.find((s) => s.id === interview.confirmedSlotId);
  const first = counterpart.name.split(" ")[0];

  const saveNotes = async () => {
    if (notes === (interview.notes ?? "")) return;
    setNotesState("saving");
    try {
      await saveInterviewNotes(interview.id, notes);
      setNotesState("saved");
    } catch {
      setNotesState("error");
    }
  };

  const submit = async () => {
    const missing = mustHaves.filter((mh) => !seen[mh]);
    if (missing.length || !rec) {
      setError(missing.length ? `Answer every must-have (${missing.length} left).` : "Choose a next step.");
      return;
    }
    setError("");
    setSubmitting(true);
    const score = mustHaves.length ? mustHaves.reduce((n, mh) => n + (seen[mh] === "strong" ? 1 : seen[mh] === "some" ? 0.5 : 0), 0) / mustHaves.length : rec === "advance" ? 0.75 : rec === "hold" ? 0.5 : 0.25;
    const line = (s: Seen) => mustHaves.filter((mh) => seen[mh] === s);
    const body = (label: string, items: string[], free: string) => [items.length ? `${label}: ${items.join(", ")}` : "", free.trim()].filter(Boolean).join("\n");
    try {
      const updated = await submitInterviewFeedback(interview.id, {
        rating: Math.max(1, Math.min(5, 1 + Math.round(score * 4))),
        strengths: body("Clearly shown", line("strong"), strengths) + (line("some").length ? `\nPartly shown: ${line("some").join(", ")}` : ""),
        concerns: body("Not seen", line("none"), concerns),
        recommendation: rec,
      });
      if (updated) onInterviewUpdate(updated);
    } catch {
      setError("Feedback didn't send. Your answers are still here — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const card = "rounded-tile bg-paper p-5 text-paper-ink";

  if (interview.status === "cancelled") {
    return <p data-surface="paper" className={cn(card, "flex items-center gap-3 text-[15px] text-faint")}><CalendarX2 className="size-5" aria-hidden /> This interview was cancelled.</p>;
  }

  if (interview.status === "proposed") {
    return (
      <div data-surface="paper" className={card}>
        <p className="flex items-center gap-2 text-[16px] font-semibold"><Clock3 className="size-5 text-warning" aria-hidden /> {canGiveFeedback ? `Waiting for ${first} to pick a time` : "Times offered — pick one from your application"}</p>
        <ul className="mt-3 space-y-1.5">
          {interview.proposedSlots.map((s) => <li key={s.id} className="rounded-xl bg-foreground/6 px-3 py-2 text-[15px]">{when(s.start)} · {s.durationMinutes} min</li>)}
        </ul>
      </div>
    );
  }

  if (interview.status === "completed") {
    const fb = interview.feedback;
    return (
      <div data-surface="paper" className={card}>
        <p className="flex items-center gap-2 text-[16px] font-semibold"><CalendarCheck2 className="size-5 text-success-on-dark" aria-hidden /> Interview completed</p>
        {slot && <p className="mt-1 text-[14px] text-faint">{when(slot.start)}</p>}
        {canGiveFeedback && fb ? (
          <div className="mt-4 space-y-2 text-[15px]">
            <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-bold", fb.recommendation === "advance" ? "bg-success/15 text-success-on-dark" : fb.recommendation === "reject" ? "bg-foreground/10 text-faint" : "bg-warning/15 text-warning")}>{REC_LABEL[fb.recommendation]}</span>
            {fb.strengths && <p className="whitespace-pre-line">{fb.strengths}</p>}
            {fb.concerns && <p className="whitespace-pre-line text-foreground/80">{fb.concerns}</p>}
          </div>
        ) : (
          <p className="mt-3 text-[15px] text-faint">{canGiveFeedback ? "No feedback recorded." : "The team is reviewing — you'll hear back on your application."}</p>
        )}
      </div>
    );
  }

  return (
    <m.div initial="hidden" animate="shown" className="space-y-4">
      <m.div variants={rise} data-surface="paper" className={card}>
        <p className="flex items-start gap-3">
          <CalendarCheck2 className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="block text-[17px] font-semibold">Interview with {first}</span>
            {slot && <span className="block text-[15px] text-foreground/85">{when(slot.start)} · {slot.durationMinutes} min</span>}
            <span className="mt-0.5 flex items-center gap-1.5 text-[14px] text-faint"><Video className="size-4" aria-hidden /> {interview.meetingLink ? "Video call" : place ?? "Details to follow"}</span>
          </span>
        </p>
        {interview.meetingLink && <div className="mt-4"><MeetingEmbed link={interview.meetingLink} compact /></div>}
        {slot && (
          <button
            type="button"
            onClick={() => downloadIcs({ id: interview.id, title: `Interview with ${counterpart.name}`, startsAt: slot.start, endsAt: new Date(Date.parse(slot.start) + slot.durationMinutes * 60_000).toISOString(), location: interview.meetingLink ?? place })}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-field-line px-4 text-[14px] font-semibold hover:bg-foreground/5"
          >
            <CalendarPlus className="size-4" aria-hidden /> Add to calendar
          </button>
        )}
        <p className="sr-only">With {me.name} and {counterpart.name}</p>
      </m.div>

      {canGiveFeedback && (
        <m.div variants={rise} custom={1} data-surface="paper" className={card}>
          <label htmlFor={`notes-${interview.id}`} className="flex items-center gap-2 text-[15px] font-semibold"><StickyNote className="size-4 text-faint" aria-hidden /> Interview notes</label>
          <textarea
            id={`notes-${interview.id}`}
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setNotesState("idle"); }}
            onBlur={saveNotes}
            rows={3}
            placeholder="What they said about the must-haves. Keep it about the work."
            className="mt-2 w-full rounded-xl border border-field-line bg-transparent p-3 text-[15px] outline-none focus-visible:border-primary"
          />
          <p className="mt-1 h-5 text-[13px] text-faint" role="status">{notesState === "saving" ? "Saving…" : notesState === "saved" ? "Saved for your team" : notesState === "error" ? "Didn't save — it'll retry when you leave the box again." : ""}</p>
          {!giving && <Button className="mt-2" onClick={() => setGiving(true)}>Give feedback</Button>}
        </m.div>
      )}

      <AnimatePresence>
        {giving && (
          <m.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} aria-label="Interview feedback" className="rounded-tile bg-paper p-5 text-paper-ink">
            <h2 className="font-display-serif text-[24px] leading-tight">Feedback on each must-have</h2>
            <p className="mt-1 text-[14px] text-paper-ink-muted">No overall score — say what you saw for each one.</p>
            {mustHaves.length === 0 && <p className="mt-3 text-[14px] text-paper-ink-muted">This job has no must-haves listed, so just note strengths and concerns.</p>}
            <ul className="mt-4 space-y-4">
              {mustHaves.map((mh) => (
                <li key={mh}>
                  <p className="text-[15px] font-semibold">{mh}</p>
                  <div role="radiogroup" aria-label={mh} className="mt-2 grid grid-cols-3 gap-1.5">
                    {SEEN.map((s) => {
                      const on = seen[mh] === s.id;
                      return (
                        <button key={s.id} type="button" role="radio" aria-checked={on} onClick={() => setSeen((x) => ({ ...x, [mh]: s.id }))} className={cn("min-h-11 rounded-full border text-[14px] font-semibold transition-colors duration-200", on ? "border-paper-ink bg-paper-ink text-paper" : "border-paper-ink/25 bg-white hover:border-paper-ink/60")}>
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
            <label className="mt-5 block text-[15px] font-semibold">Anything else that stood out <span className="font-normal text-paper-ink-muted">(optional)</span>
              <textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={2} className="mt-1.5 w-full rounded-xl border border-paper-ink/25 bg-white p-3 text-[15px] font-normal" />
            </label>
            <label className="mt-3 block text-[15px] font-semibold">Concerns <span className="font-normal text-paper-ink-muted">(optional)</span>
              <textarea value={concerns} onChange={(e) => setConcerns(e.target.value)} rows={2} className="mt-1.5 w-full rounded-xl border border-paper-ink/25 bg-white p-3 text-[15px] font-normal" />
            </label>
            <fieldset className="mt-5">
              <legend className="text-[15px] font-semibold">Next step</legend>
              <div role="radiogroup" aria-label="Next step" className="mt-2 grid gap-2 sm:grid-cols-3">
                {RECS.map((r) => {
                  const on = rec === r.id;
                  return (
                    <button key={r.id} type="button" role="radio" aria-checked={on} onClick={() => setRec(r.id)} className={cn("rounded-2xl border-2 p-3 text-left transition-colors duration-200", on ? "border-primary-on-paper bg-white" : "border-transparent bg-paper-muted")}>
                      <span className="flex items-center gap-1.5 text-[15px] font-semibold">{on && <CheckCircle2 className="size-4 text-primary-on-paper" aria-hidden />}{r.label}</span>
                      <span className="block text-[13px] text-paper-ink-muted">{r.detail}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <AnimatePresence>{error && <m.p variants={errorIn} initial="hidden" animate="shown" exit="hidden" role="alert" className="mt-3 text-[14px] font-semibold text-danger-on-paper">{error}</m.p>}</AnimatePresence>
            <Button className="mt-5" loading={submitting} onClick={submit}>Send feedback</Button>
          </m.section>
        )}
      </AnimatePresence>
    </m.div>
  );
}
