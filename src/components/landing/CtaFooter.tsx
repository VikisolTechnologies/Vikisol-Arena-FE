import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "./Reveal";

export function CtaFooter() {
  return (
    <>
      <section id="cta" className="relative z-10 mx-auto grid w-full max-w-[1240px] place-items-center px-5 py-[130px] pb-[60px] text-center sm:px-6">
        <Reveal
          as="h2"
          className="max-w-[820px] font-display text-[clamp(36px,6vw,72px)] font-bold leading-[1.05] tracking-tight"
        >
          Stop searching for work.
          <br />
          <span className="bg-linear-to-r from-primary-soft to-primary bg-clip-text text-transparent">
            Let work find you.
          </span>
        </Reveal>
        <Reveal as="p" delay={0.05} className="my-5 text-[17px] text-muted-foreground">
          Free for talent. Enterprise plans for teams that hire.
        </Reveal>
        <Reveal delay={0.1}>
          <Button variant="primary-gradient" size="cta-lg" render={<Link href="/auth" />}>
            Enter Arena
          </Button>
        </Reveal>
      </section>

      <footer className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-wrap justify-between gap-3.5 border-t border-border px-5 py-8.5 pb-11 text-[13.5px] text-faint sm:px-6">
        <span>
          ARENA<span className="text-primary">.</span> — a Vikisol Technologies product
        </span>
        <span>Identity · Agent · Marketplace · Enterprise</span>
      </footer>
    </>
  );
}
