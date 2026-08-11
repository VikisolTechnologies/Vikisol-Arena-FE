"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createPost } from "@/lib/api/posts";
import type { Post, PostAudience, PostVisibility, VerificationLevel } from "@/lib/types";

const INTENTS: { key: Post["intentType"]; label: string; hint: string }[] = [
  { key: "activity", label: "Activity", hint: "A game, a trek, a meetup - people join you in real life" },
  { key: "ask", label: "Ask", hint: "A question or a need - people respond, you pick who to talk to" },
  { key: "update", label: "Update", hint: "Just a post for the feed - no joining, no room" },
];

/** PART 7.5 "quick type chips ... open the composer preset to that type." `defaultIntent` only
 *  applies as this component's initial state, so a caller that offers multiple quick-chip
 *  presets (e.g. Home's trigger row) should render this with `key={defaultIntent}` to force a
 *  fresh instance per preset rather than relying on a prop-sync effect. */
export function PostComposer({ open, onOpenChange, onPublished, defaultIntent = "activity" }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished: () => void;
  defaultIntent?: Post["intentType"];
}) {
  const router = useRouter();
  const [intent, setIntent] = useState<Post["intentType"]>(defaultIntent);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [location, setLocation] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [audience, setAudience] = useState<PostAudience>("global");
  const [capacity, setCapacity] = useState("");
  const [tags, setTags] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [requiredVerification, setRequiredVerification] = useState<VerificationLevel>("basic");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinable = intent === "activity" || intent === "ask";
  const isActivity = intent === "activity";

  const reset = (nextIntent: Post["intentType"] = defaultIntent) => {
    setIntent(nextIntent); setTitle(""); setBody(""); setLocation(""); setVisibility("public");
    setAudience("global"); setCapacity(""); setTags(""); setStartsAt(""); setMeetingPoint("");
    setRequiredVerification("basic"); setCoords(null); setLocateError(null); setError(null);
  };

  // §5's "own in-the-moment browser Geolocation prompt, independent of account-wide discovery
  // consent" - only ever fires when the author explicitly taps this button, and only the
  // resulting approximate pin (never the raw reading) is ever shown back to anyone, including
  // the author themself.
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocateError("Location isn't available in this browser.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocateError("Couldn't get your location - check permissions and try again.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const publish = async () => {
    if (!body.trim()) return;
    setPublishing(true);
    setError(null);
    try {
      await createPost({
        intentType: intent,
        title: title.trim() || undefined,
        body: body.trim(),
        locationText: location.trim() || undefined,
        audience,
        visibility: joinable ? visibility : "public",
        capacity: joinable && capacity ? Number(capacity) : undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        startsAt: isActivity && startsAt ? new Date(startsAt).toISOString() : undefined,
        lat: isActivity ? coords?.lat : undefined,
        lng: isActivity ? coords?.lng : undefined,
        exactMeetingPoint: isActivity && meetingPoint.trim() ? meetingPoint.trim() : undefined,
        requiredVerificationLevel: isActivity && requiredVerification !== "basic" ? requiredVerification : undefined,
      });
      reset();
      onOpenChange(false);
      onPublished();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't publish that post.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-popover sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New post</DialogTitle>
          <DialogDescription>What do you need, or what do you want to share?</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-1.5">
            {INTENTS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setIntent(key)}
                className={cn(
                  "rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                  intent === key ? "border-primary/60 bg-primary/10 text-primary-soft" : "border-border bg-secondary text-muted-foreground hover:border-primary/40",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">{INTENTS.find((i) => i.key === intent)?.hint}</p>

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="border-border bg-card"
          />

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={intent === "activity" ? "e.g. Badminton at 6pm today, need 2 more for doubles" : intent === "ask" ? "e.g. Anyone used a good invoicing tool for freelance work?" : "What's on your mind?"}
            className="min-h-24 border-border bg-card"
          />

          {isActivity && (
            <>
              <div className="flex items-center gap-2">
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Where (e.g. Gachibowli) - kept general, no exact address"
                  className="border-border bg-card"
                />
                <button
                  type="button"
                  onClick={useMyLocation}
                  disabled={locating}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium transition-colors disabled:opacity-60",
                    coords ? "border-primary/60 bg-primary/10 text-primary-soft" : "border-border bg-secondary text-muted-foreground hover:border-primary/40",
                  )}
                >
                  <LocateFixed className="size-3.5" /> {locating ? "Locating…" : coords ? "Located" : "Use my location"}
                </button>
              </div>
              {locateError && <p className="text-[11px] text-red-400">{locateError}</p>}
              {coords && (
                <p className="text-[11px] text-muted-foreground">
                  Captured - only an approximate, jittered pin will ever be shown to others, never your exact position.
                </p>
              )}

              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="border-border bg-card text-xs"
              />

              <Input
                value={meetingPoint}
                onChange={(e) => setMeetingPoint(e.target.value)}
                placeholder="Exact meeting point (optional) - shown only inside the room to approved joiners"
                className="border-border bg-card"
              />

              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><ShieldCheck className="size-3" /> Who can join needs:</span>
                {(["basic", "phone"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRequiredVerification(v)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                      requiredVerification === v ? "border-primary/60 bg-primary/10 text-primary-soft" : "border-border bg-secondary text-muted-foreground",
                    )}
                  >
                    {v === "basic" ? "No extra check" : "Phone-verified"}
                  </button>
                ))}
              </div>
            </>
          )}

          {joinable && (
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">Who can join:</span>
                {(["public", "approval"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVisibility(v)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                      visibility === v ? "border-primary/60 bg-primary/10 text-primary-soft" : "border-border bg-secondary text-muted-foreground",
                    )}
                  >
                    {v === "public" ? "Anyone" : "I approve"}
                  </button>
                ))}
              </div>
              {intent === "activity" && (
                <Input
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="Spots (optional)"
                  className="h-8 w-28 border-border bg-card text-xs"
                />
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Visible to:</span>
            {(["global", "followers"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAudience(a)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                  audience === a ? "border-primary/60 bg-primary/10 text-primary-soft" : "border-border bg-secondary text-muted-foreground",
                )}
              >
                {a === "global" ? "Everyone" : "Followers only"}
              </button>
            ))}
          </div>

          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags, comma-separated (optional)"
            className="border-border bg-card"
          />

          {error && (
            <p className="text-xs text-red-400">
              {error}
              {/* ARENA-STABILIZE.md Phase 2, G5 - same fix as the post-detail join error: a
                  fresh signup has no date of birth on file, so publishing an Activity 400s with
                  a message pointing at Settings - give them a real way to get there. */}
              {error.toLowerCase().includes("settings") && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => { onOpenChange(false); router.push("/settings"); }}
                    className="font-medium text-primary-soft hover:underline"
                  >
                    Go to Settings
                  </button>
                </>
              )}
            </p>
          )}

          <Button variant="default" size="sm" className="w-full gap-1.5" disabled={!body.trim() || publishing} onClick={publish}>
            <Sparkles className="size-3.5" /> {publishing ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
