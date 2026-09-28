"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, ImagePlus, RefreshCw, Square, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { dissolve } from "@/lib/motion";
import { Button } from "@/components/bplus/Button";
import { JennyOrb } from "@/components/jenny/JennyOrb";
import { ProceduralCover, coverFile } from "@/components/covers/ProceduralCover";
import { JENNY_COVERS_ON, requestJennyCover } from "@/lib/covers/jenny";
import type { TimeOfDay } from "@/lib/covers/procedural";
import { findSubtype } from "@/lib/activities/taxonomy";

export type CoverChoice =
  | { mode: "card"; variant: number }
  | { mode: "plain"; variant: number }
  | { mode: "ai"; url: string }
  | { mode: "upload"; url: string; file: File };

const MAX_TRIES = 3;

/** Flow §5 A5 — Cover by Jenny. With AI off (default) or unavailable, the free procedural card is
 *  shown straight away and labelled for what it is. Returns the chosen cover as a file to store. */
export function CoverStep({
  seed,
  subtypeId,
  time,
  answers,
  initial,
  onBack,
  onUse,
}: {
  seed: string;
  subtypeId: string;
  time: TimeOfDay;
  answers: Record<string, string>;
  initial?: CoverChoice;
  onBack: () => void;
  onUse: (choice: CoverChoice, file: File | null) => void;
}) {
  const [choice, setChoice] = useState<CoverChoice>(initial ?? { mode: "card", variant: 0 });
  const [painting, setPainting] = useState(JENNY_COVERS_ON && !initial);
  const [aiFailed, setAiFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const svg = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sub = findSubtype(subtypeId);

  const auto = JENNY_COVERS_ON && !initial;
  const [aiTries, setAiTries] = useState(auto ? 1 : 0);
  /** Ask Jenny for a picture; any failure keeps the free card. State only changes in callbacks. */
  const fetchCover = (attempt: number) =>
    requestJennyCover({ kind: "activity", category: sub?.category.id ?? "other", subtype: subtypeId, answers, timeOfDay: time, seed: `${seed}-${attempt}` })
      .then((r) => {
        setChoice({ mode: "ai", url: r.imageUrl });
        setAiFailed(false);
      })
      .catch(() => {
        setAiFailed(true);
        setChoice((c) => (c.mode === "ai" ? { mode: "card", variant: 0 } : c));
      })
      .finally(() => setPainting(false));
  const paint = () => {
    setPainting(true);
    setAiTries((n) => n + 1);
    void fetchCover(aiTries);
  };
  // AI on: paint once on arrival (the shimmer shows until it answers or fails).
  useEffect(() => {
    if (auto) void fetchCover(0);
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tries = choice.mode === "card" ? choice.variant + 1 : 1;
  const tryAnother = () => {
    if (JENNY_COVERS_ON && !aiFailed && aiTries < MAX_TRIES) return void paint();
    setChoice((c) => ({ mode: "card", variant: c.mode === "card" ? Math.min(MAX_TRIES - 1, c.variant + 1) : 0 }));
  };
  const use = async () => {
    setBusy(true);
    setError("");
    try {
      if (choice.mode === "upload") return onUse(choice, choice.file);
      if (choice.mode === "ai") return onUse(choice, null);
      onUse(choice, svg.current ? await coverFile(svg.current) : null);
    } catch {
      // Rendering to a file failed: publish without a stored image; the card is regenerated from the id.
      onUse(choice, null);
    } finally {
      setBusy(false);
    }
  };

  const label =
    choice.mode === "ai" ? "Cover by Jenny · AI-generated" : choice.mode === "upload" ? "Your photo" : choice.mode === "plain" ? "Plain colour card" : "Cover card · made for this activity";
  const key = choice.mode === "card" || choice.mode === "plain" ? `${choice.mode}-${choice.variant}` : choice.mode === "ai" ? choice.url : "upload";

  return (
    <div>
      <button type="button" onClick={onBack} aria-label="Back" className="-ml-2.5 grid size-11 place-items-center rounded-full hover:bg-paper-muted">
        <ArrowLeft className="size-6" strokeWidth={1.75} aria-hidden />
      </button>
      <h1 className="font-display-serif text-[30px] font-medium leading-[1.12]">{JENNY_COVERS_ON ? "Cover by Jenny" : "Your cover"}</h1>
      <p className="mt-2 text-[15px] text-paper-ink-muted">No upload needed — every activity gets its own picture.</p>

      <div className="relative mt-5 aspect-video overflow-hidden rounded-tile bg-paper-muted" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          {painting ? (
            <m.div key="painting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={dissolve} className="absolute inset-0 grid place-items-center overflow-hidden">
              <div aria-hidden className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,var(--paper-muted),#fff_45%,var(--paper-muted))]" />
              <div className="relative flex flex-col items-center gap-3">
                <JennyOrb size={64} online />
                <p className="text-[15px] font-semibold">Jenny is painting your cover…</p>
              </div>
            </m.div>
          ) : (
            <m.div key={key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={dissolve} className="absolute inset-0">
              {choice.mode === "ai" || choice.mode === "upload" ? (
                // eslint-disable-next-line @next/next/no-img-element -- generated or uploaded cover
                <img src={choice.url} alt="" className="size-full object-cover" />
              ) : (
                <ProceduralCover ref={svg} seed={`${seed}-${choice.variant}`} subtypeId={subtypeId} time={time} plain={choice.mode === "plain"} />
              )}
            </m.div>
          )}
        </AnimatePresence>
      </div>
      {!painting && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-paper-muted px-2.5 py-1 text-[13px] font-medium">
          {choice.mode === "ai" && <Sparkles className="size-3.5 text-primary-on-paper" aria-hidden />}
          {label}
        </p>
      )}
      {aiFailed && <p role="status" className="mt-2 text-[14px] text-paper-ink-muted">Jenny couldn&apos;t paint right now — here&apos;s a card. Try again later.</p>}

      <div className="mt-5 grid grid-cols-3 gap-2">
        <button type="button" disabled={painting || (choice.mode === "card" && tries >= MAX_TRIES && (!JENNY_COVERS_ON || aiFailed))} onClick={tryAnother} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-tile bg-white text-[13px] font-semibold ring-1 ring-paper-ink/10 disabled:opacity-45">
          <RefreshCw className="size-5" aria-hidden /> Try another
        </button>
        <button type="button" disabled={painting} onClick={() => fileRef.current?.click()} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-tile bg-white text-[13px] font-semibold ring-1 ring-paper-ink/10 disabled:opacity-45">
          <ImagePlus className="size-5" aria-hidden /> Upload my own
        </button>
        <button type="button" disabled={painting} onClick={() => setChoice({ mode: "plain", variant: 0 })} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 rounded-tile bg-white text-[13px] font-semibold ring-1 disabled:opacity-45", choice.mode === "plain" ? "ring-2 ring-primary-on-paper" : "ring-paper-ink/10")}>
          <Square className="size-5" aria-hidden /> Plain colour
        </button>
      </div>
      {choice.mode === "card" && tries >= MAX_TRIES && <p className="mt-2 text-[13px] text-paper-ink-muted">That&apos;s {MAX_TRIES} — keep the one you like, or upload your own.</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (!f.type.startsWith("image/") || f.size > 10 * 1024 * 1024) return setError("Choose a photo under 10 MB.");
          setError("");
          setChoice({ mode: "upload", url: URL.createObjectURL(f), file: f });
        }}
      />
      {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      <Button className="mt-6" loading={busy} disabled={painting} onClick={use}>Use this</Button>
    </div>
  );
}
