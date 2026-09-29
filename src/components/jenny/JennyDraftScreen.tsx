"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, m } from "motion/react";
import { CalendarDays, CircleAlert, MapPin, UsersRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { dissolve, press, rise, spring } from "@/lib/motion";
import { Screen } from "@/components/bplus/Screen";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { Pills, StateCard } from "@/components/bplus/Primitives";
import { JennyByline, MicButton } from "@/components/jenny/JennyParts";
import { JENNY_PREVIEW } from "@/lib/data/jenny";
import { understand, type DraftKind } from "@/lib/jenny/understand";
import { KIND_LABEL, applyPrefill, firstGap, nudgeFor, nudgeLine, prefillFor } from "@/lib/jenny/prefill";
import { defaultsOf, type MoneyRange } from "@/lib/intake/types";

const KINDS: { id: DraftKind; label: string }[] = (["ask", "offer", "activity", "project"] as const).map((id) => ({ id, label: KIND_LABEL[id] }));
const EXAMPLES = ["Need two volunteers for lake cleanup Saturday at Gachibowli Lake", "Cricket this Sunday 7am at Gachibowli, 12 players", "Help moving a sofa tomorrow evening in Kondapur"];

function dayLabel(iso?: unknown) {
  if (typeof iso !== "string" || !iso) return null;
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
}
function timeLabel(hhmm?: unknown) {
  if (typeof hhmm !== "string" || !hhmm) return null;
  const [h, min] = hhmm.split(":").map(Number);
  return new Date(2000, 0, 1, h, min).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toUpperCase();
}

/**
 * VNext AI-layer board #3 — Create: Jenny drafts, you approve. One sentence becomes a draft of a
 * real Need / Offer / Activity / Project; "Edit" and "Preview & approve" continue in that kind's
 * own intake (the same form as posting by hand) with her answers marked. She never publishes.
 */
export function JennyDraftScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const [text, setText] = useState(() => params.get("q") ?? "");
  const [asked, setAsked] = useState(() => params.get("q") ?? "");
  const understood = useMemo(() => (asked ? understand(asked) : null), [asked]);
  const [kindOverride, setKindOverride] = useState<DraftKind | null>(null);
  const kind = kindOverride ?? understood?.kind ?? "activity";
  const draft = useMemo(() => (understood ? prefillFor(understood, kind) : null), [understood, kind]);

  if (!JENNY_PREVIEW) {
    return (
      <Screen>
        <div className="pt-10">
          <StateCard kind="empty" title="Jenny can't draft posts yet" detail="Post it yourself in a minute — the form asks only what neighbours need." action={<ButtonLink href="/needs/new">Post a Need</ButtonLink>} />
        </div>
      </Screen>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setKindOverride(null);
    setAsked(text.trim());
  };
  const open = (start?: string) => {
    if (!draft) return;
    applyPrefill(draft);
    const sep = draft.href.includes("?") ? "&" : "?";
    router.push(start ? `${draft.href}${sep}start=${start}` : draft.href);
  };

  const v = draft?.values ?? {};
  const nudge = draft ? nudgeLine(nudgeFor(draft)) : "";
  const size = v.size as MoneyRange | undefined;
  const people = kind === "activity" ? size?.max : (v.helpers as number | undefined);
  const peopleLabel = understood?.peopleWord === "volunteers" ? "Volunteers needed" : understood?.peopleWord === "players" ? "Players" : kind === "ask" ? "Helpers" : "Spots";
  const when = [dayLabel(v.date), timeLabel(v.start)].filter(Boolean).join(" · ");
  const flag = "inline-flex min-h-11 shrink-0 items-center gap-1.5 text-[14px] font-semibold text-primary-on-paper";

  return (
    <Screen>
      <header className="flex items-center justify-between pt-2">
        <h1 className="font-display-serif text-[32px] font-medium">Create</h1>
        <button type="button" onClick={() => router.back()} aria-label="Close" className="-mr-2 grid size-11 place-items-center rounded-full hover:bg-foreground/5">
          <X className="size-6" strokeWidth={1.75} aria-hidden />
        </button>
      </header>

      <div className="mt-3">
        <Pills label="Kind" options={KINDS} value={kind} onChange={setKindOverride} />
      </div>

      <form onSubmit={submit} className="mt-4">
        <div className="flex items-start gap-1 rounded-tile border border-field-line bg-surface p-1.5 pl-4 focus-within:border-primary">
          <label htmlFor="jenny-ask" className="sr-only">Tell Jenny what you want to make happen</label>
          <textarea
            id="jenny-ask"
            rows={2}
            maxLength={280}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Tell Jenny what you want to make happen…"
            className="field-sizing-content max-h-40 min-h-[52px] min-w-0 flex-1 resize-none bg-transparent py-2 text-[17px] leading-snug outline-none placeholder:text-faint"
          />
          <MicButton onText={(t) => setText((cur) => (cur ? `${cur} ${t}` : t))} />
        </div>
        {text.trim() !== asked && (
          <Button type="submit" variant="outline" disabled={!text.trim()} className="mt-3 h-12">Draft it</Button>
        )}
      </form>

      <AnimatePresence mode="wait" initial={false}>
        {!asked ? (
          <m.div key="examples" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={dissolve} className="mt-6">
            <p className="text-[15px] text-faint">Try one of these:</p>
            <ul className="mt-2 space-y-2">
              {EXAMPLES.map((ex) => (
                <li key={ex}>
                  <m.button type="button" whileTap={press} transition={spring.snappy} onClick={() => (setText(ex), setAsked(ex))} className="w-full rounded-tile border border-line bg-surface px-4 py-3 text-left text-[15px]">
                    &ldquo;{ex}&rdquo;
                  </m.button>
                </li>
              ))}
            </ul>
          </m.div>
        ) : !draft ? (
          <m.p key="short" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-[15px] text-faint" role="status">Say a little more — what, when and where.</m.p>
        ) : (
          <m.div key={`${asked}-${kind}`} initial="hidden" animate="shown" exit={{ opacity: 0 }} className="mt-5">
            <m.div variants={rise} custom={0}>
              <JennyByline title="Drafted by Jenny" detail="Here's a draft based on your request." />
            </m.div>

            <m.article variants={rise} custom={1} data-surface="paper" aria-label="Draft" className="mt-4 rounded-[var(--radius-card)] bg-paper p-4 text-paper-ink">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[20px] font-semibold leading-snug">{String(v.title ?? "Untitled")}</h2>
                <span className="shrink-0 rounded-lg bg-paper-muted px-2.5 py-1 text-[13px] font-semibold">Draft</span>
              </div>
              {!!(v.description || v.details || v.goal) && <p className="mt-2 text-[15px] leading-relaxed">{String(v.description ?? v.details ?? v.goal)}</p>}

              <ul className="mt-3 space-y-2" aria-label="Details">
                {(kind === "activity" || kind === "ask") && (
                  <li className="flex items-center gap-3">
                    <CalendarDays className="size-5 shrink-0" strokeWidth={1.9} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <span className="block text-[13px] text-paper-ink-muted">{kind === "ask" ? "When" : "Date"}</span>
                      <span className="block text-[15px]">{when || (kind === "ask" ? (v.urgency === "today" ? "Today" : v.urgency === "week" ? "This week" : "Flexible") : "Not set")}</span>
                    </div>
                    {kind === "activity" && !v.date && <button type="button" onClick={() => open("when")} className={flag}><CircleAlert className="size-4" aria-hidden /> Add date</button>}
                    {kind === "activity" && v.date && !v.start ? <button type="button" onClick={() => open("when")} className={flag}><CircleAlert className="size-4" aria-hidden /> Add time</button> : null}
                  </li>
                )}
                {kind === "activity" && (
                  <li className="flex items-center gap-3">
                    <UsersRound className="size-5 shrink-0" strokeWidth={1.9} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <span className="block text-[13px] text-paper-ink-muted">{peopleLabel}</span>
                      <span className="block text-[15px]">{people ?? "Not set"}</span>
                    </div>
                    <button type="button" onClick={() => open("group")} className={flag}><CircleAlert className="size-4" aria-hidden /> {people ? "Confirm capacity" : "Add capacity"}</button>
                  </li>
                )}
                {kind !== "project" && (
                  <li className="flex items-start gap-3">
                    <MapPin className="mt-1 size-5 shrink-0" strokeWidth={1.9} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <span className="block text-[13px] text-paper-ink-muted">Location</span>
                      <span className="block text-[15px]">{understood?.place ? `${understood.place} area` : String(v.area ?? "Not set")}</span>
                      <span className="block text-[13px] text-paper-ink-muted">Shows general area only</span>
                    </div>
                    {!v.area && <button type="button" onClick={() => open("where")} className={flag}><CircleAlert className="size-4" aria-hidden /> Add area</button>}
                  </li>
                )}
              </ul>
              {understood && understood.tags.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Tags">
                  {understood.tags.map((t) => <li key={t} className="rounded-full border border-paper-ink/20 px-3 py-1 text-[13px] font-medium">{t}</li>)}
                </ul>
              )}
            </m.article>

            {nudge && (
              <m.p variants={rise} custom={2} role="note" className="mt-4 flex items-start gap-2.5 rounded-tile border border-warning/60 bg-warning/12 p-3.5 text-[15px]">
                <CircleAlert className="mt-0.5 size-5 shrink-0 text-warning" strokeWidth={2} aria-hidden /> {nudge}
              </m.p>
            )}
            <m.div variants={rise} custom={3} className="mt-5 grid grid-cols-[1fr_1.7fr] gap-3">
              <Button variant="outline" onClick={() => open()}>Edit</Button>
              <Button className="px-3" onClick={() => open(firstGap(draft.schema, { ...defaultsOf(draft.schema), ...draft.values }))}>Preview &amp; approve</Button>
            </m.div>
            <p className={cn("mt-3 text-center text-[13px] text-faint")}>Nothing is posted until you check it and tap publish.</p>
          </m.div>
        )}
      </AnimatePresence>
    </Screen>
  );
}

