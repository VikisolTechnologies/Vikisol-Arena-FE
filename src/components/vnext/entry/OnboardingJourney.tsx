"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile, updateMyConsent, updateMyLocation, updateMyProfileDetails, updateMySkills } from "@/lib/api/profile";
import { ApiError } from "@/lib/api/httpClient";
import { getSession, setOnboarded } from "@/lib/session";
import type { Industry } from "@/lib/types";
import { clearEntryPending, EMPTY_DRAFT, INTENTS, readEntryDraft, subscribeEntryDraft, writeEntryDraft, type EntryDraft, type EntryIntent } from "./draft";
import { EntryButton, EntryFrame, fieldClass } from "./EntryFrame";
import { EntryCard, EntryField, IntentOption, PrivacyPreviewCard, ReadySummary } from "./chrome";

const STEPS = 7;
const FIXTURE_AREA = process.env.NEXT_PUBLIC_ENTRY_FIXTURE_AREA;

const INDUSTRIES: Industry[] = ["Engineering", "Design", "Sales", "Healthcare", "Logistics"];

const INTENT_META: Record<EntryIntent, { detail: string; icon: string }> = {
  meet: { detail: "People who are actually around.", icon: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 19c.4-2.4 2.4-4 5-4s4.6 1.6 5 4M13 15.2c1.4-.8 3-.9 4.5-.2 1.6.8 2.6 2.3 2.8 4" },
  activities: { detail: "Games, walks, and gatherings.", icon: "M5 19c2-6 4-9 7-9s5 3 7 9M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" },
  ask: { detail: "A specific request for help.", icon: "M12 18h.01M9.5 9a2.5 2.5 0 1 1 3.8 2.1C12.4 11.7 12 12.3 12 13" },
  offer: { detail: "Something you can do for someone.", icon: "M12 4v16M4 12h16" },
  projects: { detail: "Build something with other people.", icon: "M4 7h16v12H4zM8 7V5h8v2" },
  "explore-work": { detail: "See what work looks like here.", icon: "M4 8h16v10H4zM8 8V6h8v2" },
  job: { detail: "Opportunities stay private until you say so.", icon: "M8 7V5h8v2M4 7h16v12H4z" },
  hire: { detail: "Local people, through a company account.", icon: "M5 19V9l7-4 7 4v10M9 19v-5h6v5" },
};

export function OnboardingJourney() {
  const router = useRouter();
  const draft = useSyncExternalStore(subscribeEntryDraft, readEntryDraft, () => EMPTY_DRAFT);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [interestInput, setInterestInput] = useState("");
  const [offerInput, setOfferInput] = useState("");
  const [careerInput, setCareerInput] = useState("");

  useEffect(() => {
    if (!getSession()) router.replace("/auth?mode=signin");
  }, [router]);

  const save = (next: EntryDraft) => writeEntryDraft(next);

  const toggleIntent = (id: EntryIntent) => {
    const intents = draft.intents.includes(id) ? draft.intents.filter((item) => item !== id) : [...draft.intents, id];
    save({ ...draft, intents });
  };

  const addTag = (field: "interests" | "offerSkills" | "careerSkills", value: string, clear: () => void) => {
    const tag = value.trim();
    if (!tag || draft[field].includes(tag)) return;
    save({ ...draft, [field]: [...draft[field], tag] });
    clear();
  };

  const go = (step: number) => save({ ...draft, step });

  const finish = async () => {
    setError("");
    setSubmitting(true);
    try {
      const skills = [...draft.offerSkills, ...draft.careerSkills];
      if (skills.length > 0) await updateMySkills(skills);
      if (draft.locationChoice === "manual" && draft.area.trim()) {
        await updateMyLocation({ consent: "city", city: draft.area.trim() });
      } else if (draft.locationChoice === "approximate") {
        const coords = await readApproximate();
        await updateMyLocation({ consent: "precise", lat: coords.lat, lng: coords.lng });
      } else if (draft.locationChoice === "none") {
        await updateMyLocation({ consent: "off" });
      }
      await updateMyConsent({ autoApply: false, searchableByEnterprises: draft.careerPublic });
      const profileName = draft.displayName.trim() || getSession()?.name || "";
      const industry = draft.industry as Industry | "";
      if (draft.professionalTitle.trim() && industry && profileName) {
        await updateMyProfileDetails({
          name: profileName,
          title: draft.professionalTitle.trim(),
          industry,
          experienceYears: 0,
          rateFloor: 0,
          openTo: draft.careerPublic && draft.intents.includes("job") ? ["full-time"] : [],
          cameForJob: draft.intents.includes("job"),
          preferredLocation: draft.area.trim() || undefined,
        });
      }
      await getMyProfile();
      setOnboarded();
      clearEntryPending();
      router.push("/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Arena did not save this yet. Your choices are still on this device.");
      setSubmitting(false);
    }
  };

  const step = Math.min(draft.step, STEPS - 1);
  const accountName = getSession()?.name || "You";
  const shownName = draft.displayName.trim() || accountName;

  return (
    <EntryFrame
      title={TITLES[step]}
      lede={LEDES[step]}
      step={step}
      steps={STEPS}
      stepLabel={TITLES[step]}
      footer={
        <div className="mt-6 space-y-3">
          {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
          {step < STEPS - 1 ? (
            <EntryButton onClick={() => go(step + 1)}>Continue</EntryButton>
          ) : (
            <>
              <EntryButton onClick={finish} disabled={submitting}>{submitting ? "Saving…" : "Enter Arena"}</EntryButton>
              <EntryButton tone="ghost" onClick={() => go(1)}>Edit choices</EntryButton>
            </>
          )}
          {step > 0 && step < STEPS - 1 && (
            <button type="button" className="min-h-11 w-full text-sm text-muted-foreground" onClick={() => go(step + 1)}>Skip</button>
          )}
        </div>
      }
    >
      {step === 0 && (
        <EntryCard>
          <p className="text-[15px] leading-relaxed">You can look around first. Nothing here is required, and you can change it later.</p>
        </EntryCard>
      )}
      {step === 1 && (
        <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
          {INTENTS.map((intent) => (
            <IntentOption
              key={intent.id}
              on={draft.intents.includes(intent.id)}
              label={intent.label}
              detail={INTENT_META[intent.id].detail}
              icon={INTENT_META[intent.id].icon}
              onClick={() => toggleIntent(intent.id)}
            />
          ))}
        </div>
      )}
      {step === 2 && (
        <div className="space-y-3">
          <IntentOption on={draft.locationChoice === "approximate"} onClick={() => save({ ...draft, locationChoice: "approximate" })} label="Use approximate location" detail="A rough point, not your address." icon="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
          <IntentOption on={draft.locationChoice === "manual"} onClick={() => save({ ...draft, locationChoice: "manual" })} label="Choose an area manually" detail="Type a neighborhood or district." icon="M4 6h16M4 12h10M4 18h16" />
          <IntentOption on={draft.locationChoice === "none"} onClick={() => save({ ...draft, locationChoice: "none", area: "" })} label="Continue without location" detail="You can add an area later." icon="M5 12h14" />
          {draft.locationChoice === "manual" && (
            <input aria-label="Area" placeholder="Area name" value={draft.area} onChange={(e) => save({ ...draft, area: e.target.value })} className={fieldClass} />
          )}
          {FIXTURE_AREA && (
            <button type="button" className="min-h-11 text-left text-[13px] text-muted-foreground underline" onClick={() => save({ ...draft, locationChoice: "manual", area: FIXTURE_AREA })}>
              Use the labelled development area: {FIXTURE_AREA}
            </button>
          )}
          <p className="text-[13px] leading-relaxed text-muted-foreground">Your exact home location is never public. Approximate means a rough point, not an address.</p>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <TagBox label="Personal interests" hint="Optional. Saved on this device until Arena has a public interests field." value={interestInput} tags={draft.interests} onChange={setInterestInput} onAdd={() => addTag("interests", interestInput, () => setInterestInput(""))} onRemove={(tag) => save({ ...draft, interests: draft.interests.filter((item) => item !== tag) })} />
          <TagBox label="Skills you can offer" hint="Optional. These can be saved to your profile." value={offerInput} tags={draft.offerSkills} onChange={setOfferInput} onAdd={() => addTag("offerSkills", offerInput, () => setOfferInput(""))} onRemove={(tag) => save({ ...draft, offerSkills: draft.offerSkills.filter((item) => item !== tag) })} />
          <TagBox label="Career skills" hint="Optional and private unless you turn career visibility on." value={careerInput} tags={draft.careerSkills} onChange={setCareerInput} onAdd={() => addTag("careerSkills", careerInput, () => setCareerInput(""))} onRemove={(tag) => save({ ...draft, careerSkills: draft.careerSkills.filter((item) => item !== tag) })} />
        </div>
      )}
      {step === 4 && (
        <EntryCard className="space-y-4">
          <EntryField id="display-name" label="Name" autoComplete="name" value={draft.displayName} placeholder={accountName} onChange={(value) => save({ ...draft, displayName: value })} />
          <EntryField id="intro" label="Short introduction" value={draft.intro} onChange={(value) => save({ ...draft, intro: value })} />
          <EntryField id="availability" label="Availability" value={draft.availability} placeholder="Weekdays, weekends, evenings" onChange={(value) => save({ ...draft, availability: value })} />
          <EntryField id="title" label="Professional title" value={draft.professionalTitle} placeholder="Optional" onChange={(value) => save({ ...draft, professionalTitle: value })} />
          {draft.professionalTitle.trim() && (
            <label className="block text-[13px] font-medium">
              Field
              <select aria-label="Field" value={draft.industry} onChange={(e) => save({ ...draft, industry: e.target.value })} className={`${fieldClass} mt-1.5`}>
                <option value="">Choose only if this title should be saved</option>
                {INDUSTRIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          )}
          <p className="text-[13px] leading-relaxed text-muted-foreground">A title is saved only when you also choose a field. Arena will not invent one.</p>
        </EntryCard>
      )}
      {step === 5 && (
        <PrivacyPreviewCard
          name={shownName}
          location={locationLine(draft)}
          skills={draft.offerSkills.length ? `Skills you offered: ${draft.offerSkills.join(", ")}` : "No skills, unless you add them."}
          careerPublic={draft.careerPublic}
          onCareer={(careerPublic) => save({ ...draft, careerPublic })}
        />
      )}
      {step === 6 && (
        <ReadySummary
          intents={draft.intents.map((id) => INTENTS.find((item) => item.id === id)?.label ?? id)}
          location={locationLine(draft)}
          priority={priorityCopy(draft.intents)}
        />
      )}
    </EntryFrame>
  );
}

const TITLES = [
  "Welcome to Arena",
  "What brings you here?",
  "Location and privacy",
  "Interests",
  "Your identity",
  "What people nearby can see",
  "You are ready",
];

const LEDES = [
  "A neighborhood for real things, without a long form.",
  "Choose any that fit. You can change this anytime, and it does not lock you out of the rest.",
  "Exact home location is never public.",
  "All optional. Personal interests, skills you offer, and career skills stay separate.",
  "Name, introduction, availability, and a title are all optional.",
  "This is the public view. Career information stays off until you enable it.",
  "Here is what Arena will look for first.",
];

function TagBox({ label, hint, value, tags, onChange, onAdd, onRemove }: { label: string; hint: string; value: string; tags: string[]; onChange: (value: string) => void; onAdd: () => void; onRemove: (tag: string) => void }) {
  return (
    <EntryCard>
      <p className="text-[13px] font-medium">{label}</p>
      <p className="text-[13px] leading-relaxed text-muted-foreground">{hint}</p>
      <div className="mt-2 flex gap-2">
        <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }} className={fieldClass} />
        <button type="button" className="min-h-11 shrink-0 rounded-2xl border border-border px-3 text-sm" onClick={onAdd}>Add</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button key={tag} type="button" className="min-h-11 rounded-full border border-border px-3 text-sm" onClick={() => onRemove(tag)}>{tag} · remove</button>
        ))}
      </div>
    </EntryCard>
  );
}

function locationLine(draft: EntryDraft) {
  if (draft.locationChoice === "manual" && draft.area.trim()) return `Area you typed: ${draft.area.trim()}`;
  if (draft.locationChoice === "approximate") return "An approximate point, if you allow it when you enter.";
  return "No location.";
}

function priorityCopy(intents: EntryIntent[]) {
  if (intents.length === 0) return "You did not pick a focus, so the feed stays a balanced, honest view of whatever is actually nearby.";
  if (intents.includes("job") && intents.length === 1) return "You asked about work. The feed will show verified opportunities when they exist, and a private career setup when they do not.";
  if (intents.some((id) => id === "ask" || id === "offer")) return "You asked about help. The feed will prefer needs and offers that people have actually posted.";
  if (intents.some((id) => id === "activities" || id === "meet")) return "You asked about people and activities. The feed will prefer those when someone nearby has posted them.";
  return "The feed will follow the choices you made, and stay empty where nothing real has been posted.";
}

function readApproximate(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser cannot share a location. Choose an area or continue without one."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => reject(new Error("Location was not shared. You can type an area or continue without one.")),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  });
}
