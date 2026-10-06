"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowUp, BriefcaseBusiness, ChevronDown, Layers, Lock, MapPin, Plus, ShieldCheck, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { pageSlide, press, rise, spring } from "@/lib/motion";
import { useDirection } from "@/components/motion/useDirection";
import { AppShell } from "@/components/bplus/AppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { Pills, PreviewPill, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { IconBadge } from "@/components/bplus/IconBadge";
import { LockSolid, ShieldSolid, UserCardSolid } from "@/components/bplus/SolidIcons";
import { PaperSwitch } from "@/components/settings/SettingsSheets";
import { IntakeField } from "@/components/intake/IntakeField";
import { JennyOrb } from "@/components/jenny/JennyOrb";
import { MicButton } from "@/components/jenny/JennyParts";
import { getMyProfile } from "@/lib/api/profile";
import { requireOnboarded } from "@/lib/auth-guard";
import { JENNY_PREVIEW, readJobSearch, writeJobSearch, type JobSearchRecipe } from "@/lib/data/jenny";
import { MISSING, answer, careerField, careerValues, rolePhrase, saveCareerAnswer } from "@/lib/jenny/career";
import { problem, type Values } from "@/lib/intake/types";
import type { CandidateProfile } from "@/lib/types";

type Step = "tell" | "draft" | "privacy";
const STEPS: Step[] = ["tell", "draft", "privacy"];

/** VNext "Jenny automates the outcome" 1–3: tell Jenny → the draft from your profile → privacy &
 *  permission. Then /identity/career/automation. Preview only (the v2 recipe isn't built). */
export function JobSearchFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const step = (STEPS.includes(params.get("step") as Step) ? params.get("step") : "tell") as Step;
  const direction = useDirection(STEPS.indexOf(step));
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile).catch(() => setError(true));
  }, [router]);

  if (!JENNY_PREVIEW) {
    return (
      <AppShell tone="light">
        <div className="pt-10"><StateCard kind="empty" title="Job search with Jenny is coming" detail="Set up your career profile and apply yourself — every step is already yours." action={<ButtonLink href="/identity/career">Career profile</ButtonLink>} /></div>
      </AppShell>
    );
  }

  return (
    <AppShell tone={step === "tell" ? undefined : "light"}>
      <div className="-mx-5 -mt-[max(8px,env(safe-area-inset-top))] flex-1 overflow-x-hidden px-5 pb-6 pt-[max(12px,env(safe-area-inset-top))]">
        {error ? (
          <div className="pt-10"><StateCard kind="error" title="Your profile didn't load" detail="Check your connection and try again." /></div>
        ) : !profile ? (
          <div className="space-y-3 pt-12" aria-busy="true" aria-label="Loading">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <m.div key={step} custom={direction} variants={pageSlide} initial="enter" animate="center" exit="exit">
              {step === "tell" && <Tell profile={profile} onYes={() => router.push("/identity/career/jenny?step=draft")} />}
              {step === "draft" && <Draft profile={profile} onContinue={() => router.push("/identity/career/jenny?step=privacy")} />}
              {step === "privacy" && <Privacy profile={profile} onSaved={() => router.push("/identity/career/automation")} />}
            </m.div>
          </AnimatePresence>
        )}
      </div>
    </AppShell>
  );
}

function CloseBar({ title, href = "/agent?tab=automations" }: { title: string; href?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h1 className="font-display-serif text-[28px] font-medium leading-[1.12]">{title}</h1>
      <Link href={href} aria-label="Close" className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full hover:bg-paper-muted">
        <X className="size-6" strokeWidth={1.75} aria-hidden />
      </Link>
    </div>
  );
}

