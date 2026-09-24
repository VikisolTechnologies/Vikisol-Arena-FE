"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, LogOut } from "lucide-react";
import { OrbLoader } from "@/components/ui/orb-loader";
import { AppShell } from "@/components/app/AppShell";
import { ChampagneAvatar } from "@/components/home-v3/ChampagneAvatar";
import { ARENA_V3 } from "@/components/home-v3/tokens";
import { getMyProfile } from "@/lib/api/profile";
import { signOut } from "@/lib/api/auth";
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
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    await signOut();
    router.push("/auth");
  };

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
      <AppShell bleed profile={null}>
        <OrbLoader className="h-96" />
      </AppShell>
    );
  }

  const isVerified = !!verification && verification.verificationLevel !== "basic";
  const recent = (myPosts ?? []).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);

  return (
    <AppShell bleed profile={profile}>
      <div style={{ flex: 1, paddingBottom: 24 }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {/* Cover - a flat espresso band, not a fabricated stock photo (no real cover-photo
              upload pipeline exists yet - honest placeholder, same call PersonAvatar's own
              comment already makes for profile photos generally). */}
          <div style={{ position: "relative", height: 120, background: ARENA_V3.espressoLight }}>
            <button
              type="button"
              onClick={() => router.push("/identity/edit")}
              aria-label="Edit profile"
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#ffffff" }}
            >
              <Settings size={20} strokeWidth={1.75} />
            </button>
            {/* Anchored to the cover, not a negative margin on the content below - a negative
                top margin there collapses through its padding-less parent and drags the whole
                block (name, stats, everything) up under the cover instead of just the avatar. */}
            <div style={{ position: "absolute", left: 20, bottom: -34, width: 72, height: 72, borderRadius: "50%", border: `3px solid ${ARENA_V3.ivory}`, overflow: "hidden" }}>
              <ChampagneAvatar name={profile.name} sizePx={66} />
            </div>
          </div>

          <div style={{ padding: "0 20px" }}>
            <div style={{ height: 34 + 14 }} />
            <p style={{ margin: 0, fontFamily: "var(--font-arena-fraunces)", fontSize: 26, color: ARENA_V3.ink }}>{profile.name}</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: ARENA_V3.muted }}>
              {profile.title} · {profile.homeCity ?? profile.location}
            </p>
            {isVerified && <p style={{ margin: "8px 0 0", fontSize: 11, letterSpacing: 2, color: ARENA_V3.goldText }}>VERIFIED</p>}
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

            {/* Onboarding is no longer mandatory (see auth-guard.ts) - this is the "fill later"
                path back to it, shown only while the job-intent questions genuinely haven't
                been answered yet (not just "answered false/skipped", which are real states, not
                an unfinished one). */}
            {profile.cameForJob == null && !profile.organization && profile.currentCtc == null && (
              <button
                type="button"
                onClick={() => router.push("/onboarding")}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  marginBottom: 24,
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: `1px solid ${ARENA_V3.gold}`,
                  background: ARENA_V3.white,
                  cursor: "pointer",
                }}
              >
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: ARENA_V3.ink }}>Complete your profile</p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: ARENA_V3.muted }}>
                  Add your experience and preferences so we can match you to real opportunities.
                </p>
              </button>
            )}

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
                  <p style={{ margin: "0 0 14px", fontSize: 13, color: ARENA_V3.muted }}>Nothing posted yet.</p>
                  {/* ARENA-FINISH-IT.md §2 - "a real button," not a single line of text. */}
                  <button
                    type="button"
                    onClick={() => router.push("/home")}
                    style={{ fontSize: 13, background: ARENA_V3.ink, color: ARENA_V3.ivory, padding: "10px 22px", borderRadius: 20, border: "none", cursor: "pointer" }}
                  >
                    Start something
                  </button>
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

            {/* Profile is where people look for "log out" - kept here as well as in the shell's
                account menu. */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                marginTop: 28,
                marginBottom: 8,
                padding: "13px 0",
                fontSize: 13,
                color: ARENA_V3.muted,
                background: "none",
                border: `1px solid ${ARENA_V3.hairlineCard}`,
                borderRadius: 12,
                cursor: signingOut ? "default" : "pointer",
                opacity: signingOut ? 0.6 : 1,
              }}
            >
              <LogOut size={15} strokeWidth={1.75} />
              {signingOut ? "Signing out…" : "Log out"}
            </button>
          </div>
        </div>
      </div>

    </AppShell>
  );
}
