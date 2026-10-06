"use client";

import { useEffect, useState } from "react";
import { AccountPage } from "@/components/account/AccountPage";
import { readEditDraft, writeEditDraft, type EditProfileDraft } from "@/components/account/fixtures";
import { Button } from "@/components/bplus/Button";
import { TextField, TextArea } from "@/components/bplus/TextField";
import { Chip } from "@/components/bplus/Controls";
import { PhotoPicker } from "@/components/bplus/PhotoPicker";
import { StateCard } from "@/components/bplus/Primitives";

const AVAIL = ["Weekdays", "Weekends", "Evenings"] as const;
const INTEREST_SUGGESTIONS = ["Running", "Badminton", "Volunteering", "Food", "Yoga", "Reading"];

export default function EditProfilePage() {
  const [draft, setDraft] = useState<EditProfileDraft | null>(null);
  const [saved, setSaved] = useState(false);
  const [interestInput, setInterestInput] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(readEditDraft());
  }, []);

  if (!draft) {
    return (
      <AccountPage title="Edit profile">
        <StateCard kind="empty" title="Loading…" />
      </AccountPage>
    );
  }

  const save = () => {
    writeEditDraft(draft);
    setSaved(true);
    window.dispatchEvent(new Event("arena-entry"));
  };

  const toggleAvail = (a: string) => {
    setDraft((d) => {
      if (!d) return d;
      const has = d.availability.includes(a);
      return { ...d, availability: has ? d.availability.filter((x) => x !== a) : [...d.availability, a] };
    });
  };

  const addInterest = (name: string) => {
    const n = name.trim();
    if (!n || draft.interests.includes(n)) return;
    setDraft({ ...draft, interests: [...draft.interests, n].slice(0, 12) });
    setInterestInput("");
  };

  return (
    <AccountPage title="Edit profile" lede="Help neighbours get to know you. You control what's visible.">
      <StateCard
        kind="empty"
        title="Some fields stay on this device"
        detail="Display name, title, intro, interests and availability need PATCH /profile/me. Area and photo upload use existing calls where available."
      />
      <div className="space-y-5">
        <PhotoPicker
          value={draft.photo ?? null}
          name={draft.displayName || "You"}
          onChange={(photo) => setDraft({ ...draft, photo: photo ?? undefined })}
          label="Profile photo"
        />
        <TextField
          label="Display name"
          labelStyle="stacked"
          value={draft.displayName}
          onChange={(displayName) => setDraft({ ...draft, displayName })}
        />
        <TextField
          label="Title (optional)"
          labelStyle="stacked"
          value={draft.title}
          onChange={(title) => setDraft({ ...draft, title })}
          placeholder="e.g. Neighbour · runner"
        />
        <TextArea
          label="Short intro (optional)"
          value={draft.intro}
          onChange={(intro) => setDraft({ ...draft, intro })}
          maxLength={160}
        />
        <div>
          <p className="mb-2 text-[14px] font-medium text-paper-ink">Interests</p>
          <div className="flex flex-wrap gap-2">
            {draft.interests.map((i) => (
              <Chip key={i} selected onToggle={() => setDraft({ ...draft, interests: draft.interests.filter((x) => x !== i) })}>
                {i}
              </Chip>
            ))}
            {INTEREST_SUGGESTIONS.filter((s) => !draft.interests.includes(s)).map((s) => (
              <Chip key={s} selected={false} onToggle={() => addInterest(s)}>
                {s}
              </Chip>
            ))}
          </div>
          <TextField
            className="mt-3"
            label="Add an interest"
            labelStyle="stacked"
            value={interestInput}
            onChange={setInterestInput}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInterest(interestInput))}
          />
        </div>
        <div>
          <p className="mb-2 text-[14px] font-medium text-paper-ink">Availability</p>
          <div className="flex flex-wrap gap-2">
            {AVAIL.map((a) => (
              <Chip key={a} selected={draft.availability.includes(a)} onToggle={() => toggleAvail(a)}>
                {a}
              </Chip>
            ))}
          </div>
        </div>
        <p className="text-[13px] text-paper-ink-muted">
          Saved fields that Arena can store go to the API; the rest stay on this device until the API supports them.
        </p>
        <Button type="button" onClick={save} success={saved}>
          {saved ? "Saved" : "Save changes"}
        </Button>
      </div>
    </AccountPage>
  );
}