/* ── 1. Tell Jenny ── */
function Tell({ profile, onYes }: { profile: CandidateProfile; onYes: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const [text, setText] = useState(() => `I'm looking for a ${(profile.title || "new").toLowerCase()} job, but keep it private.`);
  // `?say=1` opens on Jenny's reply to the suggested sentence (compare page).
  const [said, setSaid] = useState<string | null>(() => (params.get("say") ? text : null));
  const role = rolePhrase(said ?? "", profile);
  const quiet = /private|quiet|discreet|confidential/i.test(said ?? "");
  const send = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) setSaid(text.trim());
  };
  return (
    <div className="flex min-h-[70svh] flex-col">
      <div className="flex items-center justify-between">
        <h1 className="font-display-serif text-[30px] font-medium">Jenny</h1>
        <PreviewPill />
        <Link href="/agent" aria-label="Close" className="-mr-2 grid size-11 place-items-center rounded-full hover:bg-foreground/5">
          <X className="size-6" strokeWidth={1.75} aria-hidden />
        </Link>
      </div>
      <p className="mt-1 text-[15px] text-faint">Tell Jenny what you&apos;re looking for — in your own words.</p>
      <div className="flex-1 pt-6">
        {said && (
          <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ml-auto flex max-w-[88%] items-end gap-2">
            <p className="rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-white">{said}</p>
            <Avatar name={profile.name} className="size-8 text-[12px]" />
          </m.div>
        )}
      </div>
      <div aria-hidden className="h-[calc(64px+76px+env(safe-area-inset-bottom))]" />
      <form onSubmit={send} className="sticky bottom-0 mt-6 flex items-center gap-2 bg-background py-2">
        <div className="flex h-12 min-w-0 flex-1 items-center rounded-full border border-field-line bg-surface pl-4 pr-0.5 focus-within:border-primary">
          <label className="sr-only" htmlFor="tell-jenny-job">What are you looking for?</label>
          <input id="tell-jenny-job" value={text} onChange={(e) => setText(e.target.value)} className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none" />
          <MicButton onText={(t) => setText(t)} />
        </div>
        <m.button type="submit" whileTap={press} transition={spring.snappy} disabled={!text.trim()} aria-label="Send" className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-white disabled:opacity-45">
          <ArrowUp className="size-5" strokeWidth={2.4} aria-hidden />
        </m.button>
      </form>

      <BottomSheet open={!!said} onClose={() => setSaid(null)} title="Jenny">
        <div className="flex items-center gap-3 pt-2">
          <JennyOrb size={44} online={false} still />
          <p className="text-[17px] font-semibold">Jenny</p>
        </div>
        <p className="mt-3 text-[17px] leading-relaxed">
          Got it. I can help you find {role} opportunities and handle the repetitive work{quiet ? " — privately" : ""}.
          <br />
          Shall we set this up?
        </p>
        <m.ul initial="hidden" animate="shown" className="mt-4 space-y-3">
          {[
            { icon: UserCardSolid, text: "Use your existing profile" },
            { icon: LockSolid, text: "You control what's shared" },
            { icon: ShieldSolid, text: "No auto-apply — you approve every application" },
          ].map((r, i) => (
            <m.li key={r.text} variants={rise} custom={i} className="flex items-center gap-3 text-[16px]">
              <IconBadge icon={r.icon} tone="ink" size={40} /> {r.text}
            </m.li>
          ))}
        </m.ul>
        <Button className="mt-6" onClick={onYes}>Let&apos;s set it up</Button>
        <button type="button" onClick={() => router.push("/agent")} className="mt-1 flex min-h-11 w-full items-center justify-center text-[16px] font-semibold underline underline-offset-4">Maybe later</button>
      </BottomSheet>
    </div>
  );
}

