"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, ChevronRight, HelpCircle, ImagePlus, LocateFixed, MessageCircle, Play, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ARENA_V3 } from "@/components/home-v3/tokens";
import { createPost } from "@/lib/api/posts";
import { MAX_MEDIA_PER_POST, checkMediaFile, getUploadSignature, isVideoFile, isVideoUrl, uploadMedia, type UploadSignature } from "@/lib/api/media";
import { RequirementForm, requirementFromError, type Requirement } from "@/components/requirements/RequirementForm";
import type { Post, PostAudience, PostVisibility, VerificationLevel } from "@/lib/types";

type PostIntent = Exclude<Post["intentType"], "company">;
type Step = "pick" | "form";

// One attached photo/video. Uploading starts the moment it's picked, so Publish only waits on
// whatever is still in flight rather than on every file from scratch.
type Attachment = {
  id: string;
  previewUrl: string;
  isVideo: boolean;
  progress: number;
  url?: string;
  error?: string;
};

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

// Drafts are kept per post type in this browser, so closing the form, reloading, or stepping
// away to fix something never throws away what was typed. Cleared once the post publishes.
type Draft = {
  title: string;
  body: string;
  location: string;
  startsAt: string;
  meetingPoint: string;
  capacity: string;
  tags: string;
  visibility: PostVisibility;
  audience: PostAudience;
  mediaUrls: string[];
};

const draftKey = (intent: PostIntent) => `arena_post_draft_${intent}`;

function readDraft(intent: PostIntent | null): Partial<Draft> {
  if (!intent || typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(draftKey(intent)) ?? "{}") as Partial<Draft>;
  } catch {
    return {};
  }
}

function hasContent(d: Partial<Draft>) {
  return !!(d.title?.trim() || d.body?.trim() || d.location?.trim() || d.meetingPoint?.trim() || d.tags?.trim() || d.mediaUrls?.length);
}

