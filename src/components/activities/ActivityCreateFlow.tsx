"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, CalendarDays, Link2, MapPin, MessageCircle, Pencil, Share2, Users } from "lucide-react";
import { pageSlide, vibrate } from "@/lib/motion";
import { useDirection } from "@/components/motion/useDirection";
import { AppShell } from "@/components/bplus/AppShell";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { Burst } from "@/components/bplus/Burst";
import { SuccessCheck } from "@/components/activity/ActivityParts";
import { IntakeForm, clearIntakeDraft, readIntakeDraft } from "@/components/intake/IntakeForm";
import { KindPicker } from "@/components/activities/KindPicker";
import { TellJenny } from "@/components/jenny/JennyParts";
import { CoverStep, type CoverChoice } from "@/components/activities/CoverStep";
import { ProceduralCover, coverFile as renderCoverFile } from "@/components/covers/ProceduralCover";
import { useGuest } from "@/hooks/use-arena-session";
import { createPost } from "@/lib/api/posts";
import { setActivityQuestions, updateActivityDetails, uploadActivityCover } from "@/lib/api/activities";
import { activitySchema } from "@/lib/intake/schemas/activity";
import { istToIso, toActivityDetails, toCreatePost, toHostQuestions } from "@/lib/activities/publish";
import { findSubtype } from "@/lib/activities/taxonomy";

/** An AI cover is already a URL and goes through the generic post media at create time. An
 * uploaded or client-rendered (procedural/plain) cover goes through the real
 * POST /activities/{id}/cover instead, once the post (and so its id) exists — see onPublish. */
async function aiCoverUrl(cover: CoverChoice | undefined): Promise<string[]> {
  return cover?.mode === "ai" ? [cover.url] : [];
}
import { timeOfDayFor } from "@/lib/covers/procedural";
import { activityWhen } from "@/components/activity/ActivityParts";
import { defaultsOf, problem, visibleFields, visibleSteps, type MoneyRange, type Values } from "@/lib/intake/types";

type Step = "kind" | "details" | "cover" | "preview" | "done";
const STEPS: Step[] = ["kind", "details", "cover", "preview", "done"];
const KIND_KEY = "arena_activity_kind";
const SEED_KEY = "arena_activity_seed";
const COVER_KEY = "arena_activity_cover";

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, v: string | null) {
  try {
    if (v == null) localStorage.removeItem(key);
    else localStorage.setItem(key, v);
  } catch {
    /* storage blocked */
  }
}

