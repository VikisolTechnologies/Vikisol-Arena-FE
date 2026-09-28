"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { MapPin, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { pageSlide, press, rise, spring, vibrate } from "@/lib/motion";
import { useDirection } from "@/components/motion/useDirection";
import { AppShell } from "@/components/bplus/AppShell";
import { ButtonLink } from "@/components/bplus/Button";
import { KindChip } from "@/components/bplus/Primitives";
import { IntakeForm, clearIntakeDraft } from "@/components/intake/IntakeForm";
import type { PhotoValue } from "@/components/intake/IntakeField";
import { useGuest, useOffline } from "@/hooks/use-arena-session";
import { createPost } from "@/lib/api/posts";
import { getMyProfile } from "@/lib/api/profile";
import { getUploadSignature, uploadMedia } from "@/lib/api/media";
import { HELP_LABEL, NEED_KINDS, URGENCY_LABEL, findNeedKind, needSchema, offerSchema, publicLines } from "@/lib/intake/schemas/need";
import { timeWindow } from "@/lib/data/needs";
import type { Values } from "@/lib/intake/types";

type Mode = "need" | "offer";

function urgencyWindow(u: unknown) {
  if (u === "today") return timeWindow("Today");
  if (u === "week") return { startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 7 * 86_400_000).toISOString() };
  return {};
}

/** Flow §4 — post a need or make an offer: category → intake (why lines, locks, safety notes,
 *  draft kept offline) → review with a preview card → a real post. */
