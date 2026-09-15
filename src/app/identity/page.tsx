"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { OrbLoader } from "@/components/ui/orb-loader";
import { HomeHeader } from "@/components/home-v3/HomeHeader";
import { HomeTabBar } from "@/components/home-v3/HomeTabBar";
import { ChampagneAvatar } from "@/components/home-v3/ChampagneAvatar";
import { ARENA_V3 } from "@/components/home-v3/tokens";
import { CreateComposer } from "@/components/create-v3/CreateComposer";
import { getMyProfile } from "@/lib/api/profile";
import { getMyFollowers } from "@/lib/api/follows";
import { getMyPosts } from "@/lib/api/posts";
import { getMyRooms } from "@/lib/api/rooms";
import { getMyApplications } from "@/lib/api/applications";
import { getMyBids } from "@/lib/api/myBids";
import { getVerificationStatus } from "@/lib/api/verification";
import { requireOnboarded } from "@/lib/auth-guard";
import type { CandidateProfile, Post, VerificationStatus } from "@/lib/types";

function timeAgo(iso: string) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

// Real, honest wording for a Post's "result" line - never a fabricated headcount or status.
function postResultLine(p: Post): string {
  if (p.status === "cancelled") return "Cancelled";
  if (p.status === "expired") return "Expired";
  if (!p.joinable) return `${p.commentCount} comment${p.commentCount === 1 ? "" : "s"}`;
  if (p.spotsFilled === 0) return "No one joined yet";
  return `${p.spotsFilled} joined`;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [myPosts, setMyPosts] = useState<Post[] | null>(null);
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [outcomeCount, setOutcomeCount] = useState<number | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
    getMyFollowers().then((f) => setFollowerCount(f.length));
    getVerificationStatus().then(setVerification);
    getMyPosts().then(setMyPosts);
    getMyRooms().then((rooms) => setSessionCount(rooms.length));
    // "Outcomes" - real positive results only: an offer stage reached, or a bid actually won.
    // Never a fabricated number; no completed-outcome signal yet just reads as 0, not hidden.
    Promise.all([getMyApplications(), getMyBids()]).then(([apps, bids]) => {
      setOutcomeCount(apps.filter((a) => a.stage === "offer").length + bids.filter((b) => b.status === "won").length);
    });
  }, [router]);

  if (!profile) {
    return (
      <div style={{ background: ARENA_V3.ivory, minHeight: "100dvh" }}>
        <OrbLoader className="h-96" />
      </div>
    );
  }

  const isVerified = !!verification && verification.verificationLevel !== "basic";
  const recent = (myPosts ?? []).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);

  return (
    <div style={{ background: ARENA_V3.ivory, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <HomeHeader profile={profile} onCompose={() => setComposerOpen(true)} />

      <div style={{ flex: 1, paddingBottom: "calc(84px + env(safe-area-inset-bottom))" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {/* Cover - a flat espresso band, not a fabricated stock photo (no real cover-photo
              upload pipeline exists yet - honest placeholder, same call PersonAvatar's own
              comment already makes for profile photos generally). */}
          <div style={{ position: "relative", height: 120, background: ARENA_V3.espressoLight }}>
            <button
              type="button"
              onClick={() => router.push("/identity/edit")}
              aria-label="Edit profile"
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: ARENA_V3.ivory }}
            >
              <Settings size={20} strokeWidth={1.75} />
            </button>
          </div>

          <div style={{ padding: "0 20px" }}>
            <div style={{ marginTop: -34, marginBottom: 14 }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", border: `3px solid ${ARENA_V3.ivory}`, overflow: "hidden" }}>
                <ChampagneAvatar name={profile.name} sizePx={66} />
              </div>
            </div>
            <p style={{ margin: 0, fontFamily: "var(--font-arena-fraunces)", fontSize: 26, color: ARENA_V3.ink }}>{profile.name}</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: ARENA_V3.muted }}>
              {profile.title} · {profile.homeCity ?? profile.location}
            </p>
            {isVerified && <p style={{ margin: "8px 0 0", fontSize: 11, letterSpacing: 2, color: ARENA_V3.gold }}>VERIFIED</p>}
            <div style={{ width: 40, height: 2, background: ARENA_V3.gold, margin: "14px 0 20px" }} />

            {/* Stats - Outcomes first, deliberately: "identity in Arena is what you have done,
                not who follows you." */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9, marginBottom: 24 }}>
              {[
                ["Outcomes", outcomeCount],
                ["Sessions", sessionCount],
                ["Followers", followerCount],
              ].map(([label, value]) => (
                <div key={label as string} style={{ background: ARENA_V3.white, borderRadius: 14, padding: 13, textAlign: "center" }}>
                  <p style={{ margin: 0, fontFamily: "var(--font-arena-fraunces)", fontSize: 22, color: ARENA_V3.ink }}>
                    {value == null ? "–" : value}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: ARENA_V3.muted }}>{label}</p>
                </div>
              ))}
            </div>

            {profile.skills.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ margin: "0 0 10px", fontSize: 10, letterSpacing: 3, color: ARENA_V3.muted }}>SKILLS</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {profile.skills.map((s) => (
                    <span key={s.name} style={{ fontSize: 12, color: ARENA_V3.ink, border: `1px solid ${ARENA_V3.hairline}`, borderRadius: 20, padding: "7px 14px" }}>
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <p style={{ margin: "0 0 10px", fontSize: 10, letterSpacing: 3, color: ARENA_V3.muted }}>RECENT</p>
              {myPosts === null ? (
                <OrbLoader className="h-32" />
              ) : recent.length === 0 ? (
                <div style={{ background: ARENA_V3.white, borderRadius: 14, padding: "20px 15px", textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 13, color: ARENA_V3.muted }}>Nothing posted yet.</p>
                </div>
              ) : (
                <div style={{ background: ARENA_V3.white, borderRadius: 14, overflow: "hidden" }}>
                  {recent.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => router.push(`/feed/${p.id}`)}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: 13, border: "none", background: "none", borderBottom: `1px solid ${ARENA_V3.hairlineCard}`, cursor: "pointer" }}
                    >
                      <p style={{ margin: 0, fontSize: 14, color: ARENA_V3.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.title || p.body}
                      </p>
                      <p style={{ margin: "3px 0 0", fontSize: 12, color: ARENA_V3.muted }}>
                        {timeAgo(p.createdAt)} · {postResultLine(p)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <HomeTabBar onCompose={() => setComposerOpen(true)} />
      <CreateComposer open={composerOpen} onOpenChange={setComposerOpen} onPublished={() => {}} />
    </div>
  );
}
