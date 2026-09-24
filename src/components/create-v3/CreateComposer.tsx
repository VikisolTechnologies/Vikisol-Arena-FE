"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, ChevronRight, HelpCircle, LocateFixed, MessageCircle, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ARENA_V3 } from "@/components/home-v3/tokens";
import { createPost } from "@/lib/api/posts";
import type { Post, PostAudience, PostVisibility, VerificationLevel } from "@/lib/types";

type PostIntent = Exclude<Post["intentType"], "company">;
type Step = "pick" | "form";

// ARENA-MOCKUP-REFERENCE.md SCREEN 3 "CREATE" - order and copy are exact: activity, need,
// project-or-job third ("deliberately... the structural reason Arena is not a job board"), then
// update. "A project or job" has no Post form of its own - it hands off to the real posting flow
// at /marketplace (the only place a Project actually gets created), same as Home's empty-state
// suggestion cards already do.
const ROWS: { key: PostIntent | "project"; icon: typeof Users; label: string; description: string }[] = [
  { key: "activity", icon: Users, label: "An activity", description: "Something happening at a time and place" },
  { key: "ask", icon: HelpCircle, label: "A need", description: "Ask for help, skills or people" },
  { key: "project", icon: Briefcase, label: "A project or job", description: "Paid work others can bid on" },
  { key: "update", icon: MessageCircle, label: "An update", description: "Share something with your network" },
];

const PLACEHOLDERS: Record<PostIntent, string> = {
  activity: "e.g. Badminton at 6pm today, need 2 more for doubles",
  ask: "e.g. Anyone used a good invoicing tool for freelance work?",
  update: "What's on your mind?",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 13,
  fontFamily: "inherit",
  color: ARENA_V3.ink,
  background: ARENA_V3.white,
  border: `1px solid ${ARENA_V3.hairline}`,
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none",
};

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: "6px 12px",
        borderRadius: 20,
        cursor: "pointer",
        border: active ? "none" : `1px solid ${ARENA_V3.hairline}`,
        background: active ? ARENA_V3.ink : "transparent",
        color: active ? ARENA_V3.ivory : ARENA_V3.muted,
      }}
    >
      {children}
    </button>
  );
}

/** Replaces the old dark-themed PostComposer for every v3 screen (Home, Map, and the "+"
 *  entry point itself). `initialIntent` set (Home's suggestion cards, an intent-specific
 *  quick-chip) skips straight to the form step; left null, opening shows the SCREEN 3 intent
 *  picker first - this is what the bare "+" in HomeHeader/HomeTabBar was missing.
 *  All internal state (step, drafted fields) is initial-state-only and resets by remounting:
 *  callers must render this with a `key` that changes on every distinct "open" (see HomeContent's
 *  composerSession counter) rather than relying on an effect to reset state on `open`. */