/* ── 2. Career setup (draft) ── */
function Draft({ profile, onContinue }: { profile: CandidateProfile; onContinue: () => void }) {
  const [values, setValues] = useState<Values>(() => careerValues(profile));
  const [editing, setEditing] = useState<string | null>(null);
  const skills = profile.skills.map((s) => s.name);
  const missing = MISSING.filter((x) => !answer(values, x.id));
  const done = MISSING.filter((x) => answer(values, x.id));
  return (
    <div>
      <CloseBar title="Career setup (draft)" />
      <p className="mt-2 text-[15px] text-paper-ink-muted">I&apos;ve used your existing profile to create a draft. Please complete the missing details.</p>

      <section className="mt-5" aria-label="From your profile">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold">From your profile</h2>
          <Link href="/identity/career?step=setup" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-primary-on-paper">Edit</Link>
        </div>
        <ul className="divide-y divide-paper-ink/10 rounded-tile bg-surface px-4 ring-1 ring-paper-ink/10">
          <Fact icon={BriefcaseBusiness} title={profile.title || "Add your title"} detail={answer(values, "years") ? `${answer(values, "years")} experience` : "Experience not added"} />
          <Fact icon={Layers} title={skills.length ? skills.slice(0, 3).join(", ") : "No skills yet"} detail={skills.length > 3 ? `+${skills.length - 3} more` : undefined} />
          <Fact icon={MapPin} title={`${profile.homeCity || "Your area"} (not shared)`} detail={answer(values, "modes") ? `Open to ${answer(values, "modes").toLowerCase()}` : undefined} />
          {done.filter((x) => x.id !== "years" && x.id !== "modes").map((x) => <Fact key={x.id} icon={Lock} title={`${x.title}: ${answer(values, x.id)}`} detail="Only you" />)}
        </ul>
      </section>

      {missing.length > 0 && (
        <section className="mt-6" aria-label="We still need a few details">
          <h2 className="text-[18px] font-semibold">We still need a few details</h2>
          <ul className="mt-2 divide-y divide-paper-ink/10 rounded-tile bg-surface px-4 ring-1 ring-paper-ink/10">
            {missing.map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => setEditing(x.id)} className="flex min-h-16 w-full items-center gap-3 py-2 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold">{x.title}</span>
                    <span className="block text-[14px] text-paper-ink-muted">{x.hint}</span>
                  </span>
                  <span className="grid size-8 place-items-center rounded-full border-2 border-primary-on-paper text-primary-on-paper" aria-hidden><Plus className="size-4" strokeWidth={2.5} /></span>
                  <span className="sr-only">Add</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Button className="mt-6" onClick={onContinue}>Continue</Button>
      {missing.length > 0 && <p className="mt-2 text-center text-[13px] text-paper-ink-muted">You can add these later — Jenny will ask before using them.</p>}

      <AnswerSheet id={editing} values={values} onClose={() => setEditing(null)} onSave={(id, v) => (saveCareerAnswer(id, v), setValues((cur) => ({ ...cur, [id]: v })), setEditing(null))} />
    </div>
  );
}

function Fact({ icon: Icon, title, detail }: { icon: typeof MapPin; title: string; detail?: string }) {
  return (
    <li className="flex min-h-16 items-center gap-3 py-2">
      <Icon className="size-5 shrink-0" strokeWidth={1.9} aria-hidden />
      <span className="min-w-0">
        <span className="block text-[16px] font-semibold">{title}</span>
        {detail && <span className="block text-[14px] text-paper-ink-muted">{detail}</span>}
      </span>
    </li>
  );
}

/** One career question in a sheet — the same field (why, lock, validation) as the Career setup form. */
function AnswerSheet({ id, values, onClose, onSave }: { id: string | null; values: Values; onClose: () => void; onSave: (id: string, v: unknown) => void }) {
  const field = id ? careerField(id) : null;
  const [value, setValue] = useState<unknown>(undefined);
  const [touched, setTouched] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  if (id !== seen) {
    setSeen(id);
    setValue(id ? values[id] : undefined);
    setTouched(false);
  }
  const err = field ? problem({ ...field, required: true }, value) : "";
  return (
    <BottomSheet open={!!field} onClose={onClose} title={field?.label ?? "Add a detail"}>
      {field && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!err) onSave(field.id, value);
          }}
          className="pt-4"
        >
          <IntakeField field={field.id === "notice" ? { ...field, showIf: undefined } : field} value={value} onChange={setValue} onBlur={() => setTouched(true)} error={touched ? err : ""} shakeSignal={0} jenny={false} all={values} />
          <Button type="submit" className="mt-6">Save</Button>
        </form>
      )}
    </BottomSheet>
  );
}

/* ── 3. Privacy & permission ── */
type Audience = JobSearchRecipe["fields"][string];
const AUDIENCE_LABEL: Record<Audience, string> = { private: "Private", apply: "People I apply to", employers: "Verified employers" };
const FIELDS: { id: string; label: string; icon: typeof MapPin; def: Audience }[] = [
  { id: "name", label: "Name", icon: UserRound, def: "apply" },
  { id: "headline", label: "Headline", icon: BriefcaseBusiness, def: "apply" },
  { id: "experience", label: "Experience", icon: Layers, def: "apply" },
  { id: "skills", label: "Skills", icon: Layers, def: "apply" },
  { id: "location", label: "Location", icon: MapPin, def: "apply" },
  { id: "compensation", label: "Compensation", icon: Lock, def: "private" },
  { id: "notice", label: "Notice period", icon: Lock, def: "private" },
];

