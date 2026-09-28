"use client";

import { ProceduralCover } from "@/components/covers/ProceduralCover";
import { ALL_SUBTYPES } from "@/lib/activities/taxonomy";
import type { TimeOfDay } from "@/lib/covers/procedural";

const TIMES: TimeOfDay[] = ["morning", "day", "evening", "night"];

/** Dev gallery: one procedural cover per activity type, plus three cricket seeds to show that no
 *  two creations share a picture. */
export default function CoversGallery() {
  const cricket = ALL_SUBTYPES.find((s) => s.id === "cricket")!;
  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="font-display-serif text-[32px]">Procedural covers</h1>
      <p className="text-faint">Seeded per activity id — unique, free, no text, logos or faces.</p>
      <h2 className="mt-6 text-[18px] font-semibold">Three cricket matches</h2>
      <div className="mt-2 grid grid-cols-3 gap-3">
        {["a", "b", "c"].map((s) => (
          <div key={s} className="aspect-video overflow-hidden rounded-tile"><ProceduralCover seed={`cricket-${s}`} subtypeId={cricket.id} time="evening" /></div>
        ))}
      </div>
      <h2 className="mt-6 text-[18px] font-semibold">Every type</h2>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ALL_SUBTYPES.map((s, i) => (
          <figure key={s.id}>
            <div className="aspect-video overflow-hidden rounded-tile"><ProceduralCover seed={`demo-${s.id}`} subtypeId={s.id} time={TIMES[i % 4]} /></div>
            <figcaption className="mt-1 text-[13px] text-faint">{s.category.label} · {s.label}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
