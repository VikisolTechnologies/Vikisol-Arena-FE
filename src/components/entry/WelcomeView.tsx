"use client";

import Image from "next/image";
import { m } from "motion/react";
import { Sprout } from "lucide-react";
import { ArenaLogo } from "@/components/brand/ArenaLogo";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { CookieBannerSpacer } from "@/components/bplus/Screen";
import { kenBurns, rise } from "@/lib/motion";

/** Board: "ARENA B+ — Entry & progressive onboarding", screen 1. */
export function WelcomeView({ onJoin, onSignIn }: { onJoin: () => void; onSignIn: () => void }) {
  return (
    <div className="relative min-h-svh overflow-hidden bg-background">
      <m.div className="absolute inset-0 will-change-transform" animate={kenBurns.animate} transition={kenBurns.transition}>
        <Image
          src="/brand/welcome-hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_35%]"
        />
      </m.div>
      <div aria-hidden className="absolute inset-x-0 top-0 h-44 bg-linear-to-b from-background/70 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[72%] bg-linear-to-t from-background from-35% via-background/80 to-transparent" />

      <m.div
        initial="hidden"
        animate="shown"
        className="relative mx-auto flex min-h-svh w-full max-w-[480px] flex-col px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))]"
      >
        <m.header variants={rise} custom={0}>
          <ArenaLogo className="text-[30px] text-foreground" />
          <p className="mt-1 text-[13px] text-foreground/80">Local people. Real outcomes.</p>
        </m.header>

        <div className="flex-1" />

        <m.h1 variants={rise} custom={1} className="font-display-serif text-[40px] font-medium leading-[1.08] tracking-[-0.015em] text-foreground">
          Local people.
          <br />
          Real outcomes.
        </m.h1>
        <m.p variants={rise} custom={2} className="mt-4 max-w-[34ch] text-[16px] leading-relaxed text-foreground/85">
          Meet neighbors, join activities, get help, share skills and make your neighborhood stronger.
        </m.p>

        <m.div variants={rise} custom={3} className="mt-8 space-y-3">
          <Button onClick={onJoin}>Join Arena</Button>
          <Button variant="outline" onClick={onSignIn}>
            Sign in
          </Button>
          <div className="flex justify-center">
            <ButtonLink href="/home" variant="link" className="text-foreground underline decoration-foreground/50 underline-offset-4">
              Continue as guest
            </ButtonLink>
          </div>
        </m.div>

        <m.footer variants={rise} custom={4} className="mt-6 flex items-center justify-center gap-3 text-foreground/70">
          <Sprout className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
          <p className="text-[11px] font-medium uppercase leading-relaxed tracking-[0.22em]">
            A kinder neighborhood
            <br />
            brighter tomorrows
          </p>
        </m.footer>
        <a
          href="https://commons.wikimedia.org/wiki/File:Durgam_Cheruvu,_Hyderabad.jpg"
          className="mt-1 inline-flex min-h-11 items-center self-center text-[11px] text-foreground/65 underline-offset-2 hover:underline"
        >
          Photo: Durgam Cheruvu by Amulya 09, CC BY-SA 4.0
        </a>
        <CookieBannerSpacer />
      </m.div>
    </div>
  );
}