function Privacy({ profile, onSaved }: { profile: CandidateProfile; onSaved: () => void }) {
  const [view, setView] = useState<"fields" | "audience">("fields");
  const [recipe, setRecipe] = useState<JobSearchRecipe>(() => readJobSearch());
  const values = careerValues(profile);
  const of = (id: string): Audience => recipe.fields[id] ?? FIELDS.find((f) => f.id === id)!.def;
  const valueOf: Record<string, string> = {
    name: profile.name,
    headline: profile.title || "Not added",
    experience: answer(values, "years") || "Not added",
    skills: profile.skills.map((s) => s.name).slice(0, 3).join(", ") || "Not added",
    location: `${profile.homeCity || "Your area"} (general area)`,
    compensation: answer(values, "expected") || "Not shared",
    notice: answer(values, "notice") || "Not shared",
  };
  const who = (a: Audience) => FIELDS.filter((f) => of(f.id) === a || (a === "apply" && of(f.id) === "employers")).map((f) => f.label);

  return (
    <div>
      <CloseBar title="Privacy & permission" />
      <p className="mt-2 text-[15px] text-paper-ink-muted">You&apos;re in control. Choose what to share and who can see it.</p>
      <div className="mt-4">
        <Pills label="View" segmented onPaper options={[{ id: "fields", label: "Profile fields" }, { id: "audience", label: "Audience" }]} value={view} onChange={setView} />
      </div>

      {view === "fields" ? (
        <ul className="mt-4 divide-y divide-paper-ink/10 rounded-tile bg-surface px-4 ring-1 ring-paper-ink/10">
          {FIELDS.map((f) => (
            <PrivacyFieldRow key={f.id} icon={f.icon} label={f.label} value={valueOf[f.id]} audience={of(f.id)} onChange={(a) => setRecipe((r) => ({ ...r, fields: { ...r.fields, [f.id]: a } }))} />
          ))}
        </ul>
      ) : (
        <div className="mt-4 space-y-2.5">
          {([["apply", "People you apply to"], ["employers", "Verified employers (when you're open to work)"], ["private", "Only you"]] as const).map(([a, title]) => (
            <section key={a} className="rounded-tile bg-surface p-4 ring-1 ring-paper-ink/10">
              <h2 className="text-[16px] font-semibold">{title}</h2>
              <p className="mt-1 text-[14px] text-paper-ink-muted">{(a === "employers" ? FIELDS.filter((f) => of(f.id) === "employers").map((f) => f.label) : a === "apply" ? who("apply") : who("private")).join(", ") || "Nothing"}</p>
            </section>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-tile bg-surface px-4 ring-1 ring-paper-ink/10">
        <PaperSwitch label="Only share with employers when I approve" detail="Each application shows exactly what goes, before it goes." checked={recipe.approveEachShare} onChange={(v) => setRecipe((r) => ({ ...r, approveEachShare: v }))} />
      </div>
      <p className="mt-3 text-center text-[13px] text-paper-ink-muted">
        You can change these settings anytime in <Link href="/settings" className="underline underline-offset-2">Privacy &amp; data</Link>. Kept on this device until Arena stores per-field choices.
      </p>
      <Button
        className="mt-5"
        onClick={() => {
          writeJobSearch({ ...readJobSearch(), fields: Object.fromEntries(FIELDS.map((f) => [f.id, of(f.id)])), approveEachShare: recipe.approveEachShare });
          onSaved();
        }}
      >
        Save &amp; continue
      </Button>
    </div>
  );
}

/** One field and who sees it. `granular` rows pick an audience (this journey); the plain career
 *  preview uses the same row read-only. */
export function PrivacyFieldRow({ icon: Icon, label, value, audience, onChange }: { icon: typeof MapPin; label: string; value: string; audience: Audience; onChange?: (a: Audience) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="flex min-h-16 items-center gap-3 py-2">
      <Icon className="size-5 shrink-0" strokeWidth={1.9} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{label}</span>
        <span className="block truncate text-[13px] text-paper-ink-muted">{value}</span>
      </span>
      {onChange ? (
        <button type="button" onClick={() => setOpen(true)} aria-label={`${label}: ${AUDIENCE_LABEL[audience]}. Change`} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-paper-ink/25 px-3 text-[13px] font-medium">
          {AUDIENCE_LABEL[audience]} <ChevronDown className="size-4" aria-hidden />
        </button>
      ) : (
        <span className="text-[13px] font-medium">{AUDIENCE_LABEL[audience]}</span>
      )}
      <BottomSheet open={open} onClose={() => setOpen(false)} title={`Who sees ${label.toLowerCase()}`}>
        <h2 className="mt-2 pr-12 font-display-serif text-[24px] font-medium">Who sees your {label.toLowerCase()}?</h2>
        <ul role="radiogroup" aria-label={label} className="mt-3 space-y-1.5">
          {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((a) => (
            <li key={a}>
              <button type="button" role="radio" aria-checked={audience === a} onClick={() => (onChange?.(a), setOpen(false))} className={cn("flex min-h-12 w-full items-center gap-2 rounded-xl px-4 text-left text-[16px]", audience === a ? "bg-primary/10 font-semibold text-primary-on-paper ring-2 ring-primary-on-paper" : "bg-white ring-1 ring-paper-ink/10")}>
                {a === "private" ? <Lock className="size-4" aria-hidden /> : a === "employers" ? <ShieldCheck className="size-4" aria-hidden /> : <BriefcaseBusiness className="size-4" aria-hidden />}
                {AUDIENCE_LABEL[a]}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </li>
  );
}
