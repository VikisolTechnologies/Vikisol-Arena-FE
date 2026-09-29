"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { Check, ChevronRight, Eye, Footprints, Info, MapPin, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { press, rise, spring } from "@/lib/motion";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { Chip, SelectField, Toggle } from "@/components/bplus/Controls";
import { Lede, Title } from "@/components/bplus/Screen";
import { TextArea, TextField } from "@/components/bplus/TextField";
import { PhotoPicker } from "@/components/bplus/PhotoPicker";
import { Avatar } from "@/components/bplus/Avatar";
import { IconBadge, type IconBadgeTone } from "@/components/bplus/IconBadge";
import { BriefcaseSolid, ChatSolid, CompassSolid, LeafSolid, PeopleSolid, PlusSolid, RunnerSolid, StarSolid } from "@/components/bplus/SolidIcons";
import { Burst } from "@/components/bplus/Burst";
import {
  AREAS,
  AVAILABILITY,
  INTENTS,
  INTRO_MAX,
  localOnlyFields,
  readCurrentPosition,
  SUGGESTED_INTERESTS,
  type EntryDraft,
  type EntryIntent,
} from "@/lib/data/onboarding";

type Glyph = typeof RunnerSolid;
type StepProps = { draft: EntryDraft; update: (patch: Partial<EntryDraft>) => void };

/** Board: a solid white glyph in a saturated circle per intent (review A5). */
const INTENT_LOOK: Record<EntryIntent, { icon: Glyph; tone: IconBadgeTone }> = {
  activities: { icon: RunnerSolid, tone: "orange" },
  meet: { icon: PeopleSolid, tone: "green" },
  ask: { icon: ChatSolid, tone: "blue" },
  offer: { icon: StarSolid, tone: "red" },
  job: { icon: BriefcaseSolid, tone: "brown" },
  hire: { icon: PeopleSolid, tone: "blue" },
  projects: { icon: LeafSolid, tone: "green" },
  explore: { icon: CompassSolid, tone: "slate" },
};

function Footer({ children }: { children: ReactNode }) {
  return <div className="mt-auto pt-8">{children}</div>;
}

function SectionLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-[15px] font-semibold text-foreground">{children}</h2>
      {hint && <p className="mt-0.5 text-[13px] text-faint">{hint}</p>}
    </div>
  );
}

/* ───────────────────────── 1. Why are you here? ───────────────────────── */

function IntentTile({ id, on, onToggle }: { id: EntryIntent; on: boolean; onToggle: () => void }) {
  const meta = INTENTS.find((i) => i.id === id)!;
  const { icon, tone } = INTENT_LOOK[id];
  return (
    <m.button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      whileTap={press}
      transition={spring.snappy}
      className={cn(
        "relative flex h-full min-h-[124px] w-full flex-col items-start rounded-tile bg-paper p-3.5 text-left text-paper-ink outline-none ring-offset-2 ring-offset-background transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-primary",
        on && "ring-2 ring-primary",
      )}
    >
      <IconBadge icon={icon} tone={tone} />
      <span className="mt-3 text-[16px] font-semibold leading-tight">{meta.label}</span>
      <span className="mt-1 text-[13px] leading-snug text-paper-ink-muted">{meta.detail}</span>
      <AnimatePresence>
        {on && (
          <m.span
            key="check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={spring.snappy}
            className="absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-full bg-primary text-white"
            aria-hidden
          >
            <Check className="size-3.5" strokeWidth={3} />
          </m.span>
        )}
      </AnimatePresence>
    </m.button>
  );
}

