import type { DevScreen } from "@/lib/dev/screens";
import { STATUS_LABEL } from "@/lib/dev/screens";

/** One board frame and the live route, both at 390×844. */
export function Pair({ screen }: { screen: DevScreen }) {
  return (
    <section aria-label={screen.title} className="flex flex-col gap-3">
      <h2 className="text-[17px] font-semibold">
        {screen.title} <span className="text-[13px] font-normal text-faint">· {screen.phase} · {STATUS_LABEL[screen.status]}{screen.commit ? ` · ${screen.commit}` : ""}</span>
      </h2>
      <div className="flex flex-wrap gap-6">
        <figure>
          <figcaption className="mb-1.5 text-[12px] uppercase tracking-wide text-faint">Board</figcaption>
          <div className="h-[844px] w-[390px] overflow-hidden rounded-[28px] border border-line bg-black">
            {screen.board === "none" ? (
              <div className="grid size-full place-items-center p-8 text-center text-[16px] text-white/80">No board — designed in B+ from docs/design/ARENA-APP-FLOW.md</div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- static board crop
              <img src={`/dev/boards/${screen.id}.webp`} alt={`Board: ${screen.title}`} className="size-full object-contain" />
            )}
          </div>
        </figure>
        <figure>
          <figcaption className="mb-1.5 text-[12px] uppercase tracking-wide text-faint">Live {screen.route ?? "(no route yet)"}</figcaption>
          {screen.route && screen.status !== "not-started" ? (
            <iframe title={`Live: ${screen.title}`} src={screen.route} className="h-[844px] w-[390px] rounded-[28px] border border-line bg-background" loading="lazy" />
          ) : (
            <div className="grid h-[844px] w-[390px] place-items-center rounded-[28px] border border-dashed border-line text-[15px] text-faint">Not built yet</div>
          )}
        </figure>
      </div>
    </section>
  );
}
