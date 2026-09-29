"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { m } from "motion/react";
import { ArrowLeft, BadgeCheck, CalendarDays, ChevronRight, Flag, HandHeart, MapPin, MessageCircle, MoreVertical, Share2, Tag, Users } from "lucide-react";
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
import { cancelPost, decideJoin, getJoinRequests, getPost, requestJoin, withdrawJoin } from "@/lib/api/posts";
import { getMyProfile, getPublicProfile } from "@/lib/api/profile";
import { distanceKm, formatKm } from "@/lib/data/feed";
import { needWhen } from "@/lib/data/needs";
import { timeAgo } from "@/lib/data/time";
import type { Post, PostJoinRequest, PublicCandidateProfile } from "@/lib/types";

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
  const [offers, setOffers] = useState<PostJoinRequest[] | null>(specimen?.offers ?? null);
  const [open, setOpen] = useState<PostJoinRequest | null>(specimen?.offers.find((o) => o.id === specimen.openOfferId) ?? null);
  const [menu, setMenu] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const reload = useCallback(() => getPost(post.id).then((p) => p && setPost(p)), [post.id]);
  useEffect(() => {
    if (getSession()) getMyProfile().then((p) => setMe({ lat: p.approxLat, lng: p.approxLng })).catch(() => {});
  }, []);
  useEffect(() => {
    if (!post.mine || specimen) return;
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

  const offerHelp = async () => {
    if (!getSession()) return router.push("/auth?mode=signin");
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
  const withdraw = async () => {
    setBusy(true);
    setError("");
    try {
      await withdrawJoin(post.id);
      await reload();
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

  const decided = (updated: PostJoinRequest) => {
    setOffers((cur) => (cur ?? []).map((o) => (o.id === updated.id ? updated : o)));
    setOpen(null);
    void reload();
  };

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
                    <button type="button" onClick={() => setOpen(o)} className="flex min-h-16 w-full items-center gap-3 py-2 text-left">
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
            ) : post.myJoinStatus === "approved" ? (
              post.roomId ? <ButtonLink href={`/rooms/${post.roomId}`}>Open chat</ButtonLink> : <p className="text-center text-[15px]">You&apos;re helping. The chat opens shortly.</p>
            ) : post.myJoinStatus === "pending" ? (
              <div className="space-y-2">
                <p role="status" className="flex items-center justify-center gap-2 text-[15px] font-semibold"><HandHeart className="size-5 text-primary-on-paper" aria-hidden /> {c.sent} — {post.authorName.split(" ")[0]} will review it</p>
                <Button variant="outline" className="border-paper-ink/55 text-paper-ink" onClick={withdraw} loading={busy}>{c.withdraw}</Button>
              </div>
            ) : post.myJoinStatus === "declined" ? (
              <p className="rounded-tile bg-paper-muted p-4 text-center text-[15px]">{post.authorName.split(" ")[0]} {c.declined}</p>
            ) : (
              <Button onClick={offerHelp} loading={busy}>{guest ? c.guestCta : c.cta}</Button>
            )}
          </m.div>
        </m.article>
      </div>

      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} target={{ kind: "post", id: post.id }} person={{ userId: post.authorUserId || undefined, name: post.authorName, detail: title }} />
      <OfferSheet offer={open} post={post} onClose={() => setOpen(null)} onDecided={decided} specimenProfile={specimen?.profile} />

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

/** Board screen 4 — who offered, from their real public profile; Decline / Accept & open chat. */
function OfferSheet({
  offer,
  post,
  onClose,
  onDecided,
  specimenProfile,
}: {
  offer: PostJoinRequest | null;
  post: Post;
  onClose: () => void;
  onDecided: (o: PostJoinRequest) => void;
  specimenProfile?: PublicCandidateProfile;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<PublicCandidateProfile | null | undefined>(specimenProfile);
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState("");
  const [shownFor, setShownFor] = useState<string | null>(null);
  const sheetCopy = COPY[post.intentType === "offer" ? "offer" : "ask"];

  // Reset per offer while rendering (no effect needed for derived resets).
  if (offer && offer.id !== shownFor) {
    setShownFor(offer.id);
    setProfile(specimenProfile);
    setError("");
  }
  useEffect(() => {
    if (!offer || specimenProfile) return;
    let cancelled = false;
    getPublicProfile(offer.userId)
      .then((p) => !cancelled && setProfile(p ?? null))
      .catch(() => !cancelled && setProfile(null));
    return () => {
      cancelled = true;
    };
  }, [offer, specimenProfile]);

  const decide = async (approve: boolean) => {
    if (!offer) return;
    setBusy(approve ? "accept" : "decline");
    setError("");
    try {
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
  return (
    <BottomSheet open={!!offer} onClose={onClose} title={sheetCopy.sheet}>
      {offer && (
        <div className="pt-2">
          <h2 className="font-display-serif text-[24px] font-medium">{sheetCopy.sheet}</h2>
          <div className="mt-4 flex items-center gap-4">
            <Avatar name={offer.userName} className="size-16 text-[22px]" />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[19px] font-semibold">
                {offer.userName}
                {verified && <BadgeCheck className="size-5 text-success-on-paper" aria-label="Verified" />}
              </p>
              <p className="text-[14px] text-paper-ink-muted">Neighbor{profile?.homeCity ? ` · ${profile.homeCity}` : ""}</p>
              {profile?.title && <p className="text-[14px] text-paper-ink-muted">{profile.title}</p>}
            </div>
          </div>
          {profile === undefined && <p className="mt-4 text-[14px] text-paper-ink-muted">Loading their profile…</p>}
          {profile?.bio && <p className="mt-4 rounded-tile bg-paper-muted p-4 text-[15px] italic leading-relaxed">“{profile.bio}”</p>}
          {profile && profile.skills.length > 0 && (
            <div className="mt-4">
              <p className="text-[15px] font-semibold">Skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.skills.slice(0, 6).map((s) => (
                  <span key={s.name} className="rounded-full border border-paper-ink/20 px-3 py-1 text-[13px]">{s.name}</span>
                ))}
              </div>
            </div>
          )}
          <p className="mt-4 text-[14px] text-paper-ink-muted">{sheetCopy.sheetWhen} {timeAgo(offer.createdAt)}.</p>
          <Link href={`/people/${offer.userId}`} className="mt-1 inline-flex min-h-11 items-center text-[15px] font-semibold text-primary-on-paper underline underline-offset-4">See full profile</Link>
          {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
          {offer.status === "pending" ? (
            <>
              <div className="mt-5 grid grid-cols-[auto_1fr] gap-3">
                <Button variant="outline" className="w-auto border-paper-ink/55 px-5 text-paper-ink" loading={busy === "decline"} disabled={busy !== null} onClick={() => decide(false)}>Decline</Button>
                <Button loading={busy === "accept"} disabled={busy !== null} onClick={() => decide(true)} className="px-3 leading-tight min-[375px]:whitespace-nowrap">Accept & open chat</Button>
              </div>
              <p className="mt-2 text-center text-[13px] text-paper-ink-muted">This opens a private chat between the two of you.</p>
            </>
          ) : post.roomId ? (
            <ButtonLink href={`/rooms/${post.roomId}`} className="mt-5">Open chat</ButtonLink>
          ) : null}
        </div>
      )}
    </BottomSheet>
  );
}
