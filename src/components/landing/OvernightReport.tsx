import Link from "next/link";
import { CountUp } from "./CountUp";
import { Reveal } from "./Reveal";

const CARDS = [
  {
    count: 47,
    title: "Openings scanned",
    body: "Matched against your identity graph — skills, proof of work, salary floor and the roles you swiped away.",
    tagline: "QUALITY-GATED ›",
  },
  {
    count: 3,
    title: "Applications sent",
    body: "Only above a 90% match. Each one carries a resume tailored to that exact role, ready for your review.",
    tagline: "SEE WHAT IT WROTE ›",
    accent: true,
  },
  {
    count: 1,
    title: "Interview booked",
    body: "It read both calendars, proposed slots, and locked Tuesday 3:00 PM. You just have to show up.",
    tagline: "ADD TO CALENDAR ›",
  },
];

export function OvernightReport() {
  return (
    <section id="overnight" className="relative z-10 mx-auto w-full max-w-[1240px] px-5 sm:px-6">
      <div className="max-w-[720px] pb-10 pt-[110px]">
        <Reveal
          as="div"
          className="mb-4 font-display text-xs font-bold tracking-[5px] text-primary-soft"
        >
          OVERNIGHT REPORT
        </Reveal>
        <Reveal as="h2" delay={0.05} className="font-display text-[clamp(32px,4.6vw,56px)] font-bold leading-[1.08] tracking-tight">
          While you slept, it didn&apos;t.
        </Reveal>
        <Reveal as="p" delay={0.1} className="mt-4 text-[16.5px] leading-relaxed text-muted-foreground">
          Every morning opens with a report of what your agent already finished — not a to-do list
          of what you should start.
        </Reveal>
      </div>

      <div className="grid gap-4.5 pb-10 sm:grid-cols-3">
        {CARDS.map((card, i) => (
          <Reveal
            key={card.title}
            delay={i * 0.08}
            className="rounded-[24px] border border-border bg-white/5 p-6.5 backdrop-blur-[18px]"
          >
            <CountUp
              end={card.count}
              className={`font-display text-[clamp(34px,3.6vw,46px)] font-bold ${card.accent ? "text-primary-soft" : "text-foreground"}`}
            />
            <h3 className="mt-1.5 font-display text-[17px] font-bold">{card.title}</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{card.body}</p>
            {/* These teaser numbers describe what your agent does once you're signed up (not a
                claim about the visitor's own history yet) - was a plain <span> styled to look
                like a link but going nowhere. Points at /auth so "SEE WHAT IT WROTE ›" etc. are
                real next steps instead of dead text. */}
            <Link
              href="/auth?mode=signup"
              className="mt-3.5 inline-block text-xs font-semibold tracking-wide text-primary-soft hover:underline"
            >
              {card.tagline}
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
