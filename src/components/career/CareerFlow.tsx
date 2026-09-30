"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, Briefcase, Building2, ChevronDown, ChevronRight, Eye, HandHeart, Lock, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { pageSlide, rise, vibrate } from "@/lib/motion";
import { useDirection } from "@/components/motion/useDirection";
import { AppShell } from "@/components/bplus/AppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { Button } from "@/components/bplus/Button";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Skeleton, StateCard } from "@/components/bplus/Primitives";
import { PaperSwitch } from "@/components/settings/SettingsSheets";
import { IntakeForm, readIntakeDraft } from "@/components/intake/IntakeForm";
import { CAREER_SCHEMA } from "@/lib/intake/schemas/career";
import { getMyProfile, updateMyConsent, updateMyProfileDetails, updateMyResume, updateMySkills } from "@/lib/api/profile";
import { signOut } from "@/lib/api/auth";
import { requireOnboarded } from "@/lib/auth-guard";
import { DEVICE_ONLY_FIELDS, EMPTY_META, apiFieldsFrom, openToFor, readCareerMeta, writeCareerMeta, type CareerIntent, type CareerMeta } from "@/lib/data/career";
import type { Values } from "@/lib/intake/types";
import type { CandidateProfile } from "@/lib/types";
import { JennyOrb } from "@/components/jenny/JennyOrb";
import { JENNY_PREVIEW } from "@/lib/data/jenny";

type Step = "intent" | "setup" | "privacy";
const STEPS: Step[] = ["intent", "setup", "privacy"];
type Icon = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;

const INTENTS: { id: CareerIntent | "hire"; title: string; detail: string; icon: Icon; disc: string }[] = [
  { id: "find", title: "Find a job", detail: "Explore and apply to local opportunities", icon: Briefcase, disc: "bg-primary" },
  { id: "quiet", title: "Explore quietly", detail: "Look around without showing intent", icon: Eye, disc: "bg-info" },
  { id: "offer", title: "Offer my skills", detail: "Freelance: let people know how I can help", icon: HandHeart, disc: "bg-success" },
  { id: "hire", title: "Hire locally", detail: "Find and connect with talent in your area", icon: Building2, disc: "bg-info" },
];

/** Board "Open the career layer" 2–4 + ARENA-APP-FLOW §6: intent → career intake (basics, status,
 *  skills, pay, preferences, proof) → visibility preview → publish. One identity, opt-in. */
