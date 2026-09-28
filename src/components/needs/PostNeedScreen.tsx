"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { m } from "motion/react";
import { ArrowLeft, Box, CalendarDays, Eye, Globe, ImagePlus, Info, MapPin, X } from "lucide-react";
import { rise, vibrate } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { KindChip } from "@/components/bplus/Primitives";
import { PaperInput, PaperSelect, PaperTextArea } from "@/components/needs/PaperFields";
import { useGuest, useOffline } from "@/hooks/use-arena-session";
import { createPost } from "@/lib/api/posts";
import { getMyProfile } from "@/lib/api/profile";
import { checkMediaFile, getUploadSignature, MAX_MEDIA_PER_POST, uploadMedia } from "@/lib/api/media";
import {
  NEED_CATEGORIES,
  NEED_DETAILS_MAX,
  NEED_TITLE_MAX,
  PREFERRED_TIMES,
  needWhen,
  readNeedDraft,
  timeWindow,
  writeNeedDraft,
  type NeedDraft,
  type PreferredTime,
} from "@/lib/data/needs";

const EMPTY: NeedDraft = { title: "", details: "", category: "", area: "", time: "Flexible", audience: "global" };

/** Board "From a local need…" screen 2 — Post a Need. */
export function PostNeedScreen() {
  const router = useRouter();
  const guest = useGuest();
  const offline = useOffline();
  // The form only renders after hydration (guest is null until then), so reading this device's
  // draft in the initializer can't cause a hydration mismatch.
  const [draft, setDraft] = useState<NeedDraft>(() => {
    const saved = readNeedDraft();
    return saved && (saved.title || saved.details) ? { ...EMPTY, ...saved } : EMPTY;
  });
  const [restored, setRestored] = useState(() => draft !== EMPTY);
  const [touched, setTouched] = useState<{ title?: boolean; category?: boolean }>({});
  const [submitted, setSubmitted] = useState(0);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // No restored draft: prefill the area from the profile.
  useEffect(() => {
    if (guest !== false || restored) return;
    getMyProfile()
      .then((p) => setDraft((d) => (d.area ? d : { ...d, area: p.homeCity ?? p.location ?? "" })))
      .catch(() => {});
  }, [guest, restored]);

  // Every change is kept on this device until it's really posted.
  useEffect(() => {
    if (!done) writeNeedDraft(draft.title || draft.details ? draft : null);
  }, [draft, done]);

  // Preview URLs are freed when a photo is removed, and all of them when the screen closes.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);
  const removePhoto = (url: string) => {
    URL.revokeObjectURL(url);
    setPhotos((cur) => cur.filter((x) => x.url !== url));
  };

  const set = <K extends keyof NeedDraft>(k: K, v: NeedDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const titleError = draft.title.trim().length < 3 ? "Say what you need help with, in a few words." : "";
  const categoryError = !draft.category ? "Pick the closest category." : "";
  const show = (k: "title" | "category") => touched[k] || submitted > 0;

  const addPhotos = (files: FileList | null) => {
    setPhotoError("");
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    const problem = list.map(checkMediaFile).find(Boolean);
    if (problem) return setPhotoError(problem);
    setPhotos((cur) => [...cur, ...list.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX_MEDIA_PER_POST));
  };

  const post = async () => {
    setSubmitted((n) => n + 1);
    setError("");
    if (titleError || categoryError) return;
    if (offline) return setError("You're offline. Your need is saved on this device — post it when you're back.");
    setBusy(true);
    try {
      let mediaUrls: string[] = [];
      if (photos.length) {
        const sig = await getUploadSignature().catch(() => null);
        mediaUrls = await Promise.all(photos.map((p) => uploadMedia(p.file, sig)));
      }
      const title = draft.title.trim();
      const created = await createPost({
        intentType: "ask",
        title,
        body: draft.details.trim() || title,
        locationText: draft.area.trim() || undefined,
        audience: draft.audience,
        visibility: "approval",
        tags: [draft.category],
        mediaUrls,
        ...timeWindow(draft.time),
      });
      writeNeedDraft(null);
      setDone(true);
      vibrate();
      window.setTimeout(() => router.replace(`/feed/${created.id}`), 420);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "That didn't post. Your need is saved on this device — try again.");
      setBusy(false);
    }
  };

  const area = draft.area.trim() || "your area";

  return (
    <AppShell>
      <div className="-mx-5 -mt-[max(8px,env(safe-area-inset-top))] flex-1 bg-paper px-5 pb-6 pt-[max(12px,env(safe-area-inset-top))] text-paper-ink">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.back()} aria-label="Back" className="-ml-2.5 grid size-11 place-items-center rounded-full hover:bg-paper-muted">
            <ArrowLeft className="size-6" strokeWidth={1.75} aria-hidden />
          </button>
          <h1 className="flex-1 font-display-serif text-[26px] font-medium">Post a Need</h1>
          <Link href="/home" aria-label="Close" className="-mr-2 grid size-11 place-items-center rounded-full hover:bg-paper-muted">
            <X className="size-6" strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
        <p className="text-[15px] text-paper-ink-muted">Tell your neighbors what you need.</p>

        {guest ? (
          <div className="mt-8">
            <p className="text-[15px]">Sign in to post a need. Browsing stays open to everyone.</p>
            <ButtonLink href="/auth?mode=signin" className="mt-5">Sign in</ButtonLink>
          </div>
        ) : (
          <m.form
            initial="hidden"
            animate="shown"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void post();
            }}
            className="mt-5 space-y-5"
          >
            {restored && (
              <p role="status" className="rounded-xl bg-paper-muted px-3.5 py-2.5 text-[14px]">
                Your unsent need was restored from this device.{" "}
                <button type="button" className="font-semibold underline underline-offset-2" onClick={() => { setDraft(EMPTY); setRestored(false); writeNeedDraft(null); }}>Start over</button>
              </p>
            )}
            <m.div variants={rise} custom={0}>
              <PaperInput
                label="What do you need help with?"
                value={draft.title}
                onChange={(v) => set("title", v)}
                onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                maxLength={NEED_TITLE_MAX}
                placeholder="e.g. Help move a sofa"
                error={show("title") ? titleError : ""}
                shakeSignal={submitted}
              />
            </m.div>
            <m.div variants={rise} custom={1}>
              <PaperTextArea label="More details (optional)" value={draft.details} onChange={(v) => set("details", v)} maxLength={NEED_DETAILS_MAX} placeholder="How many people, how long it takes, anything to know" />
            </m.div>
            <m.div variants={rise} custom={2}>
              <PaperSelect
                label="Category"
                icon={Box}
                value={draft.category}
                onChange={(v) => set("category", v)}
                onBlur={() => setTouched((t) => ({ ...t, category: true }))}
                options={NEED_CATEGORIES.map((c) => ({ value: c, label: c }))}
                placeholder="Choose a category"
                error={show("category") ? categoryError : ""}
                shakeSignal={submitted}
              />
            </m.div>
            <m.div variants={rise} custom={3}>
              <PaperInput
                label="Where (approximate area)"
                icon={MapPin}
                value={draft.area}
                onChange={(v) => set("area", v)}
                maxLength={60}
                placeholder="e.g. Gachibowli"
                hint={<span className="inline-flex items-center gap-1">Only the area is shown — never your address <Info className="size-3.5" aria-hidden /></span>}
              />
            </m.div>
            <m.div variants={rise} custom={4}>
              <PaperSelect label="Preferred time" icon={CalendarDays} value={draft.time} onChange={(v) => set("time", v as PreferredTime)} options={PREFERRED_TIMES.map((t) => ({ value: t, label: t }))} />
            </m.div>

            <m.fieldset variants={rise} custom={5}>
              <legend className="mb-2 text-[15px] font-semibold">Add a photo (optional)</legend>
              <div className="grid grid-cols-2 gap-3">
                {photos.map((p, i) => (
                  <div key={p.url} className="relative aspect-[4/3] overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                    <img src={p.url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
                    <button type="button" onClick={() => removePhoto(p.url)} aria-label={`Remove photo ${i + 1}`} className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-paper-ink/70 text-white">
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_MEDIA_PER_POST && (
                  <button type="button" onClick={() => fileInput.current?.click()} className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-field-line text-[14px] text-paper-ink-muted hover:bg-paper-muted">
                    <ImagePlus className="size-6" strokeWidth={1.75} aria-hidden />
                    Add photo
                  </button>
                )}
              </div>
              <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
              {photoError && <p role="alert" className="mt-1.5 text-[13px] text-danger-on-paper">{photoError}</p>}
            </m.fieldset>

            <m.div variants={rise} custom={6}>
              <PaperSelect
                label="Share with"
                icon={Globe}
                value={draft.audience}
                onChange={(v) => set("audience", v as NeedDraft["audience"])}
                options={[
                  { value: "global", label: `Nearby people (${area})` },
                  { value: "followers", label: "People who follow me" },
                ]}
                hint={draft.audience === "global" ? "Shown to people around this area. Your exact location is never shared." : "Only people who follow you can see this need."}
              />
            </m.div>

            <m.div variants={rise} custom={7}>
              <button type="button" onClick={() => setPreview(true)} className="flex min-h-[52px] w-full items-center gap-3 rounded-button border border-field-line bg-white px-4 text-left text-[16px] font-medium">
                <Eye className="size-5 text-paper-ink-muted" strokeWidth={1.75} aria-hidden />
                <span className="flex-1">Preview</span>
              </button>
            </m.div>

            {error && <p role="alert" className="rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
            <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-10 -mx-5 bg-linear-to-t from-paper from-80% to-transparent px-5 pb-2 pt-3">
              <Button type="submit" loading={busy && !done} success={done}>Post Need</Button>
            </div>
          </m.form>
        )}
      </div>

      <BottomSheet open={preview} onClose={() => setPreview(false)} title="Preview">
        <h2 className="mt-3 font-display-serif text-[24px] font-medium">How neighbors see it</h2>
        <article className="mt-4 rounded-tile border border-paper-ink/15 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[18px] font-semibold">{draft.title.trim() || "Your need"}</p>
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-[12px] font-semibold text-primary-on-paper">Open</span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[14px] text-paper-ink-muted">
            <MapPin className="size-4" aria-hidden /> {draft.area.trim() || "Area not set"} · {needWhen(timeWindow(draft.time))}
          </p>
          {draft.details.trim() && <p className="mt-2 text-[15px] leading-relaxed">{draft.details.trim()}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <KindChip kind="ask" />
            {draft.category && <span className="rounded-full bg-paper-muted px-2.5 py-1 text-[13px]">{draft.category}</span>}
          </div>
          {photos[0] && (
            // eslint-disable-next-line @next/next/no-img-element -- local preview
            <img src={photos[0].url} alt="" className="mt-3 aspect-[16/9] w-full rounded-xl object-cover" />
          )}
        </article>
        <Button variant="outline" className="mt-5 border-paper-ink/55 text-paper-ink" onClick={() => setPreview(false)}>Keep editing</Button>
      </BottomSheet>
    </AppShell>
  );
}