export function PostFlow({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const guest = useGuest();
  const offline = useOffline();
  const kindId = params.get("kind");
  const kind = findNeedKind(kindId);
  const direction = useDirection(kind ? 1 : 0);
  const schema = useMemo(() => (kind ? (mode === "need" ? needSchema(kind.id) : offerSchema(kind.id)) : null), [kind, mode]);
  const [area, setArea] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const base = mode === "need" ? "/needs/new" : "/offers/new";

  useEffect(() => {
    if (guest !== false) return;
    getMyProfile().then((p) => setArea(p.homeCity || p.location || "")).catch(() => setArea(""));
  }, [guest]);

  const submit = async (v: Values) => {
    if (!kind || !schema) return;
    if (offline) return setError("You're offline. Your answers are saved on this device — post when you're back.");
    setBusy(true);
    setError("");
    try {
      const photos = ((v.photos as PhotoValue[] | undefined) ?? []).filter((p) => p.file);
      let mediaUrls: string[] = [];
      if (photos.length) {
        const sig = await getUploadSignature().catch(() => null);
        mediaUrls = await Promise.all(photos.map((p) => uploadMedia(p.file!, sig)));
      }
      const title = String(v.title ?? "").trim();
      const facts =
        mode === "need"
          ? [`When: ${URGENCY_LABEL[String(v.urgency)] ?? "Flexible"}`, `Help: ${HELP_LABEL[String(v.help)] ?? "Free"}`, ...publicLines(schema, v, ["specific"])]
          : [`In return: ${HELP_LABEL[String(v.help)] ?? "Free"}`, ...publicLines(schema, v, ["when"]).filter((l) => !l.startsWith("Area") && !l.startsWith("Share with")), ...(v.proof ? [`Proof: ${v.proof}`] : [])];
      const details = String(v.details ?? "").trim();
      const post = await createPost({
        intentType: mode === "need" ? "ask" : "offer",
        title,
        body: [details, facts.join("\n")].filter(Boolean).join("\n\n"),
        locationText: String(v.area ?? "").trim() || undefined,
        audience: v.audience === "followers" ? "followers" : "global",
        visibility: "approval",
        tags: [kind.label, mode === "need" ? URGENCY_LABEL[String(v.urgency)] : undefined].filter((x): x is string => !!x),
        mediaUrls,
        exactMeetingPoint: typeof v.pickup === "string" && v.pickup.trim() ? v.pickup.trim() : undefined,
        ...(mode === "need" ? urgencyWindow(v.urgency) : {}),
      });
      clearIntakeDraft(`${mode}-${kind.id}`);
      vibrate();
      router.replace(`/feed/${post.id}`);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "That didn't post. Your answers are saved — try again.");
      setBusy(false);
    }
  };

  if (guest === null) return <AppShell><div className="flex-1" /></AppShell>;

  return (
    <AppShell>
      <div className="-mx-5 -mt-[max(8px,env(safe-area-inset-top))] flex-1 overflow-x-hidden bg-paper px-5 pb-6 pt-[max(12px,env(safe-area-inset-top))] text-paper-ink">
        {guest ? (
          <div className="pt-8">
            <h1 className="font-display-serif text-[28px] font-medium">{mode === "need" ? "Post a Need" : "Make an Offer"}</h1>
            <p className="mt-2 text-[15px] text-paper-ink-muted">Sign in to post. Browsing stays open to everyone.</p>
            <ButtonLink href="/auth?mode=signin" className="mt-6">Sign in</ButtonLink>
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <m.div key={kind ? "form" : "kind"} custom={direction} variants={pageSlide} initial="enter" animate="center" exit="exit">
              {!kind || !schema ? (
                <div>
                  <div className="flex justify-end">
                    <Link href="/home" aria-label="Close" className="-mr-2 grid size-11 place-items-center rounded-full hover:bg-paper-muted">
                      <X className="size-6" strokeWidth={1.75} aria-hidden />
                    </Link>
                  </div>
                  <h1 className="font-display-serif text-[30px] font-medium leading-[1.12]">{mode === "need" ? "What kind of help?" : "What can you offer?"}</h1>
                  <p className="mt-2 text-[15px] text-paper-ink-muted">{mode === "need" ? "Pick the closest — we'll only ask what helps neighbours say yes." : "Pick the closest — you set your own limits."}</p>
                  <m.div initial="hidden" animate="shown" className="mt-5 grid grid-cols-2 gap-2.5">
                    {NEED_KINDS.map((k, i) => (
                      <m.div key={k.id} variants={rise} custom={i} whileTap={press} transition={spring.snappy}>
                        <Link href={`${base}?kind=${k.id}`} className="flex min-h-[76px] items-center gap-3 rounded-tile bg-white p-3 ring-1 ring-paper-ink/10 outline-none focus-visible:ring-2 focus-visible:ring-primary">
                          <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-white", mode === "need" ? "bg-primary-on-paper" : "bg-success-on-paper")}>
                            <k.icon className="size-5" strokeWidth={1.9} aria-hidden />
                          </span>
                          <span className="text-[15px] font-semibold leading-tight">{k.label}</span>
                        </Link>
                      </m.div>
                    ))}
                  </m.div>
                </div>
              ) : area === undefined ? (
                <div className="pt-12 text-center text-[15px] text-paper-ink-muted" aria-busy="true">Loading…</div>
              ) : (
                <>
                  {kind.safety && (
                    <p className="mb-3 flex items-start gap-2 rounded-tile bg-success/10 p-3 text-[14px]">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success-on-paper" aria-hidden /> {kind.safety}
                    </p>
                  )}
                  <IntakeForm
                    schema={schema}
                    draftKey={`${mode}-${kind.id}`}
                    initial={{ area: area || undefined }}
                    onExit={() => router.push(base)}
                    onSubmit={submit}
                    busy={busy}
                    submitError={error}
                    reviewExtra={(v) => (
                      <section className="mt-4" aria-label="Preview">
                        <p className="mb-2 text-[15px] font-semibold">How neighbours see it</p>
                        <article className="rounded-tile bg-white p-4 ring-1 ring-paper-ink/10">
                          <div className="flex items-center gap-2">
                            <KindChip kind={mode === "need" ? "ask" : "offer"} />
                            <span className="text-[13px] text-paper-ink-muted">{kind.label}</span>
                          </div>
                          <p className="mt-2 text-[18px] font-semibold">{String(v.title ?? "") || (mode === "need" ? "Your need" : "Your offer")}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-[14px] text-paper-ink-muted">
                            <MapPin className="size-4" aria-hidden /> {String(v.area ?? "") || "Area not set"}
                            {mode === "need" && <> · {URGENCY_LABEL[String(v.urgency)] ?? "Flexible"}</>}
                          </p>
                        </article>
                      </section>
                    )}
                  />
                </>
              )}
            </m.div>
          </AnimatePresence>
        )}
      </div>
    </AppShell>
  );
}
