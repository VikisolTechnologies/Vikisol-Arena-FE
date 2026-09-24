import Link from "next/link";
import { Users, HelpCircle, Briefcase, MessageCircle, type LucideIcon } from "lucide-react";
import { Reveal } from "./Reveal";

// ARENA-FINISH-IT.md §4 - replaces the old "Overnight Report" (47 openings scanned, 3
// applications sent, 1 interview booked - an autonomous job-hunting agent that isn't built).
// Same four intents, same order, as the real Create screen (ARENA-MOCKUP-REFERENCE.md SCREEN 3)
// - this is the honest version of "watch it work": what a visitor can actually go do, not a
// fabricated log of what an agent supposedly did overnight.
const CARDS: { icon: LucideIcon; title: string; body: string; tagline: string; href: string }[] = [
  {
    icon: Users,
    title: "An activity",
    body: "A pickup game, a trek, a coding jam — post it or find one, and show up in real life.",
    tagline: "SEE WHAT'S ON ›",
    href: "/home",
  },
  {
    icon: HelpCircle,
    title: "A need",
    body: "Ask your neighborhood for a hand, a skill, a favor — not a forum post that goes nowhere.",
    tagline: "ASK SOMETHING ›",
    href: "/home",
  },
  {
    icon: Briefcase,
    title: "A project or job",
    body: "Bid on freelance work in the open, or apply to a real role. Hire on proof, not just a resume.",
    tagline: "BROWSE WORK ›",
    href: "/marketplace",
  },
  {
    icon: MessageCircle,
    title: "An update",
    body: "Share something with the people who already follow you — no algorithm deciding who sees it.",
    tagline: "SAY SOMETHING ›",
    href: "/home",
  },
];

export function OvernightReport() {
  return (
    <section id="overnight" className="relative z-10 mx-auto w-full max-w-[1240px] px-5 sm:px-6">
      <div className="max-w-[720px] pb-10 pt-[110px]">
        <Reveal
          as="div"
          className="mb-4 flex items-center gap-2.5 font-display text-xs font-bold tracking-[5px] text-primary-soft"
        >
          <span className="text-[#5a5a63]">01</span>
          FOUR WAYS IN
        </Reveal>
        <Reveal as="h2" delay={0.05} className="font-display text-[clamp(32px,4.6vw,56px)] font-bold leading-[1.08] tracking-tight">
          Not one box to fit into.
        </Reveal>
        <Reveal as="p" delay={0.1} className="mt-4 text-[16.5px] leading-relaxed text-muted-foreground">
          Arena isn&apos;t a job board. These are the same four ways real people already use it —
          the project or job sits third, deliberately.
        </Reveal>
      </div>

      <div className="grid gap-4.5 pb-10 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <Reveal
              key={card.title}
              delay={i * 0.08}
              className="rounded-[24px] border border-border bg-white/5 p-6.5 backdrop-blur-[18px]"
            >
              <Icon className="size-7 text-primary-soft" strokeWidth={1.5} />
              <h3 className="mt-3.5 font-display text-[17px] font-bold">{card.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{card.body}</p>
              {/* "Enter as guest" - links straight into the real, browsable surface rather than
                  signup; each one renders fully logged-out, and only asks for an account at the
                  moment a visitor actually tries to post/join/apply/bid there. */}
              <Link
                href={card.href}
                className="mt-3.5 inline-block text-xs font-semibold tracking-wide text-primary-soft hover:underline"
              >
                {card.tagline}
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
