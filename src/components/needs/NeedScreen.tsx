"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { m } from "motion/react";
import { ArrowLeft, BadgeCheck, Briefcase, CalendarDays, ChevronRight, Flag, HandHeart, Heart, MapPin, MessageCircle, MoreVertical, Quote, Share2, ShieldCheck, Tag, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { rise, vibrate } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { DemoBadge } from "@/components/bplus/Primitives";
import { ReportSheet } from "@/components/trust/ReportSheet";
import { useGuest } from "@/hooks/use-arena-session";
import { getSession } from "@/lib/session";
import { cancelPost, decideJoin, getJoinRequests, getPost, getUserPosts, requestJoin, withdrawJoin } from "@/lib/api/posts";
import {
  acceptNeedResponse,
  confirmNeedResponse,
  declineNeedResponse,
  getNeed,
  getNeedResponses,
  respondToNeed,
  withdrawNeedResponse,
  type NeedResponse,
  type NeedResponseCompletion,
} from "@/lib/api/needs";
import { isRealMode } from "@/lib/api/mode";
import { EMPTY_DRAFT, readEntryDraft, subscribeEntryDraft } from "@/lib/data/onboarding";
import { Cover } from "@/components/covers/Cover";
import { getMyProfile, getPublicProfile } from "@/lib/api/profile";
import { distanceKm, formatKm } from "@/lib/data/feed";
import { needWhen } from "@/lib/data/needs";
import { shortDate, timeAgo } from "@/lib/data/time";
import { TextArea } from "@/components/bplus/TextField";
import type { Post, PostJoinRequest, PublicCandidateProfile } from "@/lib/types";

/** `/needs/{id}` is the real source of truth for ASK/OFFER posts (MARATHON-FE area 4) —
 * `Post.myJoinStatus` and the generic `/posts/{id}/joins` list are ALWAYS empty for these posts
 * (verified live: they're a different table entirely, `NeedResponse`, not `PostJoinRequest`).
 * This adapts a `NeedResponse` to the `PostJoinRequest` shape the rest of this screen already
 * renders, so the UI itself didn't need a rewrite — only where the data comes from. "accepted"
 * maps to "approved" since that's the word this screen's own branches already check for. */
type NeedOfferShape = PostJoinRequest & { conversationId?: string; completion?: NeedResponseCompletion };

function toJoinRequestShape(r: NeedResponse): NeedOfferShape {
  return {
    id: r.id,
    postId: r.postId,
    userId: r.userId,
    userName: r.name,
    userEmoji: r.avatarEmoji,
    status: r.status === "accepted" ? "approved" : (r.status as PostJoinRequest["status"]),
    createdAt: r.createdAt,
    conversationId: r.conversationId,
    completion: r.completion,
  };
}

const STATUS: Record<Post["status"], { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-primary/10 text-primary-on-paper" },
  full: { label: "Helpers found", cls: "bg-info/15 text-info-on-paper" },
  closed: { label: "Completed", cls: "bg-success/15 text-success-on-paper" },
  cancelled: { label: "Closed", cls: "bg-paper-ink/10 text-paper-ink-muted" },
  expired: { label: "Expired", cls: "bg-paper-ink/10 text-paper-ink-muted" },
};


/** Needs and offers mirror each other: on a need people offer help; on an offer people ask for it. */
const COPY = {
  ask: { noun: "Need", listTitle: "Offers of help", rowPending: "Offered to help", none: "No offers yet — neighbours nearby can see your need.", cta: "Offer to help", guestCta: "Sign in to offer help", sent: "Offer sent", withdraw: "Withdraw offer", declined: "found help elsewhere. Thank you for offering.", sheet: "Offer details", sheetWhen: "Offered to help", sendFail: "Your offer didn't send. Nothing changed." },
  offer: { noun: "Offer", listTitle: "Requests", rowPending: "Asked for this", none: "No requests yet — neighbours nearby can see your offer.", cta: "Ask for this", guestCta: "Sign in to ask", sent: "Request sent", withdraw: "Withdraw request", declined: "can't help this time. Thanks for asking.", sheet: "Request details", sheetWhen: "Asked", sendFail: "Your request didn't send. Nothing changed." },
} as const;

/** Board "From a local need…" screens 3–4 (and flow §4 O2–O3 for offers): the need page with offers of help, and offer details.
 *  An offer of help is a real join request; accepting it opens the private room. */
export interface NeedSpecimen {
  offers: PostJoinRequest[];
  openOfferId?: string;
  profile?: PublicCandidateProfile;
}

/** `specimen` (dev compare pages only): fixed offers/profile, no loads. */
export function NeedScreen({ post: initial, specimen }: { post: Post; specimen?: NeedSpecimen }) {
  const router = useRouter();
  const guest = useGuest();
  const [post, setPost] = useState(initial);
  const [me, setMe] = useState<{ lat?: number; lng?: number } | null>(null);
  const [offers, setOffers] = useState<NeedOfferShape[] | null>(specimen?.offers ?? null);
  const [open, setOpen] = useState<NeedOfferShape | null>(specimen?.offers.find((o) => o.id === specimen.openOfferId) ?? null);
  const [menu, setMenu] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Real mode only - see toJoinRequestShape's comment. undefined = not loaded yet.
  const [myResponse, setMyResponse] = useState<NeedOfferShape | null | undefined>(specimen ? null : undefined);
  const [myConversationId, setMyConversationId] = useState<string | undefined>(undefined);
  const [respondOpen, setRespondOpen] = useState(false);
  const [message, setMessage] = useState("");

  const reload = useCallback(() => getPost(post.id).then((p) => p && setPost(p)), [post.id]);
  const reloadMyResponse = useCallback(() => {
    if (!isRealMode() || specimen) return;
    getNeed(post.id)
      .then((n) => {
        setMyResponse(n?.viewer?.myResponse ? toJoinRequestShape(n.viewer.myResponse) : null);
        setMyConversationId(n?.viewer?.myResponse?.conversationId);
      })
      .catch(() => setMyResponse(null));
  }, [post.id, specimen]);
  useEffect(() => {
    if (getSession()) getMyProfile().then((p) => setMe({ lat: p.approxLat, lng: p.approxLng })).catch(() => {});
  }, []);
  useEffect(() => {
    void reloadMyResponse();
  }, [reloadMyResponse]);
  useEffect(() => {
    if (!post.mine || specimen) return;
    if (isRealMode()) {
      getNeedResponses(post.id)
        .then((r) => setOffers(r.map(toJoinRequestShape)))
        .catch((err: unknown) => setError(err instanceof Error ? err.message : "Offers didn't load."));
      return;
    }
    getJoinRequests(post.id)
      .then((r) => setOffers(Array.isArray(r) ? r : []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Offers didn't load."));
  }, [post.id, post.mine, specimen]);

  const c = COPY[post.intentType === "offer" ? "offer" : "ask"];
  const title = post.title?.trim() || post.body.slice(0, 80);
  const km = distanceKm(me, { lat: post.approxLat, lng: post.approxLng });
  const active = post.status === "open" || post.status === "full";
  const status = STATUS[post.status] ?? STATUS.open;
  const visibleOffers = (offers ?? []).filter((o) => o.status === "pending" || o.status === "approved");
  const helping = post.spotsFilled;
  // Real mode reads this from GET /needs/{id}'s viewer.myResponse (post.myJoinStatus is always
  // empty for ASK/OFFER posts - verified live, a different table entirely); mock mode keeps
  // reading the generic field it was built against.
  const myJoinStatus = isRealMode() ? myResponse?.status : post.myJoinStatus;

  const offerHelp = async () => {
    if (!getSession()) return router.push("/auth?mode=signin");
    if (isRealMode()) {
      setRespondOpen(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await requestJoin(post.id);
      vibrate();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : c.sendFail);
    } finally {
      setBusy(false);
    }
  };
  const sendResponse = async () => {
    setBusy(true);
    setError("");
    try {
      await respondToNeed(post.id, message.trim());
      vibrate();
      setRespondOpen(false);
      setMessage("");
      await reload();
      await reloadMyResponse();
    } catch (err) {
      setError(err instanceof Error ? err.message : c.sendFail);
    } finally {
      setBusy(false);
    }
  };
  const withdraw = async () => {
    setBusy(true);
    setError("");
    try {
      if (isRealMode()) await withdrawNeedResponse(post.id);
      else await withdrawJoin(post.id);
      await reload();
      await reloadMyResponse();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't withdraw. Your offer still stands.");
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    const text = `${title} — ${post.locationText ?? "nearby"}`;
    try {
      if (navigator.share) return await navigator.share({ title, text, url: window.location.href });
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      setNotice("Copied to your clipboard.");
    } catch {
      /* closed the share sheet */
    }
  };

  // Offer details is a full page (board): opening it adds a history entry, so the phone's Back
  // (or the page's own back arrow) returns to the need.
  const openOffer = (o: PostJoinRequest) => {
    window.history.pushState({ arenaOffer: o.id }, "");
    setOpen(o);
  };
  const closeOffer = () => {
    if (window.history.state?.arenaOffer) window.history.back();
    else setOpen(null);
  };
  useEffect(() => {
    const onPop = () => setOpen(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const decided = (updated: PostJoinRequest) => {
    setOffers((cur) => (cur ?? []).map((o) => (o.id === updated.id ? updated : o)));
    closeOffer();
    void reload();
  };

  if (open) {
    return (
      <AppShell>
        <OfferDetails
          offer={open}
          post={post}
          onBack={closeOffer}
          onDecided={decided}
          onConfirmed={(updated) => {
            setOpen(updated);
            setOffers((cur) => (cur ?? []).map((o) => (o.id === updated.id ? updated : o)));
          }}
          specimenProfile={specimen?.profile}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="-mx-5 -mt-[max(8px,env(safe-area-inset-top))] flex-1 bg-paper px-5 pb-6 pt-[max(12px,env(safe-area-inset-top))] text-paper-ink">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.back()} aria-label="Back" className="-ml-2.5 grid size-11 place-items-center rounded-full hover:bg-paper-muted">
            <ArrowLeft className="size-6" strokeWidth={1.75} aria-hidden />
          </button>
          <p className="flex-1 font-display-serif text-[24px] font-medium">{c.noun}</p>
          <button type="button" onClick={() => setMenu(true)} aria-label="More options" className="-mr-2 grid size-11 place-items-center rounded-full hover:bg-paper-muted">
            <MoreVertical className="size-5" aria-hidden />
          </button>
        </div>

        <m.article initial="hidden" animate="shown" className="mt-2">
          <m.div variants={rise} custom={0}>
            <div className="flex items-start justify-between gap-3">
              <h1 className="font-display-serif text-[26px] font-medium leading-tight">{title}</h1>
              <span className={cn("mt-1.5 shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-semibold", status.cls)}>{status.label}</span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[14px] text-paper-ink-muted">
              <MapPin className="size-4 shrink-0" aria-hidden />
              {post.locationText || "Nearby"}
              {km != null && <> · {formatKm(km)} away</>}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[14px] text-paper-ink-muted">
              <CalendarDays className="size-4 shrink-0" aria-hidden /> {needWhen(post)}
            </p>
            {post.demoContent && <div className="mt-2"><DemoBadge /></div>}
          </m.div>

          {post.body.trim() !== title && <m.p variants={rise} custom={1} className="mt-4 whitespace-pre-line text-[15px] leading-relaxed">{post.body}</m.p>}

          <m.div variants={rise} custom={2} className="mt-4 flex flex-wrap gap-2">
            {post.tags.slice(0, 3).map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-paper-ink/20 px-3 py-1 text-[13px]"><Tag className="size-3.5" aria-hidden /> {t}</span>
            ))}
            {helping > 0 && <span className="inline-flex items-center gap-1.5 rounded-full border border-paper-ink/20 px-3 py-1 text-[13px]"><Users className="size-3.5" aria-hidden /> {helping} {helping === 1 ? "person" : "people"} helping</span>}
          </m.div>

          {post.mediaUrls[0] && (
            <m.img variants={rise} custom={3} src={post.mediaUrls[0]} alt="" className="mt-4 aspect-[16/9] w-full rounded-xl object-cover" />
          )}

          <m.div variants={rise} custom={3} className="mt-4 flex items-center gap-2.5 text-[13px] text-paper-ink-muted">
            <Avatar name={post.authorName} className="size-8 text-[12px]" />
            <span>Posted by <span className="font-semibold text-paper-ink">{post.mine ? "you" : post.authorName}</span> · {timeAgo(post.createdAt)}</span>
          </m.div>

          {post.mine ? (
            <m.section variants={rise} custom={4} className="mt-6" aria-label={c.listTitle}>
              <h2 className="text-[18px] font-semibold">{c.listTitle}{offers ? ` (${visibleOffers.length})` : ""}</h2>
              {!offers && !error && <p className="mt-2 text-[14px] text-paper-ink-muted">Loading…</p>}
              {offers && visibleOffers.length === 0 && <p className="mt-2 text-[14px] text-paper-ink-muted">{c.none}</p>}
              <ul className="mt-2 divide-y divide-paper-ink/10">
                {visibleOffers.map((o) => (
                  <li key={o.id}>
                    <button type="button" onClick={() => openOffer(o)} className="flex min-h-16 w-full items-center gap-3 py-2 text-left">
                      <Avatar name={o.userName} className="size-11 text-[15px]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[16px] font-semibold">{o.userName}</span>
                        <span className="block text-[13px] text-paper-ink-muted">{o.status === "approved" ? "Helping · chat open" : `${c.rowPending} · ${timeAgo(o.createdAt)}`}</span>
                      </span>
                      <ChevronRight className="size-5 text-paper-ink-muted" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </m.section>
          ) : null}

          {error && <p role="alert" className="mt-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
          {notice && <p role="status" className="mt-3 text-center text-[14px] text-paper-ink-muted">{notice}</p>}

          <m.div variants={rise} custom={5} className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-10 -mx-5 mt-6 bg-linear-to-t from-paper from-80% to-transparent px-5 pb-2 pt-4">
            {post.mine ? (
              <>
                {/* Board: Edit · Pause · Close. Share and Open chat live in the ⋯ menu. Editing and
                    pausing a posted need have no API yet (FE-API-GAPS #39), so they say so. */}
                <div className="grid grid-cols-3 gap-2.5">
                  <Button variant="outline" className="border-paper-ink/30 text-paper-ink" disabled={!active} aria-describedby="need-owner-note" onClick={() => setNotice("Editing a posted need isn't available yet. Close it and post again to change it.")}>Edit</Button>
                  <Button variant="outline" className="border-paper-ink/30 text-paper-ink" disabled={!active} aria-describedby="need-owner-note" onClick={() => setNotice("Pausing isn't available yet. Close it if you no longer need help.")}>Pause</Button>
                  <Button
                    variant="outline"
                    className="border-danger-on-paper/60 text-danger-on-paper"
                    loading={busy}
                    disabled={!active}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await cancelPost(post.id);
                        await reload();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Couldn't close it.");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Close
                  </Button>
                </div>
                <p id="need-owner-note" className="sr-only">Edit and Pause aren&apos;t available yet.</p>
              </>
            ) : !active ? (
              <p className="rounded-tile bg-paper-muted p-4 text-center text-[15px]">This {c.noun.toLowerCase()} is {status.label.toLowerCase()}.</p>
            ) : myJoinStatus === "approved" ? (
              isRealMode() ? (
                myConversationId ? <ButtonLink href={`/messages/${myConversationId}`}>Open chat</ButtonLink> : <p className="text-center text-[15px]">You&apos;re helping. The chat opens shortly.</p>
              ) : post.roomId ? (
                <ButtonLink href={`/rooms/${post.roomId}`}>Open chat</ButtonLink>
              ) : (
                <p className="text-center text-[15px]">You&apos;re helping. The chat opens shortly.</p>
              )
            ) : myJoinStatus === "pending" ? (
              <div className="space-y-2">
                <p role="status" className="flex items-center justify-center gap-2 text-[15px] font-semibold"><HandHeart className="size-5 text-primary-on-paper" aria-hidden /> {c.sent} — {post.authorName.split(" ")[0]} will review it</p>
                <Button variant="outline" className="border-paper-ink/55 text-paper-ink" onClick={withdraw} loading={busy}>{c.withdraw}</Button>
              </div>
            ) : myJoinStatus === "declined" ? (
              <p className="rounded-tile bg-paper-muted p-4 text-center text-[15px]">{post.authorName.split(" ")[0]} {c.declined}</p>
            ) : (
              <Button onClick={offerHelp} loading={busy}>{guest ? c.guestCta : c.cta}</Button>
            )}
          </m.div>
        </m.article>
      </div>

      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} target={{ kind: "post", id: post.id }} person={{ userId: post.authorUserId || undefined, name: post.authorName, detail: title }} />

      {/* POST /needs/{id}/responses requires a message - real mode only; mock mode's generic
       * requestJoin() still needs none, so it skips straight to offerHelp(). */}
      <BottomSheet open={respondOpen} onClose={() => setRespondOpen(false)} title={c.sheet}>
        <h2 className="mt-3 pr-12 font-display-serif text-[24px] font-medium">{post.authorName.split(" ")[0]} will see this</h2>
        <div className="mt-4">
          <TextArea label="Your message" value={message} onChange={setMessage} maxLength={500} placeholder={post.intentType === "offer" ? "Why you'd like this…" : "How you can help…"} />
        </div>
        {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
        <Button className="mt-5" loading={busy} disabled={!message.trim()} onClick={sendResponse}>Send</Button>
      </BottomSheet>

      <BottomSheet open={menu} onClose={() => setMenu(false)} title="More">
        <ul className="mt-6 space-y-1">
          <li>
            <button type="button" onClick={() => { setMenu(false); void share(); }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-[16px] hover:bg-paper-muted">
              <Share2 className="size-5" aria-hidden /> Share
            </button>
          </li>
          {post.mine && post.roomId && (
            <li>
              <Link href={`/rooms/${post.roomId}`} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-[16px] hover:bg-paper-muted">
                <MessageCircle className="size-5" aria-hidden /> Open chat
              </Link>
            </li>
          )}
          {!post.mine && (
            <li>
              <button
                type="button"
                onClick={() => {
                  setMenu(false);
                  if (!getSession()) return router.push("/auth?mode=signin");
                  setReportOpen(true);
                }}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-[16px] text-danger-on-paper hover:bg-paper-muted"
              >
                <Flag className="size-5" aria-hidden /> Report
              </button>
            </li>
          )}
        </ul>
      </BottomSheet>
    </AppShell>
  );
}

/** Board screen 4 — Offer details, a full page: who offered (their real public profile), what you
 *  share, what they've done on Arena, and Decline / Accept & open chat. Shared interests use the
 *  interests you picked (on this device) against their skills; outcomes are their own closed posts.
 *  The offer message has no field yet (FE-API-GAPS #13). */
function OfferDetails({
  offer,
  post,
  onBack,
  onDecided,
  onConfirmed,
  specimenProfile,
}: {
  offer: NeedOfferShape;
  post: Post;
  onBack: () => void;
  onDecided: (o: NeedOfferShape) => void;
  onConfirmed: (o: NeedOfferShape) => void;
  specimenProfile?: PublicCandidateProfile;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<PublicCandidateProfile | null | undefined>(specimenProfile);
  const [outcomes, setOutcomes] = useState<Post[] | null>(specimenProfile ? [] : null);
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState("");
  const copy = COPY[post.intentType === "offer" ? "offer" : "ask"];
  const draft = useSyncExternalStore(subscribeEntryDraft, readEntryDraft, () => EMPTY_DRAFT);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (specimenProfile) return;
    let cancelled = false;
    getPublicProfile(offer.userId)
      .then((p) => !cancelled && setProfile(p ?? null))
      .catch(() => !cancelled && setProfile(null));
    getUserPosts(offer.userId, 0, 20)
      .then((page) => !cancelled && setOutcomes(page.content.filter((p) => p.status === "closed" || (p.startsAt && Date.parse(p.startsAt) < Date.now())).slice(0, 3)))
      .catch(() => !cancelled && setOutcomes([]));
    return () => {
      cancelled = true;
    };
  }, [offer.userId, specimenProfile]);

  const decide = async (approve: boolean) => {
    setBusy(approve ? "accept" : "decline");
    setError("");
    try {
      // Accepting a need/offer response opens a private 1:1 conversation
      // (ConversationService), not a post "room" like an activity's join does - a real
      // difference, not an oversight (verified reading NeedService.accept()).
      if (isRealMode()) {
        const updated = approve ? await acceptNeedResponse(post.id, offer.id) : await declineNeedResponse(post.id, offer.id);
        if (!updated) throw new Error("That didn't save. Nothing changed.");
        if (approve) {
          vibrate();
          if (updated.conversationId) return router.push(`/messages/${updated.conversationId}`);
        }
        onDecided(toJoinRequestShape(updated));
        return;
      }
      const updated = await decideJoin(post.id, offer.id, approve);
      if (approve) {
        vibrate();
        const fresh = await getPost(post.id);
        if (fresh?.roomId) return router.push(`/rooms/${fresh.roomId}`);
      }
      onDecided(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't save. Nothing changed.");
    } finally {
      setBusy(null);
    }
  };

  const verified = profile && profile.verificationLevel && profile.verificationLevel !== "basic";
  const mine = draft.interests.map((i) => i.toLowerCase());
  const shared = (profile?.skills ?? []).map((s) => s.name).filter((n) => mine.some((i) => n.toLowerCase().includes(i) || i.includes(n.toLowerCase())));
  const first = offer.userName.split(" ")[0];

  return (
    <div className="-mx-5 -mt-[max(8px,env(safe-area-inset-top))] flex-1 px-4 pb-6 pt-[max(12px,env(safe-area-inset-top))]">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label="Back to the need" className="-ml-1 grid size-11 place-items-center rounded-full hover:bg-foreground/5">
          <ArrowLeft className="size-6" strokeWidth={1.75} aria-hidden />
        </button>
        <h1 className="flex-1 font-display-serif text-[28px] font-medium">{copy.sheet}</h1>
        <Link href={`/people/${offer.userId}`} aria-label={`${offer.userName}'s full profile`} className="-mr-1 grid size-11 place-items-center rounded-full hover:bg-foreground/5">
          <MoreVertical className="size-5" aria-hidden />
        </Link>
      </div>

      <m.article initial="hidden" animate="shown" className="mt-3 rounded-[var(--radius-card)] bg-paper p-4 text-paper-ink">
        <m.div variants={rise} custom={0} className="flex items-center gap-4">
          <Avatar name={offer.userName} className="size-24 text-[30px]" />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[21px] font-semibold leading-tight">
              <span className="truncate">{offer.userName}</span>
              {verified && <BadgeCheck className="size-5 shrink-0 text-success-on-paper" aria-label="Verified" />}
            </p>
            <p className="mt-0.5 text-[14px] text-paper-ink-muted">Neighbor</p>
            {profile?.title && <p className="mt-1 flex items-center gap-1.5 text-[14px]"><Briefcase className="size-4 shrink-0 text-paper-ink-muted" aria-hidden /> <span className="truncate">{profile.title}</span></p>}
            {profile?.homeCity && <p className="mt-0.5 flex items-center gap-1.5 text-[14px]"><MapPin className="size-4 shrink-0 text-paper-ink-muted" aria-hidden /> {profile.homeCity}</p>}
          </div>
        </m.div>

        {profile === undefined && <p className="mt-4 text-[14px] text-paper-ink-muted" aria-busy="true">Loading their profile…</p>}
        {profile?.bio && (
          <m.p variants={rise} custom={1} className="mt-4 flex gap-3 rounded-tile bg-paper-muted p-4 text-[15px] leading-relaxed">
            <Quote className="mt-0.5 size-5 shrink-0 text-primary-on-paper" aria-hidden /> {profile.bio}
          </m.p>
        )}

        {profile && (shared.length > 0 || profile.skills.length > 0) && (
          <m.section variants={rise} custom={2} className="mt-5" aria-label={shared.length ? "Shared interests" : "Skills"}>
            <h2 className="text-[17px] font-semibold">{shared.length ? "Shared interests" : "Skills"}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {(shared.length ? shared : profile.skills.slice(0, 6).map((s) => s.name)).map((n) => (
                <span key={n} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-paper-muted px-3.5 text-[14px]">
                  {shared.length > 0 && <Heart className="size-4 text-success-on-paper" aria-hidden />} {n}
                </span>
              ))}
            </div>
          </m.section>
        )}

        <m.section variants={rise} custom={3} className="mt-5" aria-label="Recent outcomes">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold">Recent outcomes</h2>
            <Link href={`/people/${offer.userId}`} className="inline-flex min-h-11 items-center text-[14px] underline underline-offset-4">See all</Link>
          </div>
          {outcomes === null ? (
            <p className="text-[14px] text-paper-ink-muted">Loading…</p>
          ) : outcomes.length === 0 ? (
            <p className="text-[14px] text-paper-ink-muted">Nothing finished on Arena yet — {first} is new here.</p>
          ) : (
            <ul className="mt-1 space-y-2.5">
              {outcomes.map((o) => (
                <li key={o.id}>
                  <Link href={`/feed/${o.id}`} className="flex items-center gap-3">
                    <Cover source={{ id: o.id, kind: o.intentType, media: o.mediaUrls[0], tags: o.tags, title: o.title, body: o.body, startsAt: o.startsAt }} className="size-16 shrink-0 rounded-xl" />
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold">{o.title || o.body.slice(0, 60)}</span>
                      <span className="block text-[13px] text-paper-ink-muted">{shortDate(o.startsAt ?? o.createdAt, true)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </m.section>

        <p className="mt-5 flex items-center gap-2 rounded-tile bg-info/10 p-3.5 text-[14px]">
          <MessageCircle className="size-4 shrink-0 text-info-on-paper" aria-hidden /> {copy.sheetWhen} {timeAgo(offer.createdAt)}. You can talk details once the chat opens.
        </p>

        {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
        {isRealMode() && offer.status === "approved" && !offer.completion?.ownerConfirmedAt && (
          <Button
            className="mt-5"
            loading={busy === "accept"}
            onClick={async () => {
              setBusy("accept");
              setError("");
              try {
                const updated = await confirmNeedResponse(post.id, offer.id);
                if (updated) onConfirmed(toJoinRequestShape(updated));
              } catch (err) {
                setError(err instanceof Error ? err.message : "That didn't save.");
              } finally {
                setBusy(null);
              }
            }}
          >
            Mark as completed
          </Button>
        )}
        {isRealMode() && offer.completion?.ownerConfirmedAt && (
          <p className="mt-5 rounded-tile bg-success/15 p-4 text-center text-[15px] text-success-on-paper">
            Marked completed{offer.completion.responderConfirmedAt ? " — both sides confirmed." : " — waiting for the other side to confirm too."}
          </p>
        )}
        {offer.status === "pending" ? (
          <>
            <div className="mt-5 grid grid-cols-[auto_1fr] gap-3">
              <Button variant="outline" className="w-auto border-paper-ink/55 px-5 text-paper-ink" loading={busy === "decline"} disabled={busy !== null} onClick={() => decide(false)}>Decline</Button>
              <Button loading={busy === "accept"} disabled={busy !== null} onClick={() => decide(true)} className="min-w-0 gap-1.5 px-3 leading-tight">
                <ShieldCheck className="hidden size-5 shrink-0 min-[400px]:block" aria-hidden /> Accept & open chat
              </Button>
            </div>
            <p className="mt-2 text-center text-[13px] text-paper-ink-muted">This opens a private coordination room for the two of you.</p>
          </>
        ) : isRealMode() && offer.conversationId ? (
          <ButtonLink href={`/messages/${offer.conversationId}`} className="mt-5">Open chat</ButtonLink>
        ) : !isRealMode() && post.roomId ? (
          <ButtonLink href={`/rooms/${post.roomId}`} className="mt-5">Open chat</ButtonLink>
        ) : null}
      </m.article>
    </div>
  );
}