/** Flow §3 host: A1 What kind → A2–A4 intake → A5 cover → A6 preview → A7 published. */
export function ActivityCreateFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const guest = useGuest();
  const requested = (STEPS.includes(params.get("step") as Step) ? params.get("step") : "kind") as Step;
  // Client-only (rendered after `guest` resolves), so reading storage here can't mismatch.
  const [subtypeId, setSubtypeId] = useState<string | null>(() => read(KIND_KEY));
  const [seed] = useState(() => read(SEED_KEY) ?? `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const [cover, setCover] = useState<CoverChoice | undefined>(() => {
    const raw = read(COVER_KEY);
    return raw ? (JSON.parse(raw) as CoverChoice) : undefined;
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [answers, setAnswers] = useState<Values | null>(null);

  useEffect(() => write(SEED_KEY, seed), [seed]);
  const go = (s: Step, extra = "") => router.push(`/activities/new?step=${s}${extra}`);
  const schema = useMemo(() => (subtypeId ? activitySchema(subtypeId) : null), [subtypeId]);
  const values = answers ?? (subtypeId ? readIntakeDraft(`activity-${subtypeId}`) : null) ?? {};

  // Opening a later step directly never shows a blank page: with no kind chosen it is step 1
  // (What kind?); with a kind but an unfinished draft, cover and preview fall back to the details.
  const merged = schema ? { ...defaultsOf(schema), ...values } : null;
  const incomplete = !!schema && !!merged && visibleSteps(schema, merged).some((st) => visibleFields(st, merged).some((f) => problem(f, merged[f.id])));
  const step: Step = requested === "kind" || requested === "done" ? requested : !schema || !subtypeId ? "kind" : (requested === "cover" || requested === "preview") && incomplete ? "details" : requested;
  const direction = useDirection(STEPS.indexOf(step));
  useEffect(() => {
    // history, not router: the screen is already the right one; only the address needs to agree.
    if (guest === false && step !== requested) window.history.replaceState(null, "", step === "kind" ? "/activities/new" : `/activities/new?step=${step}`);
  }, [guest, step, requested]);

  if (guest === null) return <AppShell><div className="flex-1" /></AppShell>;
  if (guest) {
    return (
      <AppShell>
        <div className="pt-10 text-center">
          <h1 className="font-display-serif text-[28px] font-medium">Host an activity</h1>
          <p className="mt-2 text-[15px] text-faint">Sign in to create one. Browsing stays open to everyone.</p>
          <ButtonLink href="/auth?mode=signin" className="mt-6">Sign in</ButtonLink>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="-mx-5 -mt-[max(8px,env(safe-area-inset-top))] flex-1 overflow-x-hidden bg-paper px-5 pb-6 pt-[max(12px,env(safe-area-inset-top))] text-paper-ink">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <m.div key={step} custom={direction} variants={pageSlide} initial="enter" animate="center" exit="exit">
            {step === "kind" && (
              <KindPicker
                intro={
                  <TellJenny
                    kind="activity"
                    example="Cricket this Sunday 7am at Gachibowli, 12 players"
                    className="mt-4"
                    onPrefill={(p) => {
                      setSubtypeId(p.subtype ?? "other");
                      go("details");
                    }}
                  />
                }
                onClose={() => router.push("/home")}
                onPick={(id) => {
                  setSubtypeId(id);
                  write(KIND_KEY, id);
                  go("details");
                }}
              />
            )}
            {step === "details" && schema && subtypeId && (
              <IntakeForm
                schema={schema}
                key={subtypeId}
                draftKey={`activity-${subtypeId}`}
                startAt={params.get("start") ?? undefined}
                onExit={() => go("kind")}
                onSubmit={(v) => {
                  setAnswers(v);
                  go("cover");
                }}
              />
            )}
            {step === "cover" && subtypeId && (
              <CoverStep
                seed={seed}
                subtypeId={subtypeId}
                time={timeOfDayFor(istToIso(values.date, values.start))}
                answers={Object.fromEntries(Object.entries(values).filter(([, x]) => typeof x === "string").map(([k, x]) => [k, String(x)]))}
                initial={cover}
                onBack={() => go("details")}
                onUse={(c, f) => {
                  setCover(c);
                  setCoverFile(f);
                  if (c.mode === "card" || c.mode === "plain") write(COVER_KEY, JSON.stringify(c));
                  go("preview");
                }}
              />
            )}
            {step === "preview" && schema && subtypeId && (
              <Preview
                subtypeId={subtypeId}
                seed={seed}
                values={values}
                cover={cover ?? { mode: "card", variant: 0 }}
                coverFile={coverFile}
                onEdit={() => go("details")}
                onCover={() => go("cover")}
                onPublish={async (fileFromPreview) => {
                  const input = toCreatePost(schema, subtypeId, values);
                  const file = coverFile ?? fileFromPreview;
                  const mediaUrls = await aiCoverUrl(cover);
                  const post = await createPost({ ...input, mediaUrls });
                  if (cover?.mode !== "ai" && file) {
                    await uploadActivityCover(post.id, file).catch(() => {});
                  }
                  await updateActivityDetails(post.id, toActivityDetails(schema, subtypeId, values)).catch(() => {});
                  const questions = toHostQuestions(values);
                  if (questions.length) await setActivityQuestions(post.id, questions).catch(() => {});
                  clearIntakeDraft(`activity-${subtypeId}`);
                  [KIND_KEY, SEED_KEY, COVER_KEY].forEach((k) => write(k, null));
                  vibrate();
                  router.replace(`/activities/new?step=done&id=${encodeURIComponent(post.id)}&t=${encodeURIComponent(input.title ?? "")}`);
                }}
              />
            )}
            {step === "done" && <Published id={params.get("id") ?? ""} title={params.get("t") ?? "Your activity"} />}
          </m.div>
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

export function Preview({
  subtypeId,
  seed,
  values,
  cover,
  coverFile,
  onEdit,
  onCover,
  onPublish,
}: {
  subtypeId: string;
  seed: string;
  values: Values;
  cover: CoverChoice;
  coverFile: File | null;
  onEdit: () => void;
  onCover: () => void;
  onPublish: (file: File | null) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const svg = useRef<SVGSVGElement>(null);
  const sub = findSubtype(subtypeId);
  const startsAt = istToIso(values.date, values.start);
  const size = (values.size as MoneyRange | undefined) ?? {};
  const publish = async () => {
    setBusy(true);
    setError("");
    try {
      // After a reload the rendered file is gone: render the chosen card again from its seed.
      const file = coverFile ?? ((cover.mode === "card" || cover.mode === "plain") && svg.current ? await renderCoverFile(svg.current) : null);
      await onPublish(file);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "It didn't publish. Your answers are saved — try again.");
      setBusy(false);
    }
  };
  return (
    <div>
      <button type="button" onClick={onCover} aria-label="Back" className="-ml-2.5 grid size-11 place-items-center rounded-full hover:bg-paper-muted">
        <ArrowLeft className="size-6" strokeWidth={1.75} aria-hidden />
      </button>
      <h1 className="font-display-serif text-[30px] font-medium leading-[1.12]">Preview</h1>
      <p className="mt-2 text-[15px] text-paper-ink-muted">This is how neighbours will see it.</p>
      <article className="mt-5 overflow-hidden rounded-tile bg-white ring-1 ring-paper-ink/10">
        <div className="relative aspect-video">
          {cover.mode === "ai" || cover.mode === "upload" ? (
            // eslint-disable-next-line @next/next/no-img-element -- chosen cover
            <img src={cover.url} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <ProceduralCover ref={svg} seed={`${seed}-${cover.variant}`} subtypeId={subtypeId} time={timeOfDayFor(startsAt)} plain={cover.mode === "plain"} className="absolute inset-0" />
          )}
        </div>
        <div className="p-4">
          <p className="text-[13px] font-semibold text-info-on-paper">{sub?.category.label} · {sub?.label}</p>
          <h2 className="mt-1 font-display-serif text-[24px] font-medium leading-tight">{String(values.title ?? "")}</h2>
          <ul className="mt-3 space-y-1.5 text-[15px]">
            {startsAt && <li className="flex items-center gap-2"><CalendarDays className="size-4" aria-hidden /> {activityWhen({ startsAt, endsAt: istToIso(values.date, values.end) })}</li>}
            <li className="flex items-center gap-2"><MapPin className="size-4" aria-hidden /> {String(values.area ?? "")} <span className="text-paper-ink-muted">· exact point after approval</span></li>
            {size.max && <li className="flex items-center gap-2"><Users className="size-4" aria-hidden /> Up to {size.max} people</li>}
          </ul>
        </div>
      </article>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onEdit} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-paper-ink/30 px-4 text-[14px] font-semibold"><Pencil className="size-4" aria-hidden /> Edit details</button>
        <button type="button" onClick={onCover} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-paper-ink/30 px-4 text-[14px] font-semibold">Change cover</button>
      </div>
      <p className="mt-4 text-[13px] text-paper-ink-muted">Host questions, waitlist and repeating dates are saved with your draft and switch on when Arena supports them.</p>
      {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      <Button className="mt-5" loading={busy} onClick={publish}>Publish</Button>
    </div>
  );
}

const REASONS = ["You'd enjoy this", "We need one more", "Come meet the neighbours"];

export function Published({ id, title }: { id: string; title: string }) {
  const [reasonOpen, setReasonOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/feed/${id}`;
  const share = async (text: string) => {
    try {
      if (navigator.share) return await navigator.share({ title, text, url });
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setNotice("Link copied.");
    } catch {
      /* closed the share sheet */
    }
  };
  return (
    <div className="pt-8 text-center">
      <div className="relative mx-auto w-fit">
        <SuccessCheck />
        <Burst count={18} radius={90} />
      </div>
      <h1 className="mt-5 font-display-serif text-[30px] font-medium">It&apos;s live!</h1>
      <p className="mt-1 text-[16px]"><strong className="font-semibold">{title}</strong> is on Arena. Invite people you know.</p>
      <div className="mt-6 grid grid-cols-3 gap-2 text-left">
        <button type="button" onClick={() => share(title)} className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-tile bg-white text-[13px] font-semibold ring-1 ring-paper-ink/10"><Share2 className="size-5" aria-hidden /> Share</button>
        <a href={`https://wa.me/?text=${encodeURIComponent(`${title} — join me on Arena: ${url}`)}`} target="_blank" rel="noopener noreferrer" className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-tile bg-white text-[13px] font-semibold ring-1 ring-paper-ink/10"><MessageCircle className="size-5" aria-hidden /> WhatsApp</a>
        <button type="button" onClick={() => setReasonOpen(true)} className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-tile bg-white text-center text-[13px] font-semibold ring-1 ring-paper-ink/10"><Link2 className="size-5" aria-hidden /> Invite with a reason</button>
      </div>
      {notice && <p role="status" className="mt-3 text-[14px] text-paper-ink-muted">{notice}</p>}
      <ButtonLink href={`/feed/${id}`} className="mt-6">Open your activity</ButtonLink>
      <Link href="/work" className="mt-2 inline-flex min-h-11 items-center text-[15px] font-semibold text-primary-on-paper underline underline-offset-4">Manage it from Work</Link>
      <BottomSheet open={reasonOpen} onClose={() => setReasonOpen(false)} title="Invite with a reason">
        <h2 className="mt-3 font-display-serif text-[24px] font-medium">Why are you inviting them?</h2>
        <div className="mt-4 space-y-2">
          {REASONS.map((r) => (
            <Button key={r} variant="outline" className="border-paper-ink/40 text-paper-ink" onClick={() => { setReasonOpen(false); void share(`${r}! ${title}`); }}>{r}</Button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
