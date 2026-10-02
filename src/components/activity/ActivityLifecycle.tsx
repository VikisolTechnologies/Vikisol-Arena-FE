"use client";

import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button } from "@/components/bplus/Button";
import { TextArea, TextField } from "@/components/bplus/TextField";
import {
  checkInSelf,
  confirmAttendance,
  getEmergencyContacts,
  giveActivityFeedback,
  joinWaitlist,
  leaveWaitlist,
  setActivityQuestions,
  type EmergencyContact,
  type JoinActivityInput,
} from "@/lib/api/activities";

/** M6 area 3b. Everything here is additive to ActivityScreen.tsx/CheckInSheet.tsx: the
 * activity-specific capabilities that had no UI at all before — host questions, answering them
 * to join, the waitlist, self check-in, post-activity confirm, and private feedback. Real mode
 * only (the functions in lib/api/activities.ts no-op/return empty in mock mode, same pattern as
 * the rest of M6). */

/** Shown before `joinActivity()` when the activity has questions. One required text field per
 * question; the emergency-contact fields only appear when the activity needs one (treks). */
export function AnswerQuestionsSheet({
  open,
  onClose,
  questions,
  needsEmergencyContact,
  busy,
  error,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  questions: { id: string; text: string; required: boolean }[];
  needsEmergencyContact: boolean;
  busy: boolean;
  error: string;
  onSubmit: (input: JoinActivityInput) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  useEffect(() => {
    if (!open) return;
    // A fresh form each time the sheet opens, same pattern as other reset-on-open sheets here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnswers({});
    setNote("");
    setContactName("");
    setContactPhone("");
  }, [open]);
  const missing = questions.some((q) => q.required && !answers[q.id]?.trim());
  const missingContact = needsEmergencyContact && (!contactName.trim() || !contactPhone.trim());
  return (
    <BottomSheet open={open} onClose={onClose} title="Before you join">
      <h2 className="mt-3 pr-12 font-display-serif text-[24px] font-medium">The host wants to know</h2>
      <div className="mt-4 space-y-4">
        {questions.map((q) => (
          <TextField
            key={q.id}
            id={`answer-${q.id}`}
            labelStyle="stacked"
            label={q.required ? `${q.text} *` : q.text}
            value={answers[q.id] ?? ""}
            onChange={(v) => setAnswers((cur) => ({ ...cur, [q.id]: v }))}
          />
        ))}
        {needsEmergencyContact && (
          <>
            <TextField id="emergency-name" labelStyle="stacked" label="Emergency contact name *" value={contactName} onChange={setContactName} />
            <TextField id="emergency-phone" labelStyle="stacked" label="Emergency contact phone *" type="tel" value={contactPhone} onChange={setContactPhone} />
          </>
        )}
        <TextArea label="A note for the host (optional)" value={note} onChange={setNote} maxLength={280} />
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      <Button
        className="mt-5"
        loading={busy}
        disabled={missing || missingContact}
        onClick={() =>
          onSubmit({
            answers: questions.map((q) => ({ questionId: q.id, answer: answers[q.id]?.trim() || undefined })),
            note: note.trim() || undefined,
            emergencyContact: needsEmergencyContact ? { name: contactName.trim(), phone: contactPhone.trim() } : undefined,
          })
        }
      >
        Send request
      </Button>
    </BottomSheet>
  );
}

/** Full — offers the waitlist instead of a dead end. */
export function WaitlistBlock({ postId, position, onChanged }: { postId: string; position?: number; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const join = async () => {
    setBusy(true);
    setError("");
    try {
      await joinWaitlist(postId, {});
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join the waitlist.");
    } finally {
      setBusy(false);
    }
  };
  const leave = async () => {
    setBusy(true);
    setError("");
    try {
      await leaveWaitlist(postId);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't leave the waitlist.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      {position != null ? (
        <>
          <p className="rounded-tile bg-paper-muted p-4 text-center text-[15px]">You&apos;re #{position} on the waitlist. We&apos;ll move you in if a spot opens.</p>
          <Button variant="outline" className="border-paper-ink/55 text-paper-ink" onClick={leave} loading={busy}>Leave waitlist</Button>
        </>
      ) : (
        <Button onClick={join} loading={busy}>This activity is full — join the waitlist</Button>
      )}
      {error && <p role="alert" className="text-center text-[13px] text-danger-on-paper">{error}</p>}
    </div>
  );
}

/** The joiner's own "I'm here", day-of (ApprovedView). */
export function SelfCheckInButton({ postId, checkedInAt, onChecked }: { postId: string; checkedInAt?: string; onChecked: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (checkedInAt) return <p className="mt-2 text-center text-[14px] text-success-on-paper">You checked in.</p>;
  return (
    <div className="mt-2">
      <Button
        variant="outline"
        className="border-paper-ink/55 text-paper-ink"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await checkInSelf(postId);
            onChecked();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Check-in didn't go through.");
          } finally {
            setBusy(false);
          }
        }}
      >
        I&apos;m here
      </Button>
      {error && <p role="alert" className="mt-2 text-center text-[13px] text-danger-on-paper">{error}</p>}
    </div>
  );
}

/** Post-activity: "Did you attend?" + (if the host marked a no-show that's wrong) a dispute
 * reason, then "Would you join again?" feedback — Flow §3 A13/A14 in one compact prompt. */
