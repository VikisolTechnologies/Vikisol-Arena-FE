"use client";

import { m } from "motion/react";
import { Check, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { drawCheck, flyIn, spring } from "@/lib/motion";
import type { Post } from "@/lib/types";

/** Board "Join request sent": 3-step status timeline. Steps before `current` are done. */
export function StatusTimeline({ steps, current }: { steps: { title: string; detail: string }[]; current: number }) {
  return (
    <ol className="relative mt-6 space-y-5" aria-label="Request status">
      {steps.map((s, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={s.title} className="relative flex gap-4">
            {i < steps.length - 1 && <span aria-hidden className={cn("absolute left-[13px] top-8 h-[calc(100%-4px)] w-0.5", done ? "bg-primary" : "bg-paper-ink/20")} />}
            <m.span
              initial={false}
              animate={{ scale: done || now ? 1 : 0.8 }}
              transition={spring.snappy}
              className={cn("relative z-10 grid size-7 shrink-0 place-items-center rounded-full", done ? "bg-primary text-white" : now ? "bg-paper-ink/35" : "bg-paper-ink/20")}
              aria-hidden
            >
              {done && <Check className="size-4" strokeWidth={3} />}
            </m.span>
            <div>
              <p className="text-[16px] font-semibold">
                {s.title}
                <span className="sr-only">{done ? " — done" : now ? " — in progress" : " — next"}</span>
              </p>
              <p className="text-[14px] text-paper-ink-muted">{s.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function PaperPlane() {
  return (
    <div className="mx-auto grid size-24 place-items-center rounded-full bg-primary/15">
      <m.svg viewBox="0 0 24 24" className="size-12 text-primary" fill="currentColor" aria-hidden initial={flyIn.initial} animate={flyIn.animate} transition={flyIn.transition}>
        <path d="M21.7 2.3a1 1 0 0 0-1.05-.23l-18 7a1 1 0 0 0 .05 1.88l7.6 2.72 2.72 7.6a1 1 0 0 0 1.88.05l7-18a1 1 0 0 0-.2-1.02ZM10.6 12.1l-4.9-1.75 11.1-4.3-6.2 6.05Zm3.05 6.2-1.75-4.9 6.05-6.2-4.3 11.1Z" />
      </m.svg>
    </div>
  );
}

/** "You're in!": a check that draws itself inside a soft green disc. */
export function SuccessCheck() {
  return (
    <div className="mx-auto grid size-24 place-items-center rounded-full bg-success/15">
      <m.span initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={spring.success} className="grid size-16 place-items-center rounded-full bg-success-on-paper text-white">
        <svg viewBox="0 0 24 24" className="size-9" fill="none" aria-hidden>
          <m.path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={drawCheck} />
        </svg>
      </m.span>
    </div>
  );
}

export function SaferCommunity() {
  return (
    <div className="mt-6 flex gap-3 rounded-tile bg-paper-muted p-4">
      <ShieldCheck className="size-7 shrink-0 text-success-on-paper" strokeWidth={1.75} aria-hidden />
      <div>
        <p className="text-[16px] font-semibold">A safer community</p>
        <p className="text-[14px] text-paper-ink-muted">Hosts review requests to keep everyone safe and make sure it&apos;s a good fit for the group.</p>
      </div>
    </div>
  );
}

/** A real .ics file: works with every calendar app, no permission or backend needed. */
export function downloadIcs({ title, startsAt, endsAt, location, id }: { title: string; startsAt: string; endsAt?: string; location?: string; id: string }) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : new Date(start.getTime() + 60 * 60 * 1000);
  const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Arena//EN", "BEGIN:VEVENT",
    `UID:${id}@arena.vikisol.in`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(title)}`, location ? `LOCATION:${esc(location)}` : "", "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.slice(0, 40).replace(/[^\w ]+/g, "")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

/** "Today, 12 Oct · 6:30 AM – 7:30 AM" (board format). `end: false` drops the end time. */
export function activityWhen(post: Pick<Post, "startsAt" | "endsAt">, { end = true } = {}) {
  if (!post.startsAt) return null;
  const s = new Date(post.startsAt);
  const day = s.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const today = new Date().toDateString() === s.toDateString() ? "Today" : day;
  const t = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toUpperCase();
  return `${today}${today === "Today" ? `, ${day.split(", ").pop()}` : ""} · ${t(s)}${end && post.endsAt ? ` – ${t(new Date(post.endsAt))}` : ""}`;
}
