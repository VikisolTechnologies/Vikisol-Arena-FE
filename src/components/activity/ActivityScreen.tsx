"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { m } from "motion/react";
import {
  ArrowLeft, Bookmark, BookmarkCheck, CalendarDays, ChevronRight, Flag, MapPin, MoreVertical, Share, Share2, Tag, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { rise, vibrate } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { Burst } from "@/components/bplus/Burst";
import { DemoBadge, StateCard } from "@/components/bplus/Primitives";
import { RequirementDialog, requirementFromError, type Requirement } from "@/components/requirements/RequirementForm";
import { PaperPlane, SaferCommunity, StatusTimeline, SuccessCheck, downloadIcs, activityWhen } from "@/components/activity/ActivityParts";
import { cancelPost, decideJoin, getJoinRequests, getPost, reportPost, requestJoin, savePost, unsavePost, withdrawJoin } from "@/lib/api/posts";
import { startChat } from "@/lib/api/messages";
import { getMyProfile } from "@/lib/data/profile";
import { distanceKm, formatKm } from "@/lib/data/feed";
import { getSession } from "@/lib/session";
import { useGuest } from "@/hooks/use-arena-session";
import type { Post, PostJoinRequest } from "@/lib/types";

const JOIN_STEPS = [
  { title: "Request sent", detail: "Just now" },
  { title: "Host will review", detail: "You'll get a notification soon" },
  { title: "If approved", detail: "You'll see full meeting details and be added to the activity room" },
];

/** Board "Discover & join an activity" screens 4–6: details, request sent, approved & ready. */
export function ActivityScreen({ post: initial, sentOpen: sentInitially = false }: { post: Post; sentOpen?: boolean }) {
  const router = useRouter();
  const [post, setPost] = useState(initial);
  const [me, setMe] = useState<{ lat?: number; lng?: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [sentOpen, setSentOpen] = useState(sentInitially);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const signedIn = useGuest() === false;
  const host = post.authorName?.split(" ")[0] ?? "the host";
  const title = post.title?.trim() || post.body.slice(0, 80);

  const reload = useCallback(() => getPost(post.id).then((p) => p && setPost(p)), [post.id]);
  useEffect(() => {
    if (getSession()) getMyProfile().then((p) => setMe({ lat: p.approxLat, lng: p.approxLng })).catch(() => {});
  }, []);

  const km = distanceKm(me, { lat: post.approxLat, lng: post.approxLng });
  const spots = post.capacity != null ? Math.max(0, post.capacity - post.spotsFilled) : null;
  const inactive = post.status === "cancelled" || post.status === "expired" || post.status === "closed";

  const join = async () => {
    if (!getSession()) return router.push(`/auth?mode=signin`);
    setBusy(true);
    setError("");
    try {
      const req = await requestJoin(post.id);
      await reload();
      vibrate();
      if (req.status === "pending") setSentOpen(true);
    } catch (err) {
      const missing = requirementFromError(err);
      if (missing) setRequirement(missing);
      else setError(err instanceof Error ? err.message : "Couldn't send the request. Nothing changed.");
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    setBusy(true);
    setError("");
    try {
      await withdrawJoin(post.id);
      setSentOpen(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't cancel. You're still on the list.");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const text = `${title}\n${activityWhen(post) ?? ""}\n${post.exactMeetingPoint || post.locationText || ""}`.trim();
    try {
      if (navigator.share) return await navigator.share({ title, text, url: window.location.href });
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      setNotice("Copied to your clipboard.");
    } catch {
      /* the person closed the share sheet */
    }
  };

  const toggleSave = async () => {
    if (!getSession()) return router.push("/auth?mode=signin");
    const next = !saved;
    setSaved(next);
    try {
      await (next ? savePost(post.id) : unsavePost(post.id));
    } catch {
      setSaved(!next);
      setNotice("That didn't save. Try again.");
    }
  };

  const message = async () => {
    if (!getSession()) return router.push("/auth?mode=signin");
    try {
      const chat = await startChat({ postId: post.id, anonymous: false });
      router.push(`/messages/${chat.id}`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Couldn't start that chat.");
    }
  };

  if (post.myJoinStatus === "approved" && !post.mine) return <ApprovedView post={post} title={title} host={host} onShare={share} />;

  const facts = [
    spots != null && { icon: Users, text: spots > 0 ? `${spots} ${spots === 1 ? "spot" : "spots"} available` : "This activity is full" },
    post.visibility === "approval" && { icon: Users, text: "The host reviews each request" },
    ...(post.tags ?? []).slice(0, 4).map((t) => ({ icon: Tag, text: t })),
  ].filter(Boolean) as { icon: typeof Users; text: string }[];

  return (
    <AppShell>
      <div className="relative -mx-5 -mt-[max(8px,env(safe-area-inset-top))] aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_30%_20%,var(--warning),var(--primary-pressed)_55%,var(--surface))]">
        {post.mediaUrls[0] && (
          // eslint-disable-next-line @next/next/no-img-element -- user media, any host
          <img src={post.mediaUrls[0]} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        <div className="absolute inset-x-3 top-[max(12px,env(safe-area-inset-top))] flex justify-between">
          <button type="button" onClick={() => router.back()} aria-label="Back" className="grid size-11 place-items-center rounded-full bg-background/60 text-foreground backdrop-blur">
            <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={share} aria-label="Share" className="grid size-11 place-items-center rounded-full bg-background/60 text-foreground backdrop-blur">
              <Share className="size-5" strokeWidth={2} aria-hidden />
            </button>
            <button type="button" onClick={() => setMenuOpen(true)} aria-label="More" className="grid size-11 place-items-center rounded-full bg-background/60 text-foreground backdrop-blur">
              <MoreVertical className="size-5" strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <m.article initial="hidden" animate="shown" className="relative -mx-5 -mt-7 flex-1 rounded-t-[28px] bg-paper px-5 pb-6 pt-6 text-paper-ink">
        <m.div variants={rise} custom={0}>
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display-serif text-[24px] font-medium leading-tight">{title}</h1>
            {"demoContent" in post && post.demoContent && <DemoBadge />}
          </div>
          {post.title && post.body && <p className="mt-1.5 text-[15px] leading-relaxed text-paper-ink-muted">{post.body}</p>}
        </m.div>

        <m.dl variants={rise} custom={1} className="mt-5 space-y-3.5">
          {activityWhen(post) && (
            <div className="flex items-center gap-3">
              <dt className="shrink-0"><CalendarDays className="size-5" strokeWidth={1.75} aria-hidden /><span className="sr-only">When</span></dt>
              <dd className="text-[15px]">{activityWhen(post)}</dd>
            </div>
          )}
          {(post.locationText || km != null) && (
            <div className="flex items-center gap-3">
              <dt className="shrink-0"><MapPin className="size-5" strokeWidth={1.75} aria-hidden /><span className="sr-only">Where</span></dt>
              <dd className="flex min-w-0 flex-1 items-center gap-3 text-[15px]">
                <span className="min-w-0 flex-1">
                  <span className="block">{post.locationText || "Nearby"}</span>
                  <span className="block text-[13px] text-paper-ink-muted">{km != null ? formatKm(km) : "Approximate area"} · exact point shared after you join</span>
                </span>
              <Link href="/discover?view=map" aria-label="See on the map" className="grid h-11 w-14 shrink-0 place-items-center rounded-xl bg-paper-muted">
                <span className="flex items-center text-success-on-paper">
                  <MapPin className="size-5" strokeWidth={2} aria-hidden />
                  <ChevronRight className="size-4 text-paper-ink-muted" strokeWidth={2} aria-hidden />
                </span>
              </Link>
              </dd>
            </div>
          )}
        </m.dl>

        <m.section variants={rise} custom={2} className="mt-6" aria-label="Host">
          <p className="text-[14px] font-medium text-paper-ink-muted">Hosted by</p>
          <div className="mt-2 flex items-center gap-3">
            <Avatar name={post.authorName ?? "Host"} className="size-14 text-[20px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-semibold">{post.authorName}</p>
              {post.authorJoinCount != null && <p className="text-[13px] text-paper-ink-muted">Joined {post.authorJoinCount} activities on Arena</p>}
            </div>
            {!post.mine && (
              <button type="button" onClick={message} className="min-h-11 rounded-button border border-paper-ink/55 px-4 text-[15px] font-semibold">Message</button>
            )}
          </div>
        </m.section>

        {facts.length > 0 && (
          <m.ul variants={rise} custom={3} className="mt-6 space-y-2.5">
            {facts.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-[15px]">
                <f.icon className="size-5 shrink-0 text-paper-ink-muted" strokeWidth={1.75} aria-hidden />
                {f.text}
              </li>
            ))}
          </m.ul>
        )}

        {post.mine ? (
          <HostPanel post={post} onChanged={reload} />
        ) : (
          <m.div variants={rise} custom={4} className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-10 -mx-5 mt-7 bg-linear-to-t from-paper from-80% to-transparent px-5 pb-2 pt-4">
            {error && <p role="alert" className="mb-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
            {inactive ? (
              <p className="rounded-tile bg-paper-muted p-4 text-center text-[15px]">This activity has {post.status === "cancelled" ? "been cancelled" : "ended"}.</p>
            ) : post.myJoinStatus === "pending" ? (
              <div className="space-y-2">
                <Button onClick={() => setSentOpen(true)}>Request sent — see status</Button>
                <Button variant="outline" className="border-paper-ink/55 text-paper-ink" onClick={withdraw} loading={busy}>Cancel request</Button>
              </div>
            ) : post.myJoinStatus === "declined" ? (
              <p className="rounded-tile bg-paper-muted p-4 text-center text-[15px]">The host couldn&apos;t fit you in this time.</p>
            ) : spots === 0 ? (
              <p className="rounded-tile bg-paper-muted p-4 text-center text-[15px]">This activity is full.</p>
            ) : (
              <Button onClick={join} loading={busy}>{signedIn ? (post.visibility === "public" ? "Join" : "Request to join") : "Sign in to join"}</Button>
            )}
          </m.div>
        )}
        {notice && <p role="status" className="mt-3 text-center text-[14px] text-paper-ink-muted">{notice}</p>}
      </m.article>

      <BottomSheet open={sentOpen} onClose={() => setSentOpen(false)} title="Join request sent">
        <div className="pt-4 text-center">
          <PaperPlane />
          <h2 className="mt-5 font-display-serif text-[28px] font-medium">Join request sent!</h2>
          <p className="mt-2 text-[15px] text-paper-ink-muted">
            Your request to join <strong className="font-semibold text-paper-ink">{title}</strong> has been sent to {host}.
          </p>
        </div>
        <StatusTimeline steps={JOIN_STEPS} current={1} />
        <SaferCommunity />
        <Button variant="outline" className="mt-6 border-paper-ink/55 text-paper-ink" onClick={withdraw} loading={busy}>Cancel request</Button>
      </BottomSheet>

      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="More">
        <ul className="mt-6 space-y-1">
          <li>
            <button type="button" onClick={toggleSave} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-[16px] hover:bg-paper-muted">
              {saved ? <BookmarkCheck className="size-5" aria-hidden /> : <Bookmark className="size-5" aria-hidden />} {saved ? "Saved" : "Save for later"}
            </button>
          </li>
          <li>
            <button type="button" onClick={share} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-[16px] hover:bg-paper-muted">
              <Share2 className="size-5" aria-hidden /> Share
            </button>
          </li>
          {!post.mine && (
            <li>
              <button
                type="button"
                onClick={() => {
                  if (!getSession()) return router.push("/auth?mode=signin");
                  reportPost(post.id, "Reported from the activity page").then(() => setNotice("Reported. Our team will review it.")).catch(() => setNotice("That report didn't send. Try again."));
                  setMenuOpen(false);
                }}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-[16px] text-danger-on-paper hover:bg-paper-muted"
              >
                <Flag className="size-5" aria-hidden /> Report
              </button>
            </li>
          )}
        </ul>
      </BottomSheet>

      <RequirementDialog requirement={requirement} onOpenChange={(open) => !open && setRequirement(null)} onDone={() => { setRequirement(null); void join(); }} />
    </AppShell>
  );
}

function ApprovedView({ post, title, host, onShare }: { post: Post; title: string; host: string; onShare: () => void }) {
  const router = useRouter();
  const point = post.exactMeetingPoint || post.locationText;
  return (
    <AppShell>
      <div className="-mx-5 -mt-[max(8px,env(safe-area-inset-top))] flex-1 bg-paper px-5 pb-6 pt-[max(12px,env(safe-area-inset-top))] text-paper-ink">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="-ml-2.5 grid size-11 place-items-center rounded-full hover:bg-paper-muted">
          <ArrowLeft className="size-6" strokeWidth={1.75} aria-hidden />
        </button>
        <div className="relative mt-2 text-center">
          <div className="relative mx-auto w-fit">
            <SuccessCheck />
            <Burst count={16} radius={80} />
          </div>
          <h1 className="mt-5 font-display-serif text-[30px] font-medium">You&apos;re in!</h1>
          <p className="mt-1 text-[15px] text-paper-ink-muted">{host} has approved your request. Here are the meeting details.</p>
        </div>

        <section className="mt-6 overflow-hidden rounded-tile border border-paper-ink/15" aria-label="Meeting details">
          <div className="flex items-start gap-3 p-4">
            <MapPin className="mt-0.5 size-6 shrink-0 text-success-on-paper" strokeWidth={2} aria-hidden />
            <div className="min-w-0">
              <p className="text-[13px] text-paper-ink-muted">Meeting point</p>
              <p className="text-[17px] font-semibold">{point ?? "The host will share the exact point"}</p>
              {post.exactMeetingPoint && post.locationText && <p className="text-[14px] text-paper-ink-muted">{post.locationText}</p>}
            </div>
          </div>
          {post.mediaUrls[0] && (
            // eslint-disable-next-line @next/next/no-img-element -- user media
            <img src={post.mediaUrls[0]} alt="" className="mx-4 aspect-[16/9] w-[calc(100%-2rem)] rounded-xl object-cover" />
          )}
          {post.startsAt && (
            <div className="p-4">
              <p className="flex items-center gap-3 text-[15px]">
                <CalendarDays className="size-5" strokeWidth={1.75} aria-hidden />
                {activityWhen(post)}
              </p>
              <button
                type="button"
                onClick={() => downloadIcs({ id: post.id, title, startsAt: post.startsAt!, endsAt: post.endsAt, location: point ?? undefined })}
                className="mt-3 min-h-11 w-full rounded-button border border-paper-ink/55 text-[15px] font-semibold"
              >
                Add to calendar
              </button>
            </div>
          )}
        </section>

        <ul className="mt-2 divide-y divide-paper-ink/10">
          <li>
            <button type="button" onClick={onShare} className="flex min-h-14 w-full items-center gap-3 text-left text-[16px]">
              <Share2 className="size-5" strokeWidth={1.75} aria-hidden />
              <span className="flex-1">Share with group</span>
              <ChevronRight className="size-5 text-paper-ink-muted" aria-hidden />
            </button>
          </li>
        </ul>

        {post.roomId ? (
          <ButtonLink href={`/rooms/${post.roomId}`} className="mt-5">Open activity room</ButtonLink>
        ) : (
          <p className="mt-5 text-center text-[14px] text-paper-ink-muted">The activity room opens once the host sets it up.</p>
        )}
      </div>
    </AppShell>
  );
}

/** Host's view: the request queue (approve / decline) and cancel. */
function HostPanel({ post, onChanged }: { post: Post; onChanged: () => void }) {
  const [requests, setRequests] = useState<PostJoinRequest[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  useEffect(() => {
    getJoinRequests(post.id).then(setRequests).catch((err: unknown) => setError(err instanceof Error ? err.message : "Requests didn't load."));
  }, [post.id]);
  const pending = (requests ?? []).filter((r) => r.status === "pending");
  const approved = (requests ?? []).filter((r) => r.status === "approved");
  const decide = async (r: PostJoinRequest, approve: boolean) => {
    setBusyId(r.id);
    try {
      const updated = await decideJoin(post.id, r.id, approve);
      setRequests((cur) => (cur ?? []).map((x) => (x.id === r.id ? updated : x)));
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't save.");
    } finally {
      setBusyId(null);
    }
  };
  return (
    <section className="mt-7" aria-label="Your activity">
      <h2 className="text-[17px] font-semibold">Requests to join</h2>
      {error && <p role="alert" className="mt-2 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      {!requests && !error && <p className="mt-2 text-[14px] text-paper-ink-muted">Loading…</p>}
      {requests && pending.length === 0 && <p className="mt-2 text-[14px] text-paper-ink-muted">No one is waiting. {approved.length} going.</p>}
      <ul className="mt-3 space-y-2.5">
        {pending.map((r) => (
          <li key={r.id} className="flex items-center gap-3 rounded-tile bg-paper-muted p-3">
            <Avatar name={r.userName} className="size-10 text-[15px]" />
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{r.userName}</span>
            <button type="button" disabled={busyId === r.id} onClick={() => decide(r, false)} className="min-h-11 rounded-full border border-paper-ink/55 px-3 text-[14px] font-semibold">Decline</button>
            <button type="button" disabled={busyId === r.id} onClick={() => decide(r, true)} className={cn("min-h-11 rounded-full bg-primary px-4 text-[14px] font-bold text-paper-ink")}>Approve</button>
          </li>
        ))}
      </ul>
      <div className="mt-6 space-y-2">
        {post.roomId && <ButtonLink href={`/rooms/${post.roomId}`}>Open activity room</ButtonLink>}
        {post.status !== "cancelled" && (
          <Button
            variant="outline"
            className="border-danger-on-paper/60 text-danger-on-paper"
            loading={cancelling}
            onClick={async () => {
              setCancelling(true);
              try {
                await cancelPost(post.id);
                onChanged();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Couldn't cancel.");
              } finally {
                setCancelling(false);
              }
            }}
          >
            Cancel activity
          </Button>
        )}
      </div>
    </section>
  );
}

export function ActivityMissing() {
  return (
    <AppShell>
      <div className="pt-10">
        <StateCard kind="empty" title="This activity isn't available" detail="It may have been removed, or the link is wrong." action={<ButtonLink href="/discover">Discover activities</ButtonLink>} />
      </div>
    </AppShell>
  );
}