export function CareerFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const step = (STEPS.includes(params.get("step") as Step) ? params.get("step") : "intent") as Step;
  const direction = useDirection(STEPS.indexOf(step));
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [error, setError] = useState(false);
  // Everything below the profile renders only after it loads (client-only), so these reads are safe.
  const [meta, setMeta] = useState<CareerMeta>(() => readCareerMeta() ?? EMPTY_META);
  const [answers, setAnswers] = useState<Values | null>(null);
  const [hireOpen, setHireOpen] = useState(false);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile).catch(() => setError(true));
  }, [router]);
  useEffect(() => writeCareerMeta(meta), [meta]);

  const go = (s: Step) => router.push(`/identity/career?step=${s}`);

  if (error) {
    return (
      <AppShell tone="light">
        <div className="pt-10"><StateCard kind="error" title="Your profile didn't load" detail="Check your connection and try again." /></div>
      </AppShell>
    );
  }

  const initial: Values | undefined = profile
    ? {
        title: profile.title || undefined,
        years: profile.experienceYears || 0,
        skills: profile.skills.map((s) => ({ name: s.name, level: "working", years: 1 })),
        locations: (profile.preferredLocation ?? "").split(",").map((s) => s.trim()).filter(Boolean),
        roles: profile.title ? [profile.title] : undefined,
      }
    : undefined;

  return (
    <AppShell tone="light">
      <div className="-mx-5 -mt-[max(8px,env(safe-area-inset-top))] flex-1 overflow-x-hidden px-5 pb-6 pt-[max(12px,env(safe-area-inset-top))]">
        {!profile ? (
          <div className="space-y-3 pt-12" aria-busy="true" aria-label="Loading">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <m.div key={step} custom={direction} variants={pageSlide} initial="enter" animate="center" exit="exit">
              {step === "intent" && (
                <IntentStep
                  value={meta.intent}
                  onChoose={(id) => {
                    if (id === "hire") return setHireOpen(true);
                    setMeta((mm) => ({ intent: id, openToWork: id === "quiet" ? false : mm.intent ? mm.openToWork : profile.consent.searchableByEnterprises }));
                  }}
                  onContinue={() => go("setup")}
                />
              )}
              {step === "setup" && (
                <IntakeForm
                  schema={CAREER_SCHEMA}
                  draftKey="career"
                  startAt={params.get("start") ?? undefined}
                  initial={initial}
                  onExit={() => go("intent")}
                  onSubmit={(v) => {
                    setAnswers(v);
                    go("privacy");
                  }}
                />
              )}
              {step === "privacy" && (
                <PrivacyStep
                  meta={meta}
                  setMeta={setMeta}
                  profile={profile}
                  answers={answers ?? readIntakeDraft("career") ?? {}}
                  onPublished={() => {
                    vibrate();
                    router.replace("/jobs?published=1");
                  }}
                />
              )}
            </m.div>
          </AnimatePresence>
        )}
      </div>
      <BottomSheet open={hireOpen} onClose={() => setHireOpen(false)} title="Hire locally">
        <h2 className="mt-3 pr-12 font-display-serif text-[26px] font-medium">Hiring uses Arena for Business</h2>
        <p className="mt-2 text-[15px] text-paper-ink-muted">Companies post jobs and review candidates from a verified business workspace. Your personal profile stays exactly as it is.</p>
        <div className="mt-6 space-y-2">
          <Button onClick={() => void signOut().then(() => router.replace("/auth?mode=role"))}>Sign out and set up a business</Button>
          <Button variant="outline" className="border-paper-ink/55 text-paper-ink" onClick={() => setHireOpen(false)}>Not now</Button>
        </div>
      </BottomSheet>
    </AppShell>
  );
}

function IntentStep({ value, onChoose, onContinue }: { value: CareerIntent | null; onChoose: (id: CareerIntent | "hire") => void; onContinue: () => void }) {
  return (
    <div>
      <div className="flex justify-end">
        <Link href="/identity" aria-label="Close" className="-mr-2 grid size-11 place-items-center rounded-full hover:bg-paper-muted">
          <X className="size-6" strokeWidth={1.75} aria-hidden />
        </Link>
      </div>
      <h1 className="font-display-serif text-[30px] font-medium leading-[1.12]">What do you want to do with your career on Arena?</h1>
      <p className="mt-2 text-[15px] text-paper-ink-muted">Choose an option. You can change this anytime.</p>
      <m.div initial="hidden" animate="shown" role="radiogroup" aria-label="Career intent" className="mt-6 space-y-3">
        {INTENTS.map((o, i) => {
          const on = value === o.id;
          return (
            <m.div key={o.id} variants={rise} custom={i}>
              <button
                type="button"
                role={o.id === "hire" ? undefined : "radio"}
                aria-checked={o.id === "hire" ? undefined : on}
                onClick={() => onChoose(o.id)}
                className={cn("flex w-full items-center gap-3.5 rounded-tile border-2 p-3.5 text-left outline-none transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.97]", on ? "border-primary-on-paper bg-primary/10" : "border-transparent bg-paper-muted")}
              >
                <span className={cn("grid size-14 shrink-0 place-items-center rounded-full text-white", o.disc)}>
                  <o.icon className="size-6" strokeWidth={1.9} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[18px] font-semibold">{o.title}</span>
                  <span className="block text-[14px] text-paper-ink-muted">{o.detail}</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-paper-ink-muted" aria-hidden />
              </button>
            </m.div>
          );
        })}
      </m.div>
      <Button className="mt-6" disabled={!value} onClick={onContinue}>Continue</Button>
      {JENNY_PREVIEW && (
        <Link href="/identity/career/jenny" className="mt-3 flex min-h-12 items-center justify-center gap-2 text-[15px] font-semibold text-primary-on-paper">
          <JennyOrb size={22} online={false} still /> Or just tell Jenny what you&apos;re looking for
        </Link>
      )}
    </div>
  );
}