export function ConfirmAndFeedback({
  postId,
  hostId,
  markedNoShow,
  alreadyConfirmed,
  onDone,
}: {
  postId: string;
  hostId: string;
  markedNoShow: boolean;
  alreadyConfirmed: boolean;
  onDone: () => void;
}) {
  const [stage, setStage] = useState<"confirm" | "dispute" | "feedback" | "done">(alreadyConfirmed ? "feedback" : "confirm");
  const [dispute, setDispute] = useState("");
  const [joinAgain, setJoinAgain] = useState<boolean | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (stage === "done") return <p className="mt-2 text-center text-[14px] text-paper-ink-muted">Thanks for letting us know.</p>;

  if (stage === "confirm") {
    return (
      <div className="mt-4 space-y-2">
        <p className="text-center text-[15px] font-semibold">Did you attend?</p>
        {error && <p role="alert" className="text-center text-[13px] text-danger-on-paper">{error}</p>}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            loading={busy}
            onClick={async () => {
              if (markedNoShow) return setStage("dispute");
              setBusy(true);
              setError("");
              try {
                await confirmAttendance(postId, true);
                setStage("feedback");
              } catch (err) {
                setError(err instanceof Error ? err.message : "That didn't save.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Yes, I was there
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-paper-ink/55 text-paper-ink"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await confirmAttendance(postId, false);
                setStage("done");
              } catch (err) {
                setError(err instanceof Error ? err.message : "That didn't save.");
              } finally {
                setBusy(false);
              }
            }}
          >
            No
          </Button>
        </div>
      </div>
    );
  }

  if (stage === "dispute") {
    return (
      <div className="mt-4 space-y-2">
        <p className="text-[14px] text-paper-ink-muted">The host marked you absent. Tell them what happened — this opens a dispute they can accept.</p>
        <TextArea label="What happened" value={dispute} onChange={setDispute} maxLength={500} />
        {error && <p role="alert" className="text-[13px] text-danger-on-paper">{error}</p>}
        <Button
          loading={busy}
          disabled={!dispute.trim()}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await confirmAttendance(postId, true, dispute.trim());
              setStage("feedback");
            } catch (err) {
              setError(err instanceof Error ? err.message : "That didn't save.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Send dispute
        </Button>
      </div>
    );
  }

  // feedback
  return (
    <div className="mt-4 space-y-3">
      <p className="text-center text-[15px] font-semibold">Would you join again?</p>
      {error && <p role="alert" className="text-center text-[13px] text-danger-on-paper">{error}</p>}
      <div className="flex gap-2">
        <Button variant={joinAgain === true ? "primary" : "outline"} className={joinAgain === true ? "flex-1" : "flex-1 border-paper-ink/55 text-paper-ink"} onClick={() => setJoinAgain(true)}>Yes</Button>
        <Button variant={joinAgain === false ? "primary" : "outline"} className={joinAgain === false ? "flex-1" : "flex-1 border-paper-ink/55 text-paper-ink"} onClick={() => setJoinAgain(false)}>No</Button>
      </div>
      {joinAgain !== null && (
        <>
          <TextArea label="A private note (optional — only the host sees it)" value={note} onChange={setNote} maxLength={500} />
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await giveActivityFeedback(postId, { toUserId: hostId, joinAgain, note: note.trim() || undefined });
                setStage("done");
                onDone();
              } catch (err) {
                setError(err instanceof Error ? err.message : "That didn't save.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Send feedback
          </Button>
        </>
      )}
    </div>
  );
}

/** Host-only, in HostPanel. Up to 3 questions, same limit as the intake's "who" step. */
export function HostQuestionsEditor({ postId, initial }: { postId: string; initial: { id: string; text: string; required: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState(initial.map((q) => q.text));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <div className="mt-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-[14px] font-semibold text-primary-on-paper underline underline-offset-4">
        {questions.filter((q) => q.trim()).length > 0 ? "Edit joiner questions" : "Add questions for joiners"}
      </button>
      {open && (
        <div className="mt-3 space-y-2.5 rounded-tile bg-paper-muted p-3.5">
          {[0, 1, 2].map((i) => (
            <TextField
              key={i}
              id={`host-question-${i}`}
              labelStyle="stacked"
              label={`Question ${i + 1} (optional)`}
              value={questions[i] ?? ""}
              onChange={(v) => setQuestions((cur) => { const next = [...cur]; next[i] = v; return next; })}
              maxLength={200}
            />
          ))}
          {error && <p role="alert" className="text-[13px] text-danger-on-paper">{error}</p>}
          <Button
            loading={busy}
            success={saved}
            onClick={async () => {
              setBusy(true);
              setError("");
              setSaved(false);
              try {
                await setActivityQuestions(postId, questions.filter((q) => q.trim()).map((text) => ({ text: text.trim(), required: true })));
                setSaved(true);
              } catch (err) {
                setError(err instanceof Error ? err.message : "That didn't save.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Save questions
          </Button>
        </div>
      )}
    </div>
  );
}

/** Host-only, treks (ActivityDetails.needsEmergencyContact). */
export function EmergencyContactsBlock({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<EmergencyContact[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open || contacts) return;
    getEmergencyContacts(postId)
      .then(setContacts)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Emergency contacts didn't load."));
  }, [open, postId, contacts]);
  return (
    <div className="mt-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-[14px] font-semibold text-primary-on-paper underline underline-offset-4">
        Emergency contacts
      </button>
      {open && (
        <ul className="mt-2 space-y-2 rounded-tile bg-paper-muted p-3.5">
          {error && <li role="alert" className="text-[13px] text-danger-on-paper">{error}</li>}
          {!contacts && !error && <li className="text-[13px] text-paper-ink-muted">Loading…</li>}
          {contacts?.length === 0 && <li className="text-[13px] text-paper-ink-muted">No approved joiners yet.</li>}
          {contacts?.map((c) => (
            <li key={c.userId} className="text-[14px]">
              <span className="font-semibold">{c.name}</span> — {c.contactName}, {c.contactPhone}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
