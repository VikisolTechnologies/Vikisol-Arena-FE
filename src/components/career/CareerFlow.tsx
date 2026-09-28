"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, Briefcase, Building2, ChevronDown, ChevronRight, Eye, FileUp, HandHeart, Plus, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { pageSlide, rise, vibrate } from "@/lib/motion";
import { useDirection } from "@/components/motion/useDirection";
import { AppShell } from "@/components/bplus/AppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { Button } from "@/components/bplus/Button";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Skeleton, StateCard } from "@/components/bplus/Primitives";
import { PaperInput, PaperSelect } from "@/components/needs/PaperFields";
import { PaperSwitch } from "@/components/settings/SettingsSheets";
import { getMyProfile, updateMyConsent, updateMyProfileDetails, updateMyResume, updateMySkills } from "@/lib/api/profile";
import { signOut } from "@/lib/api/auth";
import { requireOnboarded } from "@/lib/auth-guard";
import { EMPTY_CAREER, EXPERIENCE, NOTICE, experienceBand, openToFor, readCareerDraft, writeCareerDraft, type CareerDraft, type CareerIntent, type WorkMode } from "@/lib/data/career";
import type { CandidateProfile } from "@/lib/types";

type Step = "intent" | "setup" | "privacy";
const STEPS: Step[] = ["intent", "setup", "privacy"];
type Icon = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;

const INTENTS: { id: CareerIntent | "hire"; title: string; detail: string; icon: Icon; disc: string }[] = [
  { id: "find", title: "Find a job", detail: "Explore and apply to local opportunities", icon: Briefcase, disc: "bg-primary" },
  { id: "quiet", title: "Explore quietly", detail: "Look around without showing intent", icon: Eye, disc: "bg-info" },
  { id: "offer", title: "Offer my skills", detail: "Let people know how I can help", icon: HandHeart, disc: "bg-success" },
  { id: "hire", title: "Hire locally", detail: "Find and connect with talent in your area", icon: Building2, disc: "bg-info" },
];

/** Board "Open the career layer" screens 2–4: intent → job preferences → privacy preview →
 *  publish. One identity: nothing here creates a second account. */
