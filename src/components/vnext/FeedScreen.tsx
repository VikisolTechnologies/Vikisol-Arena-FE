"use client";

import { useState, useSyncExternalStore } from "react";
import { getFeedItems } from "@/lib/api/feed";
import { getSession } from "@/lib/session";
import { Card, hrefFor, labelFor, useLoad } from "./shared";
import { Status, VNextShell } from "./Shell";
import Link from "next/link";
import { readEntryDraft, subscribeEntryDraft, type EntryIntent } from "@/lib/data/onboarding";

export function JennyBrief() {
  return null;
}

export function FeedScreen() {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useLoad(() => getFeedItems("for-you", 0, 20), [attempt]);
  const name = useSyncExternalStore(subscribeEntryDraft, () => getSession()?.name ?? "", () => "");
  const intents = useSyncExternalStore(subscribeEntryDraft, () => readEntryDraft().intents.join(","), () => "");
  const picked = intents.split(",").filter(Boolean) as EntryIntent[];
  const area = useSyncExternalStore(subscribeEntryDraft, () => readEntryDraft().area.trim(), () => "");
  const located = useSyncExternalStore(subscribeEntryDraft, () => readEntryDraft().useCurrentLocation, () => false);
  return (
    <VNextShell>
      <JennyBrief />
      <p className="font-editorial text-[1.7rem] font-medium leading-tight">{name ? `Good to see you, ${name}` : "Good to see you"}</p>
      <p className="mt-1 text-sm text-muted-foreground">{priorityLine(picked)}</p>
      {error && (
        <div className="mt-4">
          <Status kind="error" title="The feed did not load" detail={error} />
          <button type="button" className="mt-3 min-h-11 rounded-full border border-border px-4 text-sm" onClick={() => setAttempt((n) => n + 1)}>Try again</button>
        </div>
      )}
      {!error && !data && <div className="mt-4"><Status kind="loading" title="Loading" /></div>}
      {data && data.length === 0 && (
        <div className="mt-4 motion-safe:animate-[entry-in_220ms_ease]">
          <HonestEmptyState title="Nothing here yet" detail={emptyDetail(picked)} showArea={!area && !located} />
        </div>
      )}
      {data && data.length > 0 && (
        <div className="mt-4 grid gap-3 motion-safe:animate-[entry-in_300ms_ease]">
          {data.map((item) => (
            <div key={item.id}>
              {item.demoContent && <p className="mb-1 text-[10px] font-semibold tracking-[0.14em] text-primary-soft">DEMO</p>}
              <Card href={hrefFor(item)} title={item.title || item.body.slice(0, 80)} meta={labelFor(item)} />
            </div>
          ))}
        </div>
      )}
    </VNextShell>
  );
}

function priorityLine(intents: EntryIntent[]) {
  if (intents.length === 0) return "A balanced look at what people have actually posted.";
  if (intents.includes("job")) return "Work and opportunities, only when they are real.";
  if (intents.some((id) => id === "ask" || id === "offer")) return "Needs and offers from people nearby.";
  if (intents.some((id) => id === "activities" || id === "meet")) return "Activities and people, when someone has posted them.";
  return "What matches the reasons you gave for joining.";
}

function emptyDetail(intents: EntryIntent[]) {
  if (intents.includes("job")) return "No verified opportunities yet. Career details stay private until you turn them on.";
  if (intents.some((id) => id === "ask" || id === "offer")) return "No needs or offers have been posted nearby.";
  if (intents.some((id) => id === "activities" || id === "meet")) return "No activities or people have been posted nearby.";
  return "When someone nearby posts a need, an activity, or a piece of work, it will show up here.";
}

// Interim until P2 rebuilds the Feed in B+ (moved here from the deleted M1A entry chrome).
function HonestEmptyState({ title, detail, showArea }: { title: string; detail: string; showArea: boolean }) {
  return (
    <div className="rounded-3xl border border-border px-5 py-8 text-center">
      <p className="font-editorial text-[1.45rem] leading-tight">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-muted-foreground">{detail}</p>
      <div className="mt-5 grid gap-2">
        <Link href="/discover" className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">Discover nearby</Link>
        <button type="button" className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold" onClick={() => window.dispatchEvent(new Event("arena-open-create"))}>
          Create the first activity or need
        </button>
        {showArea && (
          <Link href="/onboarding?step=2" className="inline-flex min-h-11 items-center justify-center text-sm text-muted-foreground underline-offset-4 hover:underline">Add your area</Link>
        )}
      </div>
    </div>
  );
}
