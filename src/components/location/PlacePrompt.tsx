"use client";

import { useState } from "react";
import { Button } from "@/components/bplus/Button";
import { StateCard } from "@/components/bplus/Primitives";
import { TextField } from "@/components/bplus/TextField";
import { readCurrentPosition, readEntryDraft, writeEntryDraft } from "@/lib/data/onboarding";
import { updateMyLocation } from "@/lib/api/profile";

/** Shown wherever a map or a nearby list would otherwise have guessed a city. */
export function PlacePrompt({ onSaved }: { onSaved?: () => void }) {
  const [area, setArea] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true);
    setError("");
    try {
      const pos = await readCurrentPosition();
      await updateMyLocation({ consent: "precise", lat: pos.lat, lng: pos.lng });
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Location wasn't shared.");
    } finally {
      setBusy(false);
    }
  };

  const saveArea = async () => {
    const name = area.trim();
    if (!name) return;
    setBusy(true);
    setError("");
    try {
      writeEntryDraft({ ...readEntryDraft(), area: name });
      await updateMyLocation({ consent: "city", city: name });
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That area wasn't saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <StateCard
      kind="empty"
      title="Where should Arena look?"
      detail="Share your location, or type an area. Arena stores only an approximate area, never an exact point."
      action={
        <div className="mx-auto max-w-sm space-y-3 text-left">
          <Button onClick={() => void share()} loading={busy}>Use my location</Button>
          <TextField label="Area" value={area} onChange={setArea} placeholder="Type your area" />
          <Button variant="outline" onClick={() => void saveArea()} disabled={!area.trim() || busy}>Use this area</Button>
          {error && <p role="alert" className="text-center text-[14px] text-danger">{error}</p>}
        </div>
      }
    />
  );
}
