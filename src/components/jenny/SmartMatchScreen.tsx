"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { m } from "motion/react";
import { ArrowLeft, Check, CircleHelp, Info } from "lucide-react";
import { rise } from "@/lib/motion";
import { Screen } from "@/components/bplus/Screen";
import { ButtonLink } from "@/components/bplus/Button";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Avatar } from "@/components/bplus/Avatar";
import { PreviewPill, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { Cover } from "@/components/covers/Cover";
import { getJoinedPosts, getPost } from "@/lib/api/posts";
import { EMPTY_DRAFT, readEntryDraft, subscribeEntryDraft } from "@/lib/data/onboarding";
import { originFor, whenLabel } from "@/lib/data/feed";
import { explainMatch } from "@/lib/data/jenny";
import type { Post } from "@/lib/types";

/**
 * VNext AI-layer board #4 — Smart match, reached from something Jenny surfaced. "Why this matches
 * you" is a list of checkable reasons from your own interests, availability and history — never
 * a percentage or score (correction #4). "I'm interested" opens the real activity, where you
 * decide to ask to join.
 */
export function SmartMatchScreen({ id }: { id: string }) {
  const router = useRouter();
  const entry = useSyncExternalStore(subscribeEntryDraft, readEntryDraft, () => EMPTY_DRAFT);
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [joined, setJoined] = useState<Post[]>([]);
  const [whyOpen, setWhyOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPost(id).then((p) => !cancelled && setPost(p ?? null)).catch(() => !cancelled && setPost(null));
    getJoinedPosts().then((j) => !cancelled && setJoined(Array.isArray(j) ? j : [])).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  const me = useMemo(() => ({ interests: entry.interests, availability: entry.availability, origin: originFor(null, entry.area) }), [entry]);
  const why = useMemo(() => (post ? explainMatch(post, me, joined) : null), [post, me, joined]);

  return (
    <Screen>
      <header className="grid grid-cols-[44px_1fr_44px] items-center pt-2">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="-ml-2.5 grid size-11 place-items-center rounded-full hover:bg-foreground/5">
          <ArrowLeft className="size-6" strokeWidth={1.75} aria-hidden />
        </button>
        <h1 className="text-center font-display-serif text-[24px] font-medium">Smart match</h1>
        <PreviewPill className="justify-self-end" />
      </header>

      {post === undefined ? (
        <div className="mt-3 space-y-3" aria-busy="true" aria-label="Loading">
          <Skeleton className="aspect-[16/10] w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !post || !why ? (
        <div className="pt-8">
          <StateCard kind="empty" title="This isn't available any more" detail="It may have ended or been taken down." action={<ButtonLink href="/home">Back to Feed</ButtonLink>} />
        </div>
      ) : (
        <m.div initial="hidden" animate="shown" className="mt-3">
          <m.div variants={rise} custom={0} className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-card)]">
            <Cover source={{ id: post.id, kind: post.intentType, media: post.mediaUrls[0], title: post.title ?? undefined }} className="absolute inset-0 size-full" sizes="480px" />
          </m.div>
          <m.div variants={rise} custom={1}>
            <h2 className="mt-4 font-display-serif text-[26px] font-medium leading-tight">{post.title ?? post.body.slice(0, 60)}</h2>
            <p className="mt-1 text-[15px] text-faint">{[whenLabel(post.startsAt), post.locationText ? `${post.locationText.split(",")[0]} (general area)` : null].filter(Boolean).join(" · ")}</p>
            {post.tags.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Tags">
                {post.tags.slice(0, 4).map((t) => <li key={t} className="rounded-full border border-field-line px-3 py-1 text-[13px] capitalize">{t}</li>)}
              </ul>
            )}
          </m.div>

          <m.section variants={rise} custom={2} data-surface="paper" aria-label="Why this matches you" className="mt-5 rounded-[var(--radius-card)] bg-paper p-4 text-paper-ink">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[18px] font-semibold">Why this matches you?</h3>
              <button type="button" onClick={() => setWhyOpen(true)} className="inline-flex min-h-11 items-center text-[14px] font-semibold text-info-on-paper underline underline-offset-4">Why this?</button>
            </div>
            {why.reasons.length === 0 ? (
              <p className="mt-1 text-[15px] text-paper-ink-muted">It&apos;s nearby and coming up soon. Add interests so Jenny can say more.</p>
            ) : (
              <ul className="mt-1 space-y-2">
                {why.reasons.map((r) => (
                  <li key={r} className="flex items-center gap-3 text-[15px]">
                    <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full bg-success-on-paper text-white">
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </m.section>

          <m.section variants={rise} custom={3} aria-label="Additional context" className="mt-5">
            <h3 className="flex items-center gap-2 text-[17px] font-semibold">Additional context <Info className="size-4 text-faint" aria-hidden /></h3>
            <div className="mt-2 flex items-center gap-3">
              <Avatar name={post.authorName ?? "Host"} className="size-10 text-[14px]" />
              <p className="text-[15px]">
                Organised by {post.authorName ?? "a neighbour"}
                <span className="block text-[14px] text-faint">{[post.reactionCount ? `${post.reactionCount} people interested` : null, post.spotsFilled ? `${post.spotsFilled} going` : null].filter(Boolean).join(" · ") || "Be one of the first"}</span>
              </p>
            </div>
          </m.section>

          <m.section variants={rise} custom={4} aria-label="Things to consider" className="mt-5">
            <h3 className="flex items-center gap-2 text-[17px] font-semibold">Things to consider <CircleHelp className="size-4 text-faint" aria-hidden /></h3>
            <ul className="mt-2 space-y-1 pl-5 text-[15px] text-foreground/90">
              {why.consider.map((c) => <li key={c} className="list-disc">{c}</li>)}
            </ul>
          </m.section>

          <m.div variants={rise} custom={5} className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => router.back()} className="h-12 rounded-button border border-foreground/70 text-[15px] font-semibold">Skip</button>
            <ButtonLink href="/onboarding?step=2" variant="outline" className="h-12 px-3 text-[15px]">Edit preferences</ButtonLink>
          </m.div>
          <ButtonLink href={`/feed/${post.id}`} className="mt-3">I&apos;m interested</ButtonLink>
          <p className="mt-2 text-center text-[13px] text-faint">Opens the activity — you choose whether to ask to join.</p>
        </m.div>
      )}

      <BottomSheet open={whyOpen} onClose={() => setWhyOpen(false)} title="How Jenny explains a match">
        <h2 className="mt-2 pr-12 font-display-serif text-[26px] font-medium">How Jenny explains a match</h2>
        <ul className="mt-3 space-y-2 pl-5 text-[15px]">
          <li className="list-disc">Interests and availability you gave Arena (edit them any time).</li>
          <li className="list-disc">Activities you&apos;ve joined before.</li>
          <li className="list-disc">Distance from your general area — never your exact location.</li>
        </ul>
        <p className="mt-3 text-[15px] text-paper-ink-muted">No scores and no ranking by &ldquo;fit&rdquo;. If a reason is wrong, change your preferences and it changes too.</p>
      </BottomSheet>
    </Screen>
  );
}
