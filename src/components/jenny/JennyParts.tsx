"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { m } from "motion/react";
import { BriefcaseBusiness, CalendarDays, FilePen, Mail, Mic, Send, Share2, Sparkles, UserRoundCheck, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { press, spring } from "@/lib/motion";
import { JennyOrb } from "@/components/jenny/JennyOrb";
import { PreviewPill } from "@/components/bplus/Primitives";
import { JENNY_PREVIEW, type QueueIcon } from "@/lib/data/jenny";
import { understand, type DraftKind } from "@/lib/jenny/understand";
import { applyPrefill, prefillFor, type Prefill } from "@/lib/jenny/prefill";

/** Orb + one bold line + one quiet line — "Drafted by Jenny / Here's a draft based on your request." */
export function JennyByline({ title, detail, className }: { title: string; detail?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <JennyOrb size={40} online={false} still />
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[16px] font-semibold">
          {title} <PreviewPill />
        </p>
        {detail && <p className="text-[14px] text-faint">{detail}</p>}
      </div>
    </div>
  );
}

const ICON: Record<QueueIcon, { icon: typeof Sparkles; cls: string }> = {
  post: { icon: FilePen, cls: "bg-[#f1e2c8] text-[#7a4d00]" },
  invite: { icon: Mail, cls: "bg-[#f1e2c8] text-[#7a4d00]" },
  share: { icon: Share2, cls: "bg-[#f1e2c8] text-[#7a4d00]" },
  calendar: { icon: CalendarDays, cls: "bg-[#dcebfb] text-[#1d57b8]" },
  notify: { icon: Send, cls: "bg-[#d9f0e2] text-[#1f6e3e]" },
  project: { icon: UsersRound, cls: "bg-[#e7e2dc] text-[#4a3f38]" },
  join: { icon: UserRoundCheck, cls: "bg-[#e7e2dc] text-[#4a3f38]" },
  job: { icon: BriefcaseBusiness, cls: "bg-[#e7e2dc] text-[#4a3f38]" },
};

/** Board's rounded-square tiles on Work's Jenny rows. */
export function QueueTile({ icon, className }: { icon: QueueIcon; className?: string }) {
  const { icon: Glyph, cls } = ICON[icon];
  return (
    <span aria-hidden className={cn("grid size-12 shrink-0 place-items-center rounded-xl", cls, className)}>
      <Glyph className="size-6" strokeWidth={1.75} />
    </span>
  );
}

type Recognition = { lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; onerror: () => void; start: () => void; stop: () => void };

/** Dictation through the browser's own speech recognition, where it exists. Hidden otherwise —
 *  never a mic that does nothing. */
export function MicButton({ onText, className }: { onText: (text: string) => void; className?: string }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection after hydration
    setSupported(!!(w.SpeechRecognition ?? w.webkitSpeechRecognition));
  }, []);
  if (!supported) return null;
  const toggle = () => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const R = (w.SpeechRecognition ?? w.webkitSpeechRecognition)!;
    const r = new R();
    r.lang = "en-IN";
    r.interimResults = false;
    r.onresult = (e) => onText(Array.from(e.results).map((x) => x[0].transcript).join(" "));
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  };
  return (
    <m.button type="button" whileTap={press} transition={spring.snappy} onClick={toggle} aria-label={listening ? "Stop dictation" : "Dictate"} aria-pressed={listening} className={cn("grid size-11 shrink-0 place-items-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-primary", listening ? "bg-primary text-white" : "text-current", className)}>
      <Mic className="size-5" strokeWidth={1.9} aria-hidden />
    </m.button>
  );
}

/**
 * "Or just tell Jenny" (flow §2/§10) above an intake: one sentence → the intake's draft, with the
 * fields she filled glowing "Jenny filled — check". Preview only until the v2 interpret contract
 * exists (FE-API-GAPS #42). Nothing publishes from here.
 */
export function TellJenny({ kind, example, onPrefill, className }: { kind: DraftKind; example: string; onPrefill: (p: Prefill) => void; className?: string }) {
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  if (!JENNY_PREVIEW) return null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const u = understand(text);
    if (!u) return setNote("Say a little more — what, when and where.");
    const p = prefillFor(u, kind);
    applyPrefill(p);
    onPrefill(p);
  };
  return (
    <form onSubmit={submit} data-surface="paper" className={cn("rounded-tile bg-white p-3.5 ring-1 ring-paper-ink/10", className)} aria-label="Tell Jenny">
      <p className="flex items-center gap-2 text-[15px] font-semibold">
        <JennyOrb size={22} online={false} still /> Or just tell Jenny <PreviewPill />
      </p>
      <div className="mt-2 flex items-center gap-1 rounded-full border border-field-line bg-paper pl-4 focus-within:border-primary-on-paper">
        <label className="sr-only" htmlFor={`tell-${kind}`}>Describe it in one sentence</label>
        <input id={`tell-${kind}`} value={text} onChange={(e) => (setText(e.target.value), setNote(""))} placeholder={example} className="h-12 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-paper-ink-muted" />
        <MicButton onText={(t) => setText((cur) => (cur ? `${cur} ${t}` : t))} />
        <button type="submit" disabled={!text.trim()} className="mr-1 inline-flex h-10 items-center rounded-full bg-primary-on-paper px-4 text-[14px] font-semibold text-white disabled:opacity-40">Draft</button>
      </div>
      <p className={cn("mt-2 text-[13px]", note ? "text-danger-on-paper" : "text-paper-ink-muted")} role={note ? "alert" : undefined}>
        {note || "Jenny fills what you said; you check every answer before anything is posted."}
      </p>
    </form>
  );
}
