"use client";

import { useState } from "react";
import { CalendarCheck2, Users, StickyNote } from "lucide-react";
import { MeetingEmbed } from "./MeetingEmbed";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { saveInterviewNotes, submitInterviewFeedback } from "@/lib/api/interviews";
import { cn } from "@/lib/utils";
import { formatFriendlyDateTime } from "@/lib/format";
import type { Interview, InterviewRecommendation } from "@/lib/types";

type Participant = { name: string; avatarEmoji: string };

const RECOMMENDATIONS: InterviewRecommendation[] = ["advance", "hold", "reject"];

/**
 * Shared by both the candidate (/interviews/[applicationId]) and enterprise
 * (/enterprise/interviews/[applicationId]) routes — only what varies by role (whether feedback
 * can be given, who "me"/"counterpart" are) is passed in as props.
 */
export function InterviewRoom({
  interview,
  me,
  counterpart,
  canGiveFeedback,
  onInterviewUpdate,
}: {
  interview: Interview;
  me: Participant;
  counterpart: Participant;
  canGiveFeedback: boolean;
  onInterviewUpdate: (updated: Interview) => void;
}) {
  const [joined, setJoined] = useState(false);
  const [notes, setNotes] = useState(interview.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [givingFeedback, setGivingFeedback] = useState(false);
  const [rating, setRating] = useState(4);
  const [strengths, setStrengths] = useState("");
  const [concerns, setConcerns] = useState("");
  const [recommendation, setRecommendation] = useState<InterviewRecommendation>("advance");
  const [submitting, setSubmitting] = useState(false);

  const confirmedSlot = interview.proposedSlots.find((s) => s.id === interview.confirmedSlotId);
  const formattedSlot = confirmedSlot ? formatFriendlyDateTime(confirmedSlot.start) : null;

  const handleNotesBlur = async () => {
    if (notes === (interview.notes ?? "")) return;
    setSavingNotes(true);
    await saveInterviewNotes(interview.id, notes);
    setSavingNotes(false);
  };

  const handleSubmitFeedback = async () => {
    setSubmitting(true);
    const updated = await submitInterviewFeedback(interview.id, { rating, strengths, concerns, recommendation });
    setSubmitting(false);
    if (updated) onInterviewUpdate(updated);
  };

  if (interview.status === "cancelled") {
    return (
      <div className="rounded-[24px] border border-dashed border-border-strong px-6 py-10 text-center text-sm text-muted-foreground">
        This interview was cancelled.
      </div>
    );
  }

  if (interview.status === "proposed") {
    return (
      <div className="rounded-[24px] border border-dashed border-border-strong px-6 py-10 text-center text-sm text-muted-foreground">
        Waiting on a confirmed time — nothing to join yet.
      </div>
    );
  }

  if (interview.status === "completed") {
    return (
      <div className="rounded-[24px] border border-border bg-card p-6">
        <p className="mb-1 flex items-center gap-1.5 font-display text-sm font-bold">
          <CalendarCheck2 className="size-4 text-primary-soft" /> Interview completed
        </p>
        {formattedSlot && <p className="mb-4 text-xs text-muted-foreground">{formattedSlot}</p>}
        {canGiveFeedback && interview.feedback ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  interview.feedback.recommendation === "advance"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : interview.feedback.recommendation === "reject"
                      ? "bg-red-500/15 text-red-400"
                      : "bg-amber-500/15 text-amber-400",
                )}
              >
                {interview.feedback.recommendation === "advance"
                  ? "Recommended to advance"
                  : interview.feedback.recommendation === "reject"
                    ? "Recommended to reject"
                    : "On hold"}
              </Badge>
              <span className="text-xs text-muted-foreground">{interview.feedback.rating}/5</span>
            </div>
            {interview.feedback.strengths && (
              <p className="text-sm">
                <span className="text-muted-foreground">Strengths: </span>
                {interview.feedback.strengths}
              </p>
            )}
            {interview.feedback.concerns && (
              <p className="text-sm">
                <span className="text-muted-foreground">Concerns: </span>
                {interview.feedback.concerns}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Feedback is being reviewed — check your Applications board for the next step.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {formattedSlot && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm">
          <CalendarCheck2 className="size-4 text-primary-soft" />
          {formattedSlot} · {confirmedSlot?.durationMinutes} min
        </div>
      )}

      {!joined ? (
        <div className="rounded-[24px] border border-border bg-card p-6 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-xl">{me.avatarEmoji}</span>
              <p className="text-xs text-muted-foreground">You</p>
            </div>
            <div className="h-px w-8 bg-border" />
            <div className="flex flex-col items-center gap-1">
              <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-xl">{counterpart.avatarEmoji}</span>
              <p className="text-xs text-muted-foreground">{counterpart.name}</p>
            </div>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">Ready to join? Camera and mic access is simulated in this preview.</p>
          {interview.meetingLink && (
            <div className="mx-auto mb-4 max-w-sm">
              <MeetingEmbed link={interview.meetingLink} compact />
            </div>
          )}
          <Button variant="default" size="cta" onClick={() => setJoined(true)}>
            Join interview
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-3">
            {interview.meetingLink && <MeetingEmbed link={interview.meetingLink} />}
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <StickyNote className="size-3.5" /> Notes
              </p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Anything worth remembering from this conversation…"
                className="min-h-24 border-border bg-secondary"
              />
              {savingNotes && <p className="mt-1 text-[11px] text-muted-foreground">Saving…</p>}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Users className="size-3.5" /> Participants
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span>{me.avatarEmoji}</span> {me.name}
                  <Badge variant="secondary" className="ml-auto bg-emerald-500/15 text-[10px] text-emerald-400">
                    You
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>{counterpart.avatarEmoji}</span> {counterpart.name}
                </div>
              </div>
            </div>

            {canGiveFeedback && !givingFeedback && (
              <Button variant="default" size="sm" className="w-full" onClick={() => setGivingFeedback(true)}>
                End &amp; give feedback
              </Button>
            )}
          </div>
        </div>
      )}

      {givingFeedback && (
        <div className="rounded-[24px] border border-primary/25 bg-primary/[0.05] p-5">
          <p className="mb-3 font-display text-sm font-bold">Interview feedback</p>
          <div className="mb-4">
            <p className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              Rating <span className="text-foreground">{rating}/5</span>
            </p>
            <Slider value={rating} onValueChange={(v) => setRating(v as number)} min={1} max={5} step={1} />
          </div>
          <Textarea
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            placeholder="Strengths"
            className="mb-2.5 border-border bg-card"
          />
          <Textarea
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
            placeholder="Concerns"
            className="mb-3 border-border bg-card"
          />
          <div className="mb-4 flex gap-2">
            {RECOMMENDATIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRecommendation(r)}
                className={cn(
                  "flex-1 rounded-full border px-3 py-2 text-xs font-medium capitalize transition-colors",
                  recommendation === r ? "border-primary bg-primary/15 text-primary-soft" : "border-border text-muted-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <Button variant="default" size="sm" className="w-full" disabled={submitting} onClick={handleSubmitFeedback}>
            {submitting ? "Submitting…" : "Submit feedback"}
          </Button>
        </div>
      )}
    </div>
  );
}