export function CareerFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const step = (STEPS.includes(params.get("step") as Step) ? params.get("step") : "intent") as Step;
  const direction = useDirection(STEPS.indexOf(step));
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [error, setError] = useState(false);
  // The flow renders after the profile loads (client only), so the draft read can't mismatch.
  const [draft, setDraft] = useState<CareerDraft>(() => readCareerDraft() ?? EMPTY_CAREER);
  const [resume, setResume] = useState<File | null>(null);
  const [hireOpen, setHireOpen] = useState(false);
  const seeded = useRef(false);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile()
      .then((p) => {
        setProfile(p);
        if (seeded.current) return;
        seeded.current = true;
        // Start from what's already saved on the account.
        setDraft((d) => ({
          ...d,
          role: d.role || p.title || "",
          skills: d.skills.length ? d.skills : p.skills.map((s) => s.name),
          experience: d.experience || experienceBand(p.experienceYears),
          locations: d.locations.length ? d.locations : (p.preferredLocation ?? "").split(",").map((s) => s.trim()).filter(Boolean),
          expectedCtc: d.expectedCtc || (p.expectedCtc ? String(p.expectedCtc) : ""),
          openToWork: d.intent ? d.openToWork : p.consent.searchableByEnterprises,
        }));
      })
      .catch(() => setError(true));
  }, [router]);

  useEffect(() => {
    writeCareerDraft(draft);
  }, [draft]);

  const go = (s: Step) => router.push(`/identity/career?step=${s}`);
  const update = (patch: Partial<CareerDraft>) => setDraft((d) => ({ ...d, ...patch }));

  if (error) {
    return (
      <AppShell>
        <div className="pt-10"><StateCard kind="error" title="Your profile didn't load" detail="Check your connection and try again." /></div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="-mx-5 -mt-[max(8px,env(safe-area-inset-top))] flex-1 overflow-x-hidden bg-paper px-5 pb-6 pt-[max(12px,env(safe-area-inset-top))] text-paper-ink">
        <div className="flex items-center justify-between">
          {step === "intent" ? <span /> : (
            <button type="button" onClick={() => router.back()} aria-label="Back" className="-ml-2.5 grid size-11 place-items-center rounded-full hover:bg-paper-muted">
              <ArrowLeft className="size-6" strokeWidth={1.75} aria-hidden />
            </button>
          )}
          <Link href="/identity" aria-label="Close" className="-mr-2 grid size-11 place-items-center rounded-full hover:bg-paper-muted">
            <X className="size-6" strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
        {!profile ? (
          <div className="space-y-3 pt-4" aria-busy="true" aria-label="Loading">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <m.div key={step} custom={direction} variants={pageSlide} initial="enter" animate="center" exit="exit">
              {step === "intent" && (
                <IntentStep
                  value={draft.intent}
                  onChoose={(id) => {
                    if (id === "hire") return setHireOpen(true);
                    update({ intent: id, openToWork: id === "quiet" ? false : draft.openToWork });
                  }}
                  onContinue={() => go("setup")}
                />
              )}
              {step === "setup" && <SetupStep draft={draft} update={update} resume={resume} onResume={setResume} existingResume={profile.resumeFileName} onContinue={() => go("privacy")} />}
              {step === "privacy" && <PrivacyStep draft={draft} update={update} profile={profile} resume={resume} onPublished={(p) => { setProfile(p); writeCareerDraft(null); vibrate(); router.replace("/jobs?published=1"); }} />}
            </m.div>
          </AnimatePresence>
        )}
      </div>
      <BottomSheet open={hireOpen} onClose={() => setHireOpen(false)} title="Hire locally">
        <h2 className="mt-3 pr-12 font-display-serif text-[26px] font-medium">Hiring uses a company account</h2>
        <p className="mt-2 text-[15px] text-paper-ink-muted">Company accounts post jobs and review candidates with a verified workspace. Your personal profile stays exactly as it is — create the company account with your work email.</p>
        <div className="mt-6 space-y-2">
          <Button onClick={() => void signOut().then(() => router.replace("/auth?mode=signup"))}>Sign out and create one</Button>
          <Button variant="outline" className="border-paper-ink/55 text-paper-ink" onClick={() => setHireOpen(false)}>Not now</Button>
        </div>
      </BottomSheet>
    </AppShell>
  );
}

function IntentStep({ value, onChoose, onContinue }: { value: CareerIntent | null; onChoose: (id: CareerIntent | "hire") => void; onContinue: () => void }) {
  return (
    <div>
      <h1 className="mt-2 font-display-serif text-[30px] font-medium leading-[1.12]">What do you want to do with your career on Arena?</h1>
      <p className="mt-2 text-[15px] text-paper-ink-muted">Choose an option. You can change this anytime.</p>
      <m.ul initial="hidden" animate="shown" role="radiogroup" aria-label="Career intent" className="mt-6 space-y-3">
        {INTENTS.map((o, i) => {
          const on = value === o.id;
          return (
            <m.li key={o.id} variants={rise} custom={i}>
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
            </m.li>
          );
        })}
      </m.ul>

      <Button className="mt-6" disabled={!value} onClick={onContinue}>Continue</Button>
    </div>
  );
}

