"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Briefcase,
  Palette,
  HeartPulse,
  Truck,
  FileSignature,
  FolderKanban,
  Laptop,
  Sparkles,
} from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { SkillPicker } from "@/components/onboarding/SkillPicker";
import { SkillNebula } from "@/components/onboarding/SkillNebula";
import { AgentOrb } from "@/components/landing/AgentOrb";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { saveOnboardingProfile, setOnboarded } from "@/lib/session";
import type { Industry, OpenTo } from "@/lib/types";

const STEPS = ["name", "role", "skills", "experience", "rate", "openTo", "finale"] as const;

const INDUSTRY_OPTIONS: { key: Industry; label: string; icon: typeof Briefcase }[] = [
  { key: "Engineering", label: "Engineering", icon: Laptop },
  { key: "Design", label: "Design", icon: Palette },
  { key: "Sales", label: "Sales", icon: Briefcase },
  { key: "Healthcare", label: "Healthcare", icon: HeartPulse },
  { key: "Logistics", label: "Logistics", icon: Truck },
];

const OPEN_TO_OPTIONS: { key: OpenTo; label: string; desc: string; icon: typeof FileSignature }[] = [
  { key: "full-time", label: "Full Time", desc: "Long term career opportunities", icon: FileSignature },
  { key: "contract", label: "Contract", desc: "Work on a contract basis", icon: FolderKanban },
  { key: "projects", label: "Projects", desc: "Bid on one-off project work", icon: Laptop },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [industry, setIndustry] = useState<Industry | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState(2);
  const [rateFloor, setRateFloor] = useState(15);
  const [openTo, setOpenTo] = useState<OpenTo[]>([]);
  const [autoApply, setAutoApply] = useState(true);
  const [searchable, setSearchable] = useState(true);

  const toggleOpenTo = (key: OpenTo) =>
    setOpenTo((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const canContinue = [
    name.trim().length > 0,
    title.trim().length > 0 && industry !== null,
    skills.length > 0,
    true,
    true,
    openTo.length > 0,
    true,
  ][step];

  const handleNext = () => {
    if (step === STEPS.length - 1) {
      handleFinish();
      return;
    }
    setStep((s) => s + 1);
  };

  const handleFinish = () => {
    setSubmitting(true);
    saveOnboardingProfile({
      name,
      title,
      industry: industry ?? "Engineering",
      skills,
      experienceYears,
      rateFloor,
      openTo,
      consent: { autoApply, searchableByEnterprises: searchable },
    });
    setOnboarded();
    setTimeout(() => router.push("/dashboard"), 600);
  };

  return (
    <OnboardingShell
      step={step}
      totalSteps={STEPS.length}
      onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
      nextDisabled={!canContinue}
      onNext={handleNext}
      nextLabel={step === STEPS.length - 1 ? "Enter Arena" : "Continue"}
      isSubmitting={submitting}
      hideFooter={step === 2}
    >
      {step === 0 && (
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            What should we call you?
          </h1>
          <p className="mt-2 text-muted-foreground">Your agent will use this everywhere.</p>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aditi Sharma"
            className="mt-7 h-14 rounded-2xl border-border bg-white/5 text-center text-lg backdrop-blur-xl"
          />
        </div>
      )}

      {step === 1 && (
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">What do you do?</h1>
          <p className="mt-2 text-muted-foreground">This helps your agent search the right openings.</p>
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Product Designer"
            className="mt-7 h-14 rounded-2xl border-border bg-white/5 text-center text-lg backdrop-blur-xl"
          />
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {INDUSTRY_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setIndustry(key)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-3.5 text-xs font-medium transition-colors",
                  industry === key
                    ? "border-primary/60 bg-primary/10 text-primary-soft"
                    : "border-border bg-white/[0.03] text-muted-foreground hover:border-white/20",
                )}
              >
                <Icon className="size-5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="relative text-center">
          <SkillNebula count={skills.length} />
          <div className="relative">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              What are you great at?
            </h1>
            <p className="mt-2 text-muted-foreground">
              Search and add skills — watch your identity graph light up.
            </p>
            <div className="mt-7 text-left">
              <SkillPicker selected={skills} onChange={setSkills} />
            </div>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canContinue}
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-linear-to-r from-primary-soft to-primary px-6 font-semibold text-primary-foreground shadow-[0_8px_30px_rgba(255,107,53,0.35)] disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            How many years of experience?
          </h1>
          <p className="mt-8 font-display text-5xl font-bold text-primary-soft">{experienceYears}</p>
          <p className="text-sm text-muted-foreground">{experienceYears === 1 ? "year" : "years"}</p>
          <div className="mx-auto mt-8 max-w-sm">
            <Slider value={experienceYears} onValueChange={(v) => setExperienceYears(v as number)} min={0} max={20} step={1} />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            What&apos;s your rate floor?
          </h1>
          <p className="mt-2 text-muted-foreground">Your agent only applies above this.</p>
          <p className="mt-8 font-display text-5xl font-bold text-primary-soft">₹{rateFloor} LPA</p>
          <div className="mx-auto mt-8 max-w-sm">
            <Slider value={rateFloor} onValueChange={(v) => setRateFloor(v as number)} min={4} max={60} step={1} />
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Open to what?</h1>
          <p className="mt-2 text-muted-foreground">Select everything that applies.</p>
          <div className="mt-7 grid gap-2.5">
            {OPEN_TO_OPTIONS.map(({ key, label, desc, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleOpenTo(key)}
                className={cn(
                  "flex items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-colors",
                  openTo.includes(key)
                    ? "border-primary/60 bg-primary/10"
                    : "border-border bg-white/[0.03] hover:border-white/20",
                )}
              >
                <Icon className={cn("size-5 shrink-0", openTo.includes(key) ? "text-primary-soft" : "text-muted-foreground")} />
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block text-xs text-muted-foreground">{desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="text-center">
          <div className="scale-[0.55] sm:scale-75">
            <AgentOrb />
          </div>
          <h1 className="-mt-16 font-display text-2xl font-bold tracking-tight sm:-mt-10 sm:text-3xl">
            Your agent is waking up, {name.split(" ")[0] || "there"}.
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            It will scan openings, apply on your behalf above your match threshold, and propose
            interview times — always with a chance to review first.
          </p>

          <div className="mx-auto mt-7 max-w-sm space-y-3 text-left">
            <div className="flex items-center justify-between rounded-2xl border border-border bg-white/[0.03] px-4 py-3.5">
              <span>
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Sparkles className="size-3.5 text-primary-soft" /> Auto-apply
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Let your agent apply to 90%+ matches for you
                </span>
              </span>
              <Switch checked={autoApply} onCheckedChange={setAutoApply} />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-white/[0.03] px-4 py-3.5">
              <span>
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <GraduationCap className="size-3.5 text-primary-soft" /> Visible to enterprises
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Show up in Talent Universe search results
                </span>
              </span>
              <Switch checked={searchable} onCheckedChange={setSearchable} />
            </div>
          </div>
        </div>
      )}
    </OnboardingShell>
  );
}