export function CreateComposer({
  open,
  onOpenChange,
  onPublished,
  initialIntent = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished: () => void;
  initialIntent?: PostIntent | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(() => (initialIntent ? "form" : "pick"));
  const [intent, setIntent] = useState<PostIntent>(() => initialIntent ?? "activity");

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

  function pickRow(key: (typeof ROWS)[number]["key"]) {
    if (key === "project") {
      onOpenChange(false);
      router.push("/marketplace");
      return;
    }
    setIntent(key);
    setStep("form");
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocateError("Location isn't available in this browser.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { setLocateError("Couldn't get your location - check permissions and try again."); setLocating(false); },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  async function publish() {
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
      onOpenChange(false);
      onPublished();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't publish that post.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full gap-0 overflow-hidden border-none p-0 sm:max-w-[420px]"
        style={{ background: ARENA_V3.ivory, borderRadius: 20, maxHeight: "88vh", display: "flex", flexDirection: "column" }}
      >
        {step === "pick" ? (
          <div style={{ padding: "18px 0 20px" }}>
            <div style={{ display: "flex", alignItems: "center", padding: "0 18px 6px" }}>
              <button type="button" onClick={() => onOpenChange(false)} style={{ background: "none", border: "none", cursor: "pointer", color: ARENA_V3.ink, padding: 4 }}>
                <X size={20} strokeWidth={1.75} />
              </button>
              <p style={{ flex: 1, textAlign: "center", margin: 0, fontSize: 10, letterSpacing: 3, color: ARENA_V3.muted }}>CREATE</p>
              <span style={{ width: 28 }} />
            </div>

            <div style={{ padding: "26px 18px 0" }}>
              <p style={{ margin: 0, fontFamily: "var(--font-arena-fraunces)", fontSize: 28, lineHeight: 1.25, color: ARENA_V3.ink }}>
                What do you want to start?
              </p>
              <div style={{ width: 40, height: 2, background: ARENA_V3.gold, margin: "16px 0 18px" }} />
            </div>

            <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 9 }}>
              {ROWS.map((row) => (
                <button
                  key={row.key}
                  type="button"
                  onClick={() => pickRow(row.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    width: "100%",
                    textAlign: "left",
                    background: ARENA_V3.white,
                    border: "none",
                    borderRadius: 14,
                    padding: 15,
                    cursor: "pointer",
                  }}
                >
                  <row.icon size={21} strokeWidth={1.5} color={ARENA_V3.ink} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 15, color: ARENA_V3.ink }}>{row.label}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: ARENA_V3.muted }}>{row.description}</p>
                  </div>
                  <ChevronRight size={16} color="#5c5c64" style={{ flexShrink: 0 }} />
                </button>
              ))}
            </div>

            <div style={{ margin: "16px 18px 0", paddingTop: 16, borderTop: `1px solid #DDD3C4`, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${ARENA_V3.gold}`, flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 14, color: "#a1a1aa" }}>Not sure how to put it? Start typing and I&apos;ll help you write it.</p>
            </div>
          </div>
        ) : (
          <div style={{ overflowY: "auto", padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => (initialIntent ? onOpenChange(false) : setStep("pick"))}
                style={{ background: "none", border: "none", cursor: "pointer", color: ARENA_V3.ink, padding: 4, marginLeft: -4 }}
              >
                <X size={20} strokeWidth={1.75} />
              </button>
              <p style={{ flex: 1, textAlign: "center", margin: 0, fontSize: 10, letterSpacing: 3, color: ARENA_V3.muted }}>
                {intent === "activity" ? "AN ACTIVITY" : intent === "ask" ? "A NEED" : "AN UPDATE"}
              </p>
              <span style={{ width: 28 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                style={fieldStyle}
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={PLACEHOLDERS[intent]}
                rows={4}
                style={{ ...fieldStyle, resize: "vertical", fontFamily: "inherit" }}
              />

              {isActivity && (
                <>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Where (e.g. Gachibowli) - kept general"
                      style={{ ...fieldStyle, flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={useMyLocation}
                      disabled={locating}
                      style={{
                        display: "flex", alignItems: "center", gap: 5, flexShrink: 0, fontSize: 11, fontWeight: 500,
                        borderRadius: 10, padding: "0 12px", cursor: locating ? "default" : "pointer",
                        border: `1px solid ${coords ? ARENA_V3.gold : ARENA_V3.hairline}`,
                        background: coords ? "rgba(255,107,53,0.1)" : ARENA_V3.white, color: ARENA_V3.ink,
                      }}
                    >
                      <LocateFixed size={13} strokeWidth={1.75} /> {locating ? "Locating…" : coords ? "Located" : "Use my location"}
                    </button>
                  </div>
                  {locateError && <p style={{ margin: 0, fontSize: 11, color: "#f87171" }}>{locateError}</p>}
                  {coords && (
                    <p style={{ margin: 0, fontSize: 11, color: ARENA_V3.muted }}>
                      Only an approximate, jittered pin will ever be shown to others.
                    </p>
                  )}
                  <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} style={fieldStyle} />
                  <input
                    value={meetingPoint}
                    onChange={(e) => setMeetingPoint(e.target.value)}
                    placeholder="Exact meeting point (optional) - shown only to approved joiners"
                    style={fieldStyle}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: ARENA_V3.muted }}>
                      <ShieldCheck size={12} /> Who can join needs:
                    </span>
                    {(["basic", "phone"] as const).map((v) => (
                      <Chip key={v} active={requiredVerification === v} onClick={() => setRequiredVerification(v)}>
                        {v === "basic" ? "No extra check" : "Phone-verified"}
                      </Chip>
                    ))}
                  </div>
                </>
              )}

              {joinable && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: ARENA_V3.muted }}>Who can join:</span>
                  {(["public", "approval"] as const).map((v) => (
                    <Chip key={v} active={visibility === v} onClick={() => setVisibility(v)}>
                      {v === "public" ? "Anyone" : "I approve"}
                    </Chip>
                  ))}
                  {intent === "activity" && (
                    <input
                      type="number"
                      min={1}
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      placeholder="Spots"
                      style={{ ...fieldStyle, width: 84, padding: "7px 10px", fontSize: 11 }}
                    />
                  )}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: ARENA_V3.muted }}>Visible to:</span>
                {(["global", "followers"] as const).map((a) => (
                  <Chip key={a} active={audience === a} onClick={() => setAudience(a)}>
                    {a === "global" ? "Everyone" : "Followers only"}
                  </Chip>
                ))}
              </div>

              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags, comma-separated (optional)" style={fieldStyle} />

              {error && (
                <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>
                  {error}
                  {error.toLowerCase().includes("settings") && (
                    <>
                      {" "}
                      <button
                        type="button"
                        onClick={() => { onOpenChange(false); router.push("/settings"); }}
                        style={{ background: "none", border: "none", padding: 0, color: ARENA_V3.ink, textDecoration: "underline", cursor: "pointer", fontSize: 12 }}
                      >
                        Go to Settings
                      </button>
                    </>
                  )}
                </p>
              )}

              <button
                type="button"
                disabled={!body.trim() || publishing}
                onClick={publish}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  width: "100%", fontSize: 14, fontWeight: 500, padding: "13px 0", borderRadius: 26,
                  border: "none", background: ARENA_V3.ink, color: ARENA_V3.ivory,
                  opacity: !body.trim() || publishing ? 0.55 : 1, cursor: !body.trim() || publishing ? "default" : "pointer",
                }}
              >
                <Sparkles size={14} /> {publishing ? "Publishing…" : "Publish"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
