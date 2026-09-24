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
  Rocket,
  PartyPopper,
  Upload,
  FileText,
  Loader2,
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
import { isRealMode } from "@/lib/api/mode";
import { formatINR } from "@/lib/format";
import { updateMyProfileDetails, updateMySkills, updateMyConsent, updateMyResume } from "@/lib/api/profile";
import type { Industry, OpenTo } from "@/lib/types";

// Job path collects the fuller, Naukri/LinkedIn-style questionnaire (resume, current org,
// experience, CTC, preferred location) - fun path is deliberately short, name + the essentials
// only (founder's call: "ask him details name and few necessary details not unnecessary").
const STEPS_JOB = [
  "name", "intent", "title", "skills", "experience", "organization",
  "resume", "ctc", "location", "rate", "openTo", "finale",
] as const;
const STEPS_FUN = ["name", "intent", "title", "finale"] as const;
type StepName = (typeof STEPS_JOB)[number];

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

  // Job-intent branch - null until answered (skipping the question defaults to the fuller job
  // path, same behavior this wizard always had before this branch existed).
  const [cameForJob, setCameForJob] = useState<boolean | null>(null);
  const [organization, setOrganization] = useState("");
  const [currentCtc, setCurrentCtc] = useState("");
  const [expectedCtc, setExpectedCtc] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState("");

  const activeSteps = cameForJob === false ? STEPS_FUN : STEPS_JOB;
  const stepName: StepName = activeSteps[Math.min(step, activeSteps.length - 1)];

  const toggleOpenTo = (key: OpenTo) =>
    setOpenTo((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  // Only "name" and the required-industry half of "title" ever block Continue - every other
  // step (including the new job-intent ones) is skippable, per the founder's explicit call:
  // "if he ask to skip please skip it."
  const canContinue = (() => {
    switch (stepName) {
      case "name": return name.trim().length > 0;
      case "title": return title.trim().length > 0 && industry !== null;
      case "skills": return skills.length > 0;
      case "openTo": return openTo.length > 0;
      default: return true;
    }
  })();

  const handleNext = () => {
    if (step === activeSteps.length - 1) {
      handleFinish();
      return;
    }
    setStep((s) => s + 1);
  };

  // Bypasses the Continue button's own gating (name/title/skills/openTo above) - the explicit
  // "I'd rather skip this" escape hatch, distinct from steps that never blocked in the first
  // place. Never used on "name" (the one truly unskippable step - "your agent will use this
  // everywhere") or "finale" (nothing to skip past).
  const handleSkip = () => setStep((s) => s + 1);

  const handleResumeSelected = async (file: File) => {
    setResumeFile(file);
    setResumeError("");
    if (!isRealMode()) return; // mock mode just needs the filename, saved at finish
    setResumeUploading(true);
    try {
      await updateMyResume({ file });
    } catch {
      setResumeError("Couldn't upload that file — you can try again later from your profile.");
    } finally {
      setResumeUploading(false);
    }
  };

  const handleFinish = async () => {
    setSubmitting(true);
    const consent = { autoApply, searchableByEnterprises: searchable };
    const ctcNum = (v: string) => (v.trim() ? Number(v) : undefined);
    if (isRealMode()) {
      // Real mode has no single "finish onboarding" endpoint - sync each piece the wizard
      // collected to its matching profile endpoint before landing on the dashboard, so a fresh
      // real signup isn't left with an empty server-side profile.
      await updateMyProfileDetails({
        name,
        title: title || "Arena member",
        industry: industry ?? "Engineering",
        experienceYears,
        rateFloor,
        openTo,
        cameForJob: cameForJob ?? undefined,
        organization: organization.trim() || undefined,
        currentCtc: ctcNum(currentCtc),
        expectedCtc: ctcNum(expectedCtc),
        preferredLocation: preferredLocation.trim() || undefined,
      });
      if (skills.length > 0) await updateMySkills(skills);
      await updateMyConsent(consent);
      // Resume itself was already uploaded the moment it was selected (handleResumeSelected) -
      // real mode's file bytes can't be replayed from local state at finish time the way mock
      // mode's filename-only record can.
    } else {
      saveOnboardingProfile({
        name,
        title: title || "Arena member",
        industry: industry ?? "Engineering",
        skills,
        experienceYears,
        rateFloor,
        openTo,
        consent,
        cameForJob: cameForJob ?? undefined,
        organization: organization.trim() || undefined,
        currentCtc: ctcNum(currentCtc),
        expectedCtc: ctcNum(expectedCtc),
        preferredLocation: preferredLocation.trim() || undefined,
        resumeFileName: resumeFile?.name,
        resumeUploadedAt: resumeFile ? new Date().toISOString() : undefined,
      });
    }
    setOnboarded();
    setTimeout(() => router.push("/home"), 600);
  };

  const SkipLink = ({ label = "Skip for now" }: { label?: string }) => (
    <button
      type="button"
      onClick={handleSkip}
      className="mx-auto mt-4 block text-center text-xs text-muted-foreground hover:text-foreground"
    >
      {label}
    </button>
  );

  return (
    <OnboardingShell
      step={step}
      totalSteps={activeSteps.length}
      onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
      nextDisabled={!canContinue}
      onNext={handleNext}
      nextLabel={step === activeSteps.length - 1 ? "Enter Arena" : "Continue"}
      isSubmitting={submitting}
      hideFooter={stepName === "skills"}
    >
      {stepName === "name" && (
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

      {stepName === "intent" && (
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            What brings you to Arena?
          </h1>
          <p className="mt-2 text-muted-foreground">This shapes the next few questions.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setCameForJob(true)}
              className={cn(
                "flex flex-col items-center gap-2.5 rounded-2xl border px-5 py-7 text-center transition-colors",
                cameForJob === true
                  ? "border-primary/60 bg-primary/10 text-primary-soft"
                  : "border-border bg-white/[0.03] text-muted-foreground hover:border-white/20",
              )}
            >
              <Rocket className="size-7" />
              <span className="text-sm font-semibold">I&apos;m here for a job</span>
              <span className="text-xs text-muted-foreground">
                We&apos;ll ask a few more questions to match you well
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCameForJob(false)}
              className={cn(
                "flex flex-col items-center gap-2.5 rounded-2xl border px-5 py-7 text-center transition-colors",
                cameForJob === false
                  ? "border-primary/60 bg-primary/10 text-primary-soft"
                  : "border-border bg-white/[0.03] text-muted-foreground hover:border-white/20",
              )}
            >
              <PartyPopper className="size-7" />
              <span className="text-sm font-semibold">Just here to explore</span>
              <span className="text-xs text-muted-foreground">Keep it quick — just the basics</span>
            </button>
          </div>
        </div>
      )}

      {stepName === "title" && (
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
          {cameForJob === false && <SkipLink />}
        </div>
      )}

      {stepName === "skills" && (
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
            <SkipLink />
          </div>
        </div>
      )}

      {stepName === "experience" && (
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

      {stepName === "organization" && (
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Where do you currently work?
          </h1>
          <p className="mt-2 text-muted-foreground">Your current (or most recent) organization.</p>
          <Input
            autoFocus
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="e.g. Techolution"
            className="mt-7 h-14 rounded-2xl border-border bg-white/5 text-center text-lg backdrop-blur-xl"
          />
          <SkipLink label="I'd rather not say" />
        </div>
      )}

      {stepName === "resume" && (
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Have a resume handy?
          </h1>
          <p className="mt-2 text-muted-foreground">
            It helps your agent apply faster. No resume yet? No problem — you can add one anytime from your profile.
          </p>
          <label
            className={cn(
              "mx-auto mt-7 flex max-w-sm cursor-pointer flex-col items-center gap-2.5 rounded-2xl border border-dashed px-6 py-9 text-center transition-colors",
              resumeFile ? "border-primary/60 bg-primary/10" : "border-border bg-white/[0.03] hover:border-white/20",
            )}
          >
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleResumeSelected(e.target.files[0])}
            />
            {resumeUploading ? (
              <Loader2 className="size-6 animate-spin text-primary-soft" />
            ) : resumeFile ? (
              <FileText className="size-6 text-primary-soft" />
            ) : (
              <Upload className="size-6 text-muted-foreground" />
            )}
            <span className="text-sm font-semibold">
              {resumeUploading ? "Uploading…" : resumeFile ? resumeFile.name : "Upload resume"}
            </span>
            <span className="text-xs text-muted-foreground">PDF or Word, up to 10MB</span>
          </label>
          {resumeError && <p className="mt-3 text-sm text-red-400">{resumeError}</p>}
          <SkipLink label="Skip — I'll add it later" />
        </div>
      )}

      {stepName === "ctc" && (
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            What&apos;s your compensation like?
          </h1>
          <p className="mt-2 text-muted-foreground">Helps us surface roles actually worth your time.</p>
          <div className="mx-auto mt-7 grid max-w-sm grid-cols-2 gap-3">
            <div className="space-y-1.5 text-left">
              <label className="text-xs text-muted-foreground">Current CTC (LPA)</label>
              <Input
                type="number"
                inputMode="numeric"
                value={currentCtc}
                onChange={(e) => setCurrentCtc(e.target.value)}
                placeholder="e.g. 12"
                className="h-12 rounded-2xl border-border bg-white/5 text-center backdrop-blur-xl"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-xs text-muted-foreground">Expected CTC (LPA)</label>
              <Input
                type="number"
                inputMode="numeric"
                value={expectedCtc}
                onChange={(e) => setExpectedCtc(e.target.value)}
                placeholder="e.g. 18"
                className="h-12 rounded-2xl border-border bg-white/5 text-center backdrop-blur-xl"
              />
            </div>
          </div>
          <SkipLink label="I'd rather not say" />
        </div>
      )}

      {stepName === "location" && (
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Preferred work location?
          </h1>
          <p className="mt-2 text-muted-foreground">Where you&apos;d ideally like to be based.</p>
          <Input
            autoFocus
            value={preferredLocation}
            onChange={(e) => setPreferredLocation(e.target.value)}
            placeholder="e.g. Bengaluru, or Remote"
            className="mt-7 h-14 rounded-2xl border-border bg-white/5 text-center text-lg backdrop-blur-xl"
          />
          <SkipLink />
        </div>
      )}

      {stepName === "rate" && (
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            What&apos;s your rate floor?
          </h1>
          <p className="mt-2 text-muted-foreground">Your agent only applies above this.</p>
          <p className="mt-8 font-display text-5xl font-bold text-primary-soft">{formatINR(rateFloor)} LPA</p>
          <div className="mx-auto mt-8 max-w-sm">
            <Slider value={rateFloor} onValueChange={(v) => setRateFloor(v as number)} min={4} max={60} step={1} />
          </div>
        </div>
      )}

      {stepName === "openTo" && (
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

      {stepName === "finale" && (
        <div className="text-center">
          <div className="scale-[0.55] sm:scale-75">
            <AgentOrb />
          </div>
          <h1 className="-mt-16 font-display text-2xl font-bold tracking-tight sm:-mt-10 sm:text-3xl">
            Your agent is waking up, {name.split(" ")[0] || "there"}.
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {cameForJob === false
              ? "You're all set — explore Arena, connect with people, and join what looks interesting. You can always fill in job details later from your profile."
              : "It will scan openings, apply on your behalf above your match threshold, and propose interview times — always with a chance to review first."}
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