export function IntentStep({ draft, update, onContinue }: StepProps & { onContinue: () => void }) {
  const toggle = (id: EntryIntent) => {
    const on = draft.intents.includes(id);
    // "Explore first" is exclusive: it means "none of these yet".
    if (id === "explore") return update({ intents: on ? [] : ["explore"] });
    const rest = draft.intents.filter((i) => i !== "explore" && i !== id);
    update({ intents: on ? rest : [...rest, id] });
  };
  return (
    <>
      <Title className="mt-3">Why are you here?</Title>
      <Lede>Choose as many as you like. You can change this anytime.</Lede>
      <m.div initial="hidden" animate="shown" className="mt-6 grid grid-cols-2 gap-3" role="group" aria-label="What you came for">
        {INTENTS.map((intent, i) => (
          <m.div key={intent.id} variants={rise} custom={i}>
            <IntentTile id={intent.id} on={draft.intents.includes(intent.id)} onToggle={() => toggle(intent.id)} />
          </m.div>
        ))}
      </m.div>
      <Footer>
        <Button onClick={onContinue}>{draft.intents.includes("explore") ? "Go to Arena" : "Continue"}</Button>
      </Footer>
    </>
  );
}

/* ───────────────────────── 2. Set up your local life ───────────────────────── */

/** "+ Add another interest": a dashed chip that becomes a small inline field. */
function AddChip({ label, onAdd }: { label: string; onAdd: (value: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const commit = () => {
    const v = value.trim().replace(/\s+/g, " ");
    if (v) onAdd(v.slice(0, 30));
    setValue("");
    setEditing(false);
  };
  if (editing) {
    return (
      <input
        autoFocus
        aria-label={label}
        value={value}
        maxLength={30}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            setValue("");
            setEditing(false);
          }
        }}
        placeholder="Type and press Enter"
        className="h-9 w-48 rounded-full border border-primary bg-surface px-3.5 text-[14px] text-foreground outline-none placeholder:text-faint"
      />
    );
  }
  return (
    <m.button
      type="button"
      onClick={() => setEditing(true)}
      whileTap={press}
      transition={spring.snappy}
      className="relative inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-field-line px-3.5 text-[14px] font-medium text-foreground/90 outline-none after:absolute after:-inset-y-1 after:inset-x-0 hover:border-foreground/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Plus className="size-4" strokeWidth={2} aria-hidden />
      {label}
    </m.button>
  );
}

function InterestPicker({ draft, update, addLabel, onlySelected }: StepProps & { addLabel: string; onlySelected?: boolean }) {
  const custom = draft.interests.filter((i) => !(SUGGESTED_INTERESTS as readonly string[]).includes(i));
  const all = onlySelected ? draft.interests : [...SUGGESTED_INTERESTS, ...custom];
  const toggle = (i: string) => update({ interests: draft.interests.includes(i) ? draft.interests.filter((x) => x !== i) : [...draft.interests, i] });
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Interests">
      {all.map((i) => (
        <Chip key={i} selected={draft.interests.includes(i)} onToggle={() => toggle(i)}>
          {i}
        </Chip>
      ))}
      <AddChip label={addLabel} onAdd={(v) => !draft.interests.includes(v) && update({ interests: [...draft.interests, v] })} />
    </div>
  );
}

export function LocalLifeStep({ draft, update, onContinue }: StepProps & { onContinue: () => void }) {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  // Board: the area starts on the launch area; the person can change it.
  useEffect(() => {
    if (!draft.area) update({ area: AREAS[0] });
  }, [draft.area, update]);

  const toggleLocation = async (on: boolean) => {
    setLocationError("");
    if (!on) return update({ useCurrentLocation: false });
    update({ useCurrentLocation: true });
    setLocating(true);
    try {
      await readCurrentPosition();
    } catch (err) {
      update({ useCurrentLocation: false });
      setLocationError(err instanceof Error ? err.message : "Location wasn't shared.");
    } finally {
      setLocating(false);
    }
  };

  return (
    <>
      <Title className="mt-3">Set up your local life</Title>
      <Lede>Help us show you what&apos;s nearby and relevant.</Lede>

      <div className="mt-7">
        <SelectField label="Your area" value={draft.area} onChange={(area) => update({ area })} options={AREAS} placeholder="Choose your area" icon={MapPin} />
      </div>

      <div className="mt-7">
        <SectionLabel hint="Choose a few to get better suggestions.">Your interests</SectionLabel>
        <InterestPicker draft={draft} update={update} addLabel="Add another interest" />
      </div>

      <div className="mt-7">
        <SectionLabel>Location (optional)</SectionLabel>
        <Toggle
          checked={draft.useCurrentLocation}
          onChange={(on) => void toggleLocation(on)}
          label="Use my current location"
          icon={<MapPin className="size-5 shrink-0 text-faint" strokeWidth={1.75} aria-hidden />}
          description={
            locating ? (
              <p className="text-[13px] text-faint" role="status">
                Asking your browser…
              </p>
            ) : locationError ? (
              <p className="text-[13px] text-danger" role="alert">
                {locationError}
              </p>
            ) : null
          }
        />
        <p className="mt-3 flex gap-2 text-[13px] leading-relaxed text-faint">
          <Info className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          Your location is private and only used to show relevant local suggestions.
        </p>
      </div>

      <Footer>
        <Button onClick={onContinue}>Continue</Button>
      </Footer>
    </>
  );
}

