"use client";

import Image from "next/image";
import { m } from "motion/react";
import { Sprout } from "lucide-react";
import { ArenaLogo, ArenaMark } from "@/components/brand/ArenaLogo";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { CookieBannerSpacer } from "@/components/bplus/Screen";
import { kenBurns, rise } from "@/lib/motion";

/** Board: "ARENA B+ — Entry & progressive onboarding", screen 1. */
export function WelcomeView({ onJoin, onSignIn }: { onJoin: () => void; onSignIn: () => void }) {
  return (
    <div className="relative min-h-svh overflow-hidden bg-background">
      <m.div className="absolute inset-0 will-change-transform" animate={kenBurns.animate} transition={kenBurns.transition}>
        <Image
          src="/brand/welcome-park.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_40%]"
        />
      </m.div>
      <div aria-hidden className="absolute inset-x-0 top-0 h-44 bg-linear-to-b from-background/70 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[78%] bg-linear-to-t from-background from-40% via-background/85 to-transparent" />

      <m.div
        initial="hidden"
        animate="shown"
        className="relative mx-auto flex min-h-svh w-full max-w-[480px] flex-col px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))]"
      >
        <a
          href="https://www.flickr.com/photos/47284001@N07/6223651550"
          aria-label="Photo credit: At Cubbon Park by Kavya Bhat, CC BY 2.0"
          title="Photo: At Cubbon Park by Kavya Bhat, CC BY 2.0"
          className="absolute right-3 top-[max(12px,env(safe-area-inset-top))] grid size-11 place-items-center rounded-full text-[13px] font-semibold text-foreground/70 hover:bg-background/40"
        >
          ©
        </a>
        <m.header variants={rise} custom={0} className="flex items-center gap-3 pt-2">
          <ArenaMark className="size-[58px]" />
          <div>
            <ArenaLogo variant="word" className="text-[36px] text-foreground" />
            <p className="mt-1 text-[14px] text-foreground/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">Local people. Real outcomes.</p>
          </div>
        </m.header>

        <div className="min-h-6 flex-1" />

        <m.h1 variants={rise} custom={1} className="font-display-serif text-[40px] font-medium leading-[1.08] tracking-[-0.015em] text-foreground [text-shadow:0_2px_18px_rgba(0,0,0,0.6)]">
          Local people.
          <br />
          Real outcomes.
        </m.h1>
        <m.p variants={rise} custom={2} className="mt-4 max-w-[34ch] text-[16px] leading-relaxed text-foreground/90 [text-shadow:0_1px_10px_rgba(0,0,0,0.7)]">
          Meet neighbors, join activities, get help, share skills and make your neighborhood stronger.
        </m.p>

        <m.div variants={rise} custom={3} className="mt-6 space-y-3">
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

        <m.footer variants={rise} custom={4} className="mt-5 flex items-center justify-center gap-3 text-foreground/70">
          <Sprout className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
          <p className="text-[11px] font-medium uppercase leading-relaxed tracking-[0.22em]">
            A kinder neighborhood
            <br />
            brighter tomorrows
          </p>
        </m.footer>

        <CookieBannerSpacer />
      </m.div>
    </div>
  );
}