function attachmentsFromUrls(urls: string[] | undefined): Attachment[] {
  return (urls ?? []).map((url) => ({ id: url, previewUrl: url, isVideo: isVideoUrl(url), progress: 1, url }));
}

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

  // Read once per mount - callers remount this component on every open (see the doc comment).
  const [initialDraft] = useState(() => readDraft(initialIntent));
  const [title, setTitle] = useState(initialDraft.title ?? "");
  const [body, setBody] = useState(initialDraft.body ?? "");
  const [location, setLocation] = useState(initialDraft.location ?? "");
  const [visibility, setVisibility] = useState<PostVisibility>(initialDraft.visibility ?? "public");
  const [audience, setAudience] = useState<PostAudience>(initialDraft.audience ?? "global");
  const [capacity, setCapacity] = useState(initialDraft.capacity ?? "");
  const [tags, setTags] = useState(initialDraft.tags ?? "");
  const [startsAt, setStartsAt] = useState(initialDraft.startsAt ?? "");
  const [meetingPoint, setMeetingPoint] = useState(initialDraft.meetingPoint ?? "");
  const [restored, setRestored] = useState(() => hasContent(initialDraft));
  const [requiredVerification, setRequiredVerification] = useState<VerificationLevel>("basic");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>(() => attachmentsFromUrls(initialDraft.mediaUrls));
  // A missing detail the last publish attempt was refused for (e.g. date of birth) - asked for
  // right here in the form, then publishing carries on.
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // One signature covers every file in this post (Cloudinary accepts it for an hour) - fetched
  // on the first pick and shared by every upload after it.
  const signatureRef = useRef<Promise<UploadSignature> | null>(null);

  const joinable = intent === "activity" || intent === "ask";
  const isActivity = intent === "activity";

  function pickRow(key: (typeof ROWS)[number]["key"]) {
    if (key === "project") {
      onOpenChange(false);
      router.push("/marketplace?post=1");
      return;
    }
    const d = readDraft(key);
    setTitle(d.title ?? "");
    setBody(d.body ?? "");
    setLocation(d.location ?? "");
    setVisibility(d.visibility ?? "public");
    setAudience(d.audience ?? "global");
    setCapacity(d.capacity ?? "");
    setTags(d.tags ?? "");
    setStartsAt(d.startsAt ?? "");
    setMeetingPoint(d.meetingPoint ?? "");
    setAttachments(attachmentsFromUrls(d.mediaUrls));
    setRestored(hasContent(d));
    setIntent(key);
    setStep("form");
  }

  const uploadedUrls = attachments.flatMap((a) => (a.url ? [a.url] : []));
  const uploadedKey = uploadedUrls.join("|");
  useEffect(() => {
    if (step !== "form") return;
    const draft: Draft = { title, body, location, startsAt, meetingPoint, capacity, tags, visibility, audience, mediaUrls: uploadedKey ? uploadedKey.split("|") : [] };
    try {
      if (hasContent(draft)) localStorage.setItem(draftKey(intent), JSON.stringify(draft));
      else localStorage.removeItem(draftKey(intent));
    } catch {
      // Storage full or blocked (private mode) - the form still works, just without a saved draft.
    }
  }, [step, intent, title, body, location, startsAt, meetingPoint, capacity, tags, visibility, audience, uploadedKey]);

  function discardDraft() {
    try {
      localStorage.removeItem(draftKey(intent));
    } catch {}
    setTitle(""); setBody(""); setLocation(""); setCapacity(""); setTags(""); setStartsAt(""); setMeetingPoint("");
    setVisibility("public"); setAudience("global"); setAttachments([]); setRestored(false);
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

  function patchAttachment(id: string, patch: Partial<Attachment>) {
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setMediaError(null);
    const room = MAX_MEDIA_PER_POST - attachments.length;
    const picked = Array.from(files);
    if (picked.length > room) setMediaError(`You can attach up to ${MAX_MEDIA_PER_POST} photos or videos.`);
    for (const file of picked.slice(0, Math.max(0, room))) {
      const problem = checkMediaFile(file);
      if (problem) {
        setMediaError(problem);
        continue;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setAttachments((prev) => [...prev, { id, previewUrl: URL.createObjectURL(file), isVideo: isVideoFile(file), progress: 0 }]);
      if (!signatureRef.current) {
        signatureRef.current = getUploadSignature();
        // A failed signature (e.g. uploads not configured) must not stick - the next pick retries.
        signatureRef.current.catch(() => { signatureRef.current = null; });
      }
      signatureRef.current
        .then((sig) => uploadMedia(file, sig, (f) => patchAttachment(id, { progress: f })))
        .then((url) => patchAttachment(id, { url, progress: 1 }))
        .catch((err) => patchAttachment(id, { error: err instanceof Error ? err.message : "Upload failed" }));
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => {
      const gone = prev.find((a) => a.id === id);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }

  const uploading = attachments.some((a) => !a.url && !a.error);
  const failedUpload = attachments.some((a) => a.error);
  const canPublish = !!body.trim() && !publishing && !uploading && !failedUpload;

  async function publish() {
    if (!canPublish) return;
    setPublishing(true);
    setError(null);
    setRequirement(null);
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
        mediaUrls: uploadedUrls,
      });
      try {
        localStorage.removeItem(draftKey(intent));
      } catch {}
      onOpenChange(false);
      onPublished();
    } catch (err) {
      const missing = requirementFromError(err);
      if (missing) setRequirement(missing);
      else setError(err instanceof Error ? err.message : "Couldn't publish that post.");
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
              {restored && (
                <p style={{ margin: 0, fontSize: 11, color: ARENA_V3.muted }}>
                  Picked up where you left off.{" "}
                  <button type="button" onClick={discardDraft} style={{ background: "none", border: "none", padding: 0, color: ARENA_V3.ink, textDecoration: "underline", cursor: "pointer", fontSize: 11 }}>
                    Start fresh
                  </button>
                </p>
              )}
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

              {attachments.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {attachments.map((a) => (
                    <div key={a.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", background: ARENA_V3.white }}>
                      {a.isVideo ? (
                        <video src={a.previewUrl} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element -- local object-URL preview
                        <img src={a.previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                      {a.isVideo && (
                        <Play size={16} fill="#ffffff" color="#ffffff" style={{ position: "absolute", left: 6, bottom: 6, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }} />
                      )}
                      {(a.error || !a.url) && (
                        <div
                          style={{
                            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 4,
                            background: "rgba(0,0,0,0.55)", color: a.error ? "#f87171" : "#ffffff", fontSize: 11, fontWeight: 600, textAlign: "center",
                          }}
                        >
                          {a.error ? "Failed" : `${Math.round(a.progress * 100)}%`}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeAttachment(a.id)}
                        aria-label="Remove"
                        style={{
                          position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none",
                          background: "rgba(0,0,0,0.65)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                        }}
                      >
                        <X size={13} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {attachments.length < MAX_MEDIA_PER_POST && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", fontSize: 13, fontWeight: 500,
                      padding: "10px 0", borderRadius: 10, cursor: "pointer", color: ARENA_V3.ink,
                      background: "transparent", border: `1px dashed ${ARENA_V3.hairline}`,
                    }}
                  >
                    <ImagePlus size={16} strokeWidth={1.75} /> Add photos or videos
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    hidden
                    onChange={(e) => {
                      addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </>
              )}
              {mediaError && <p style={{ margin: 0, fontSize: 11, color: "#f87171" }}>{mediaError}</p>}
              {failedUpload && (
                <p style={{ margin: 0, fontSize: 11, color: "#f87171" }}>
                  {attachments.find((a) => a.error)?.error} - remove it to publish, or add it again.
                </p>
              )}

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

              {error && <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>{error}</p>}

              {requirement && (
                <div style={{ border: `1px solid ${ARENA_V3.gold}`, borderRadius: 12, padding: 14, background: ARENA_V3.white }}>
                  <RequirementForm
                    key={requirement}
                    requirement={requirement}
                    onDone={() => {
                      setRequirement(null);
                      publish();
                    }}
                    onCancel={() => setRequirement(null)}
                  />
                </div>
              )}

              <button
                type="button"
                disabled={!canPublish}
                onClick={publish}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  width: "100%", fontSize: 14, fontWeight: 500, padding: "13px 0", borderRadius: 26,
                  border: "none", background: ARENA_V3.ink, color: ARENA_V3.ivory,
                  opacity: canPublish ? 1 : 0.55, cursor: canPublish ? "pointer" : "default",
                }}
              >
                <Sparkles size={14} /> {publishing ? "Publishing…" : uploading ? "Uploading…" : "Publish"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
