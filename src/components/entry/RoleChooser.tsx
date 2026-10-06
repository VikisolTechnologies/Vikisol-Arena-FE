"use client";

import { useState } from "react";
import { m } from "motion/react";
import { ArrowLeftRight, Check, ChevronRight } from "lucide-react";
import { BriefcaseSolid, PersonSolid } from "@/components/bplus/SolidIcons";
import { cn } from "@/lib/utils";
import { press, rise, spring } from "@/lib/motion";
import { Button } from "@/components/bplus/Button";
import { Lede, Screen, Title, TopBar } from "@/components/bplus/Screen";
import { IconBadge } from "@/components/bplus/IconBadge";

type Choice = "person" | "company";

/** Recruiter board screen 1 — "What brings you here?". It only picks which sign-up form opens;
 *  the account itself is created by the unchanged sign-up flow. */
export function RoleChooser({ onBack, onContinue }: { onBack: () => void; onContinue: (choice: Choice) => void }) {
  const [choice, setChoice] = useState<Choice>("person");
  const options: { id: Choice; title: string; detail: string; icon: typeof PersonSolid }[] = [
    { id: "person", title: "Join as a local person", detail: "Find activities, opportunities and neighbours.", icon: PersonSolid },
    { id: "company", title: "Recruit for a company", detail: "Hire local talent and build your team.", icon: BriefcaseSolid },
  ];
  return (
    <Screen tone="light">
      <TopBar onBack={onBack} />
      <Title className="mt-2">Create your Arena account</Title>
      <Lede>What brings you here?</Lede>
      <m.div initial="hidden" animate="shown" role="radiogroup" aria-label="Account type" className="mt-6 space-y-3">
        {options.map((o, i) => {
          const on = choice === o.id;
          return (
            <m.button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              variants={rise}
              custom={i}
              whileTap={press}
              transition={spring.snappy}
              onClick={() => setChoice(o.id)}
              className={cn("flex w-full items-center gap-4 rounded-tile border-2 p-4 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary", on ? "border-primary bg-primary/[0.07]" : "border-line bg-surface")}
            >
              <IconBadge icon={o.icon} tone={on ? "orange" : "ink"} />
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold">{o.title}</span>
                <span className="block text-[14px] text-faint">{o.detail}</span>
              </span>
              {on ? <Check className="size-6 shrink-0 text-primary-on-paper" strokeWidth={2.5} aria-hidden /> : <ChevronRight className="size-5 shrink-0 text-faint" aria-hidden />}
            </m.button>
          );
        })}
      </m.div>
      <div className="mt-4 flex gap-3 rounded-tile bg-paper-muted p-4">
        <ArrowLeftRight className="size-5 shrink-0 text-faint" aria-hidden />
        <p className="text-[14px] text-faint"><span className="font-semibold text-foreground">Switch anytime.</span> People who hire can keep a personal Arena too — with a separate sign-in for the company workspace.</p>
      </div>
      <Button className="mt-8" onClick={() => onContinue(choice)}>{choice === "company" ? "Continue as recruiter" : "Continue"}</Button>
      <p className="mt-3 text-center text-[13px] text-faint">Same community. A stronger tomorrow.</p>
    </Screen>
  );
}
