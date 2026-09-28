import Link from "next/link";
import { PHASES, SCREENS, STATUS_LABEL, type ScreenStatus } from "@/lib/dev/screens";

export const dynamic = "force-static";

const TONE: Record<ScreenStatus, string> = {
  done: "bg-success/20 text-success",
  "in-progress": "bg-warning/20 text-warning",
  "not-started": "bg-foreground/10 text-faint",
};

export default function ProgressPage() {
  const done = SCREENS.filter((s) => s.status === "done").length;
  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-primary">Arena B+ build</p>
          <h1 className="mt-1 font-display-serif text-[36px] font-medium">Progress</h1>
          <p className="mt-1 text-[15px] text-faint">
            {done} of {SCREENS.length} screens done · board on the left, live screen on the right in Compare.
          </p>
        </div>
        <Link href="/dev/compare/all" className="inline-flex min-h-11 items-center rounded-button bg-primary px-5 text-[16px] font-bold text-white">
          Compare all done screens
        </Link>
      </header>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface" aria-hidden>
        <div className="h-full rounded-full bg-primary" style={{ width: `${(done / SCREENS.length) * 100}%` }} />
      </div>

      {PHASES.map((phase) => {
        const screens = SCREENS.filter((s) => s.phase === phase);
        return (
          <section key={phase} className="mt-10" aria-label={phase}>
            <h2 className="text-[20px] font-semibold">{phase}</h2>
            <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
              {screens.map((s) => (
                <li key={s.id} className="flex flex-col overflow-hidden rounded-tile border border-line bg-surface">
                  <Link href={`/dev/compare/${s.id}`} className="block aspect-[2/5] overflow-hidden bg-black/30">
                    {s.board === "none" ? (
                      <span className="grid size-full place-items-center p-2 text-center text-[11px] leading-tight text-faint">No board — designed in B+</span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- static board crop
                      <img src={`/dev/boards/${s.id}.webp`} alt={`Board: ${s.title}`} loading="lazy" className="size-full object-cover object-top" />
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col gap-1.5 p-2.5">
                    <p className="text-[13px] font-semibold leading-tight">{s.title}</p>
                    <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE[s.status]}`}>{STATUS_LABEL[s.status]}</span>
                    {s.commit && <code className="text-[11px] text-faint">{s.commit}</code>}
                    <div className="mt-auto flex gap-3 pt-1 text-[12px]">
                      <Link href={`/dev/compare/${s.id}`} className="underline underline-offset-2">Compare</Link>
                      {s.route && s.status !== "not-started" && (
                        <Link href={s.route} className="underline underline-offset-2">Live</Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <p className="mt-12 text-[13px] text-faint">
        Live screens use this browser&apos;s own session: sign in first to see signed-in screens. Onboarding&apos;s last step only appears after a real save.
      </p>
    </main>
  );
}