function ChipAdder({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (!v || values.some((x) => x.toLowerCase() === v.toLowerCase())) return setText("");
    onChange([...values, v].slice(0, 20));
    setText("");
  };
  return (
    <div>
      <p className="mb-2 text-[15px] font-semibold" id={`${label}-l`}>{label}</p>
      {values.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2" aria-labelledby={`${label}-l`}>
          {values.map((v) => (
            <li key={v} className="inline-flex h-9 items-center gap-1 rounded-full bg-white pl-3.5 pr-1 text-[14px] ring-1 ring-paper-ink/15">
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="grid size-8 place-items-center rounded-full hover:bg-paper-muted">
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`${label}-i`}>{`Add to ${label}`}</label>
        <input
          id={`${label}-i`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          maxLength={40}
          placeholder={placeholder}
          className="h-[52px] min-w-0 flex-1 rounded-button border border-field-line bg-white px-4 text-[16px] outline-none placeholder:text-paper-ink-muted focus:border-primary-on-paper"
        />
        <button type="button" onClick={add} aria-label={`Add to ${label}`} className="grid size-[52px] shrink-0 place-items-center rounded-button border border-field-line bg-white">
          <Plus className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

const MODES: { id: WorkMode; label: string }[] = [
  { id: "any", label: "Any" },
  { id: "onsite", label: "On-site" },
  { id: "hybrid", label: "Hybrid" },
  { id: "remote", label: "Remote" },
];

function SetupStep({ draft, update, resume, onResume, existingResume, onContinue }: { draft: CareerDraft; update: (p: Partial<CareerDraft>) => void; resume: File | null; onResume: (f: File | null) => void; existingResume?: string; onContinue: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(0);
  const roleError = draft.role.trim().length < 2 ? "Add the role you're looking for." : "";
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted((n) => n + 1);
        if (!roleError) onContinue();
      }}
    >
      <h1 className="mt-2 font-display-serif text-[30px] font-medium leading-[1.12]">Set up your job preferences</h1>
      <p className="mt-2 text-[15px] text-paper-ink-muted">This helps show you relevant opportunities. You can edit anytime.</p>
      <div className="mt-6 space-y-5">
        <PaperInput label="Desired role" value={draft.role} onChange={(v) => update({ role: v })} maxLength={80} placeholder="e.g. Product Designer" error={submitted ? roleError : ""} shakeSignal={submitted} />
        <ChipAdder label="Key skills" values={draft.skills} onChange={(skills) => update({ skills })} placeholder="e.g. Figma, UX research" />
        <PaperSelect label="Experience level" value={draft.experience} onChange={(v) => update({ experience: v })} options={EXPERIENCE} placeholder="Select experience" />
        <fieldset>
          <legend className="mb-2 text-[15px] font-semibold">Preferred work mode</legend>
          <div className="grid grid-cols-4 gap-1.5 rounded-full bg-white p-1 ring-1 ring-paper-ink/15" role="radiogroup">
            {MODES.map((mo) => (
              <button key={mo.id} type="button" role="radio" aria-checked={draft.workMode === mo.id} onClick={() => update({ workMode: mo.id })} className={cn("h-10 rounded-full text-[14px] font-semibold", draft.workMode === mo.id ? "bg-primary text-paper-ink" : "text-paper-ink")}>
                {mo.label}
              </button>
            ))}
          </div>
        </fieldset>
        <ChipAdder label="Preferred locations" values={draft.locations} onChange={(locations) => update({ locations })} placeholder="e.g. Gachibowli" />
        <PaperInput label="Expected pay, LPA (optional)" value={draft.expectedCtc} onChange={(v) => update({ expectedCtc: v.replace(/[^\d.]/g, "") })} inputMode="numeric" placeholder="e.g. 12" hint="Only used to match you. Never shown on your profile." />
        <PaperSelect label="Notice period (optional)" value={draft.notice} onChange={(v) => update({ notice: v })} options={NOTICE.map((n) => ({ value: n, label: n }))} placeholder="Select notice period" />
        <div>
          <p className="mb-2 text-[15px] font-semibold">Resume (optional)</p>
          <button type="button" onClick={() => file.current?.click()} className="flex min-h-16 w-full items-center gap-3 rounded-button border border-dashed border-field-line bg-white px-4 text-left">
            <FileUp className="size-6 shrink-0 text-paper-ink-muted" strokeWidth={1.75} aria-hidden />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold">{resume ? resume.name : existingResume ? `Replace ${existingResume}` : "Upload resume (PDF, DOC)"}</span>
              <span className="block text-[13px] text-paper-ink-muted">You can also apply without a resume.</span>
            </span>
          </button>
          <input ref={file} type="file" accept=".pdf,.doc,.docx,application/pdf" hidden onChange={(e) => { onResume(e.target.files?.[0] ?? null); e.target.value = ""; }} />
        </div>
        <p className="text-[13px] text-paper-ink-muted">Work mode and notice period stay on this device for now; everything else saves to your account when you publish.</p>
      </div>
      <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-10 -mx-5 mt-6 bg-linear-to-t from-paper from-80% to-transparent px-5 pb-2 pt-3">
        <Button type="submit">Continue</Button>
      </div>
    </form>
  );
}

function Reveal({ title, items, defaultOpen = false }: { title: string; items: string[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-tile bg-paper-muted">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex min-h-14 w-full items-center gap-3 px-4 text-left">
        <Users className="size-5 shrink-0 text-info-on-paper" aria-hidden />
        <span className="flex-1 text-[16px] font-semibold">{title}</span>
        <ChevronDown className={cn("size-5 transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul className="space-y-1.5 px-4 pb-4 pl-12 text-[14px]">
          {items.map((i) => (
            <li key={i} className="list-disc">{i}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PrivacyStep({ draft, update, profile, resume, onPublished }: { draft: CareerDraft; update: (p: Partial<CareerDraft>) => void; profile: CandidateProfile; resume: File | null; onPublished: (p: CandidateProfile) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const publish = async () => {
    setBusy(true);
    setError("");
    try {
      const years = Number(draft.experience || profile.experienceYears || 0);
      const ctc = Number(draft.expectedCtc);
      let p = await updateMyProfileDetails({
        name: profile.name,
        title: draft.role.trim(),
        industry: profile.industry,
        experienceYears: years,
        rateFloor: profile.rateFloor,
        openTo: openToFor(draft.intent),
        cameForJob: true,
        organization: profile.organization,
        currentCtc: profile.currentCtc,
        expectedCtc: Number.isFinite(ctc) && ctc > 0 ? ctc : profile.expectedCtc,
        preferredLocation: draft.locations.join(", ") || profile.preferredLocation,
      });
      if (draft.skills.length) p = await updateMySkills(draft.skills);
      if (resume) p = await updateMyResume({ file: resume });
      p = await updateMyConsent({ ...p.consent, searchableByEnterprises: draft.openToWork });
      onPublished(p);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "That didn't publish. Your choices are still here — try again.");
      setBusy(false);
    }
  };
  const employerItems = ["Your name and title", "Skills and experience", "Preferred locations", resume || profile.resumeFileName ? "Your resume" : "Resume (if you upload one)"];
  return (
    <div>
      <h1 className="mt-2 font-display-serif text-[30px] font-medium leading-[1.12]">Preview your visibility</h1>
      <p className="mt-2 text-[15px] text-paper-ink-muted">What different people see. You decide what to share.</p>
      <div className="mt-5 flex items-center gap-3.5 rounded-tile bg-white p-4 ring-1 ring-paper-ink/10">
        <Avatar name={profile.name} className="size-14 text-[18px]" />
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold">{profile.name}</p>
          <p className="truncate text-[14px] text-paper-ink-muted">{[draft.role || profile.title, profile.homeCity].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        <Reveal title="What employers see (when open to work)" items={employerItems} defaultOpen />
        <Reveal title="What anyone opening your profile sees" items={["Your name and area", "Title, industry, experience and skills", "Your outcomes on Arena"]} />
        <Reveal title="What never leaves your account" items={["Your exact location", "Expected pay and notice period", "Your job applications"]} />
      </div>
      <div className="mt-5 rounded-tile bg-white px-4 ring-1 ring-paper-ink/10">
        <PaperSwitch label="Open to work" detail={draft.openToWork ? "Verified employers can find you." : "Not visible to employers. Turn on when you're ready."} checked={draft.openToWork} onChange={(v) => update({ openToWork: v })} />
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      <Button className="mt-6" loading={busy} onClick={publish}>Publish career profile</Button>
      <p className="mt-2 text-center text-[13px] text-paper-ink-muted">You can change or hide this anytime in Settings.</p>
    </div>
  );
}