function Reveal({ title, items, icon: IconCmp = Users, defaultOpen = false }: { title: string; items: string[]; icon?: Icon; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-tile bg-paper-muted">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex min-h-14 w-full items-center gap-3 px-4 text-left">
        <IconCmp className="size-5 shrink-0 text-info-on-paper" aria-hidden />
        <span className="flex-1 text-[16px] font-semibold">{title}</span>
        <ChevronDown className={cn("size-5 transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul className="space-y-1.5 px-4 pb-4 pl-12 text-[14px]">
          {items.map((i) => <li key={i} className="list-disc">{i}</li>)}
        </ul>
      )}
    </section>
  );
}

function PrivacyStep({ meta, setMeta, profile, answers, onPublished }: { meta: CareerMeta; setMeta: (fn: (m: CareerMeta) => CareerMeta) => void; profile: CandidateProfile; answers: Values; onPublished: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const api = apiFieldsFrom(answers);
  const publish = async () => {
    if (!api.title) {
      setError("Add your title first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      // Only answers Arena BE stores today; "Only me" answers stay on this device (FE-API-GAPS #19).
      let p = await updateMyProfileDetails({
        name: profile.name,
        title: api.title,
        industry: profile.industry,
        experienceYears: api.experienceYears,
        rateFloor: profile.rateFloor,
        openTo: openToFor(meta.intent),
        cameForJob: true,
        preferredLocation: api.preferredLocation ?? profile.preferredLocation,
      });
      if (api.skills.length) p = await updateMySkills(api.skills);
      if (api.resume) p = await updateMyResume({ file: api.resume });
      await updateMyConsent({ ...p.consent, searchableByEnterprises: meta.openToWork });
      onPublished();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "That didn't publish. Your answers are still here — try again.");
      setBusy(false);
    }
  };
  const employer = ["Your name, title and experience", "Skills", "Preferred locations", api.resume || profile.resumeFileName ? "Your resume" : "Resume (if you upload one)"];
  return (
    <div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="-ml-2.5 grid size-11 place-items-center rounded-full hover:bg-paper-muted">
          <ArrowLeft className="size-6" strokeWidth={1.75} aria-hidden />
        </button>
        <Link href="/identity" aria-label="Close" className="-mr-2 grid size-11 place-items-center rounded-full hover:bg-paper-muted">
          <X className="size-6" strokeWidth={1.75} aria-hidden />
        </Link>
      </div>
      <h1 className="font-display-serif text-[30px] font-medium leading-[1.12]">Preview your visibility</h1>
      <p className="mt-2 text-[15px] text-paper-ink-muted">What different people see. You decide what to share.</p>
      <div className="mt-5 flex items-center gap-3.5 rounded-tile bg-white p-4 ring-1 ring-paper-ink/10">
        <Avatar name={profile.name} className="size-14 text-[18px]" />
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold">{profile.name}</p>
          <p className="truncate text-[14px] text-paper-ink-muted">{[api.title || profile.title, profile.homeCity].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        <Reveal title="What employers see (when open to work)" items={employer} icon={Briefcase} defaultOpen />
        <Reveal title="What anyone opening your profile sees" items={["Your name and area", "Title, industry, experience and skills", "Your outcomes on Arena"]} />
        <Reveal title="Only you (kept on this device)" items={DEVICE_ONLY_FIELDS} icon={Lock} />
      </div>
      <div className="mt-5 rounded-tile bg-white px-4 ring-1 ring-paper-ink/10">
        <PaperSwitch label="Open to work" detail={meta.openToWork ? "Verified employers can find you." : "Not visible to employers. Turn on when you're ready."} checked={meta.openToWork} onChange={(v) => setMeta((mm) => ({ ...mm, openToWork: v }))} />
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      <Button className="mt-6" loading={busy} onClick={publish}>Publish career profile</Button>
      <p className="mt-2 text-center text-[13px] text-paper-ink-muted">You can change or hide this anytime in Settings.</p>
    </div>
  );
}
