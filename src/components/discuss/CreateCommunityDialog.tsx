"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCommunity } from "@/lib/api/communities";
import { cn } from "@/lib/utils";
import type { Community } from "@/lib/types";

const EMOJIS = ["💬", "📍", "💼", "🚀", "🏸", "📚", "🎨", "🎮", "🍜", "🎵", "💻", "🌱", "🏠", "✈️", "🐾", "📷"];

/** Start a Discuss community - you become its owner and can pick moderators later. */
export function CreateCommunityDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (community: Community) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("💬");
  const [allowAnonymous, setAllowAnonymous] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = name.trim().length >= 3 && name.trim().length <= 60;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const community = await createCommunity({ name: name.trim(), description: description.trim() || undefined, emoji, allowAnonymous });
      onOpenChange(false);
      setName("");
      setDescription("");
      onCreated(community);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create that community.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-popover sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a community</DialogTitle>
          <DialogDescription>A home for one topic or place. You&apos;ll be its owner and can add moderators.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Icon">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                role="radio"
                aria-checked={emoji === e}
                onClick={() => setEmoji(e)}
                className={cn("flex size-9 items-center justify-center rounded-lg border text-[18px]", emoji === e ? "border-ring bg-secondary" : "border-border")}
              >
                {e}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Hyderabad Home Cooks" className="border-border bg-card" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">What&apos;s it for? (optional)</span>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} placeholder="Recipes, where to buy ingredients, cook-alongs…" className="border-border bg-card" />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-foreground">
            <input type="checkbox" checked={allowAnonymous} onChange={(e) => setAllowAnonymous(e.target.checked)} className="size-4 accent-[var(--primary)]" />
            Let members post anonymously
          </label>
          {error && <p className="text-[12px] text-red-400">{error}</p>}
          <Button type="submit" disabled={!valid || busy}>
            {busy ? "Creating…" : "Create community"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