/* ───────────────────────── 3. Your identity ───────────────────────── */

export function IdentityStep({
  draft,
  update,
  accountName,
  onSave,
  saving,
  saveError,
}: StepProps & { accountName: string; onSave: () => Promise<void>; saving: boolean; saveError: string }) {
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [shakeSignal, setShake] = useState(0);

  // Start from the name on the account — never an invented one.
  useEffect(() => {
    if (!draft.displayName && accountName) update({ displayName: accountName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountName]);

  const nameError = !draft.displayName.trim() ? "Enter the name people will see." : "";
  const localOnly = localOnlyFields(draft, accountName).filter((f) => f !== "why you're here");

  const submit = () => {
    setSubmitted(true);
    if (nameError) {
      setShake((s) => s + 1);
      document.getElementById("identity-name")?.focus();
      return;
    }
    void onSave();
  };

  return (
    <>
      <Title className="mt-3">Your identity</Title>
      <Lede>Help neighbors get to know you. You control what&apos;s visible.</Lede>

      <div className="mt-6">
        <PhotoPicker value={draft.photo} name={draft.displayName || accountName} onChange={(photo) => update({ photo })} />
      </div>

      <div className="mt-6 space-y-5">
        <TextField
          id="identity-name"
          labelStyle="stacked"
          label="Display name *"
          placeholder="e.g. Priya Sharma"
          autoComplete="name"
          value={draft.displayName}
          onChange={(displayName) => update({ displayName })}
          onBlur={() => setTouched(true)}
          error={touched || submitted ? nameError : ""}
          shakeSignal={shakeSignal}
          aria-required
        />
        <TextField
          id="identity-title"
          labelStyle="stacked"
          label="Professional title (optional)"
          placeholder="e.g. Designer, Student, Consultant"
          autoComplete="organization-title"
          value={draft.title}
          onChange={(title) => update({ title })}
        />
        <TextArea label="Short intro (optional)" placeholder="Tell us a bit about yourself…" value={draft.intro} onChange={(intro) => update({ intro })} maxLength={INTRO_MAX} />
      </div>

      <div className="mt-6">
        <SectionLabel>Your interests</SectionLabel>
        <InterestPicker draft={draft} update={update} addLabel="Add interests" onlySelected />
      </div>

      <div className="mt-6">
        <SectionLabel>Availability (optional)</SectionLabel>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Availability">
          {AVAILABILITY.map((a) => (
            <Chip
              key={a}
              selected={draft.availability.includes(a)}
              onToggle={() => update({ availability: draft.availability.includes(a) ? draft.availability.filter((x) => x !== a) : [...draft.availability, a] })}
            >
              {a}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-4">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <Eye className="size-5 text-faint" strokeWidth={1.75} aria-hidden />
          What people can see
        </p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-faint">
          Your name, photo, intro, interests and approximate area. You can edit or hide these anytime.
        </p>
        {localOnly.length > 0 && (
          <p className="mt-2 text-[13px] leading-relaxed text-foreground/80">
            For now your {listFormat(localOnly)} stay on this device — Arena can&apos;t store {localOnly.length > 1 ? "them" : "it"} yet.
          </p>
        )}
      </div>

      <Footer>
        <AnimatePresence initial={false}>
          {saveError && (
            <m.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="mb-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">
              {saveError}
            </m.p>
          )}
        </AnimatePresence>
        <Button onClick={submit} loading={saving}>
          Continue
        </Button>
      </Footer>
    </>
  );
}

function listFormat(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/* ───────────────────────── 4. You're all set ───────────────────────── */

const NEXT_STEPS: { href: string; title: string; detail: string; icon: Glyph; tone: IconBadgeTone }[] = [
  { href: "/discover", title: "Join a nearby activity", detail: "Sports, events and more", icon: RunnerSolid, tone: "orange" },
  { href: "/discover", title: "Explore people", detail: "Find neighbors with shared interests", icon: PeopleSolid, tone: "blue" },
  { href: "/home?create=need", title: "Post a need", detail: "Get help from your community", icon: PlusSolid, tone: "green" },
];

export function ReadyStep({ draft, accountName, onEdit }: { draft: EntryDraft; accountName: string; onEdit: () => void }) {
  const name = draft.displayName.trim() || accountName || "You";
  const firstIntent = INTENTS.find((i) => draft.intents.includes(i.id) && i.id !== "explore");
  const area = draft.area || (draft.useCurrentLocation ? "Your current area" : "");

  return (
    <>
      {/* Bursts from the (now full) step dots in the top bar above. */}
      <div className="pointer-events-none relative -mt-14 h-14" aria-hidden>
        <Burst />
      </div>
      <Title className="mt-3">You&apos;re all set!</Title>
      <Lede>Welcome to Arena. Let&apos;s make something good happen nearby.</Lede>

      <m.div initial="hidden" animate="shown">
        <m.div variants={rise} custom={1} className="relative mt-6 rounded-[var(--radius-card)] bg-paper p-4 text-paper-ink">
          <div className="flex items-start gap-3">
            <Avatar src={draft.photo} name={name} className="size-14" />
            <div className="min-w-0 flex-1 pr-14">
              <p className="truncate text-[17px] font-semibold">{name}</p>
              {area && (
                <p className="mt-0.5 flex items-center gap-1 text-[13px] text-paper-ink-muted">
                  <MapPin className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                  {area}
                </p>
              )}
              {firstIntent && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-[12px] font-medium text-paper-ink">
                  <Footprints className="size-3.5 text-success" strokeWidth={2} aria-hidden />
                  Joined for {firstIntent.joined}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="absolute right-3 top-3 h-8 rounded-full bg-paper-muted px-3.5 text-[13px] font-semibold text-paper-ink outline-none after:absolute after:-inset-1.5 focus-visible:outline-2 focus-visible:outline-primary"
          >
            Edit
          </button>
          {draft.intro.trim() && <p className="mt-3 font-display-serif text-[15px] italic leading-relaxed text-paper-ink">“{draft.intro.trim()}”</p>}
        </m.div>

        <m.h2 variants={rise} custom={2} className="mt-7 text-[17px] font-semibold text-foreground">
          Recommended next steps
        </m.h2>
        <div className="mt-3 space-y-2.5">
          {NEXT_STEPS.map((s, i) => (
            <m.div key={s.title} variants={rise} custom={3 + i}>
              <NextStepRow {...s} />
            </m.div>
          ))}
          <m.div variants={rise} custom={6}>
            <Link
              href="/identity"
              className="flex items-center gap-3 rounded-tile border border-line bg-surface p-3.5 outline-none focus-visible:outline-2 focus-visible:outline-primary"
            >
              <IconBadge icon={BriefcaseSolid} tone="slate" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-foreground">Looking for work later?</span>
                <span className="block text-[13px] leading-snug text-faint">Open it anytime from your Profile. You can add your work goals when you&apos;re ready.</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-faint" strokeWidth={1.75} aria-hidden />
            </Link>
          </m.div>
        </div>
      </m.div>

      <Footer>
        <ButtonLink href="/home">Go to Arena</ButtonLink>
      </Footer>
    </>
  );
}

function NextStepRow({ href, title, detail, icon, tone }: (typeof NEXT_STEPS)[number]) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-tile bg-paper p-3.5 text-paper-ink outline-none transition-transform duration-120 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      <IconBadge icon={icon} tone={tone} />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="block text-[13px] text-paper-ink-muted">{detail}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-paper-ink-muted" strokeWidth={1.75} aria-hidden />
    </Link>
  );
}
