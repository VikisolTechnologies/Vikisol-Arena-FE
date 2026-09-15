"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Compass, ClipboardList, Store, MessageSquare, Building2, type LucideIcon } from "lucide-react";
import { OrbLoader } from "@/components/ui/orb-loader";
import { HomeHeader } from "@/components/home-v3/HomeHeader";
import { HomeTabBar } from "@/components/home-v3/HomeTabBar";
import { ARENA_V3 } from "@/components/home-v3/tokens";
import { CreateComposer } from "@/components/create-v3/CreateComposer";
import { getMyProfile } from "@/lib/api/profile";
import { getMyBids } from "@/lib/api/myBids";
import { getProject } from "@/lib/api/market";
import { getMyApplications } from "@/lib/api/applications";
import { getInterviewForApplication } from "@/lib/api/interviews";
import { getJob } from "@/lib/api/jobs";
import { getPosting } from "@/lib/api/enterprise";
import { getMyRooms } from "@/lib/api/rooms";
import { requireOnboarded } from "@/lib/auth-guard";
import { formatFriendlyDateTime } from "@/lib/format";
import type { CandidateProfile } from "@/lib/types";

const EXPLORE_SURFACES: { href: string; label: string; description: string; icon: LucideIcon }[] = [
  { href: "/discover", label: "Discover", description: "Swipe through jobs matched to your profile", icon: Compass },
  { href: "/applications", label: "Applications", description: "Track every application through the pipeline", icon: ClipboardList },
  { href: "/marketplace", label: "Marketplace", description: "Bid on projects, or post one of your own", icon: Store },
  { href: "/companies", label: "Companies", description: "Browse companies, see open roles, follow the ones you like", icon: Building2 },
  { href: "/agent", label: "Agent", description: "Chat with your agent, approve actions it drafts", icon: MessageSquare },
];

interface ActiveItem {
  id: string;
  title: string;
  state: string;
  pillLabel?: string;
  href: string;
}

export default function WorkHubPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [bidItems, setBidItems] = useState<ActiveItem[] | null>(null);
  const [interviewItems, setInterviewItems] = useState<ActiveItem[] | null>(null);
  const [sessionItems, setSessionItems] = useState<ActiveItem[] | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);

    // Live bids - status still pending/shortlisted; won/lost bids aren't something you're
    // currently "in" any more, that's history (Marketplace > My bids covers it).
    getMyBids().then(async (bids) => {
      const live = bids.filter((b) => b.status === "pending" || b.status === "shortlisted");
      const items = await Promise.all(
        live.map(async (b): Promise<ActiveItem> => {
          const project = await getProject(b.projectId);
          return {
            id: b.bidId,
            title: project?.title ?? "Project",
            state: `₹${b.amount.toLocaleString("en-IN")} bid`,
            pillLabel: b.status.toUpperCase(),
            href: `/marketplace/${b.projectId}`,
          };
        }),
      );
      setBidItems(items);
    });

    // Scheduled interviews - only applications actually at the interview stage, and only ones
    // where a real Interview record exists with a proposed or confirmed slot (not every
    // "interview"-stage application has one yet).
    getMyApplications().then(async (apps) => {
      const candidates = apps.filter((a) => a.stage === "interview").slice(0, 10);
      const resolved = await Promise.all(
        candidates.map(async (a): Promise<ActiveItem | null> => {
          const interview = await getInterviewForApplication(a.id);
          if (!interview || (interview.status !== "proposed" && interview.status !== "confirmed")) return null;
          const posting = a.jobId ? await getJob(a.jobId) : a.postingId ? await getPosting(a.postingId) : undefined;
          const confirmedSlot = interview.confirmedSlotId ? interview.proposedSlots.find((s) => s.id === interview.confirmedSlotId) : undefined;
          return {
            id: a.id,
            title: posting?.title ?? "Interview",
            state: confirmedSlot ? formatFriendlyDateTime(confirmedSlot.start) : "Awaiting your confirmation",
            pillLabel: interview.status.toUpperCase(),
            href: `/interviews/${a.id}`,
          };
        }),
      );
      setInterviewItems(resolved.filter((x): x is ActiveItem => x !== null));
    });

    // Joined sessions - real Rooms the viewer is currently in for a still-open activity/need.
    getMyRooms().then((rooms) => {
      const active = rooms.filter((r) => r.postStatus === "open" || r.postStatus === "full");
      setSessionItems(
        active.map((r) => ({
          id: r.id,
          title: r.postBody,
          state: `${r.memberCount} in room`,
          href: `/rooms/${r.id}`,
        })),
      );
    });
  }, [router]);

  if (!profile) {
    return (
      <div style={{ background: ARENA_V3.ivory, minHeight: "100dvh" }}>
        <OrbLoader className="h-96" />
      </div>
    );
  }

  const loading = bidItems === null || interviewItems === null || sessionItems === null;
  const allItems = [...(bidItems ?? []), ...(interviewItems ?? []), ...(sessionItems ?? [])];

  return (
    <div style={{ background: ARENA_V3.ivory, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <HomeHeader profile={profile} onCompose={() => setComposerOpen(true)} />

      <div style={{ flex: 1, paddingBottom: "calc(84px + env(safe-area-inset-bottom))" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "18px 20px 0" }}>
          <p style={{ margin: "0 0 14px", fontSize: 10, letterSpacing: 3, color: ARENA_V3.muted }}>WORK</p>
          <p style={{ margin: 0, fontFamily: "var(--font-arena-fraunces)", fontSize: 28, color: ARENA_V3.ink }}>What you&apos;re in</p>
          <div style={{ width: 40, height: 2, background: ARENA_V3.gold, margin: "14px 0 20px" }} />

          {/* Active items - live bids, then scheduled interviews, then joined sessions, per
              SCREEN 8's stated urgency order. No "Jenny noticed" agent card here: that requires
              a real observation-generating backend that doesn't exist yet (ARENA-FINISH-IT §7
              names the agent/JennySol explicitly out of scope for this pass) - showing one
              anyway would mean fabricating what it "noticed," which this whole build has
              deliberately avoided everywhere else. */}
          {loading ? (
            <OrbLoader className="h-40" />
          ) : allItems.length === 0 ? (
            <div style={{ background: ARENA_V3.white, borderRadius: 14, padding: "24px 20px", textAlign: "center", marginBottom: 24 }}>
              <p style={{ margin: "0 0 8px", fontSize: 15, color: ARENA_V3.ink }}>Nothing active right now</p>
              <p style={{ margin: 0, fontSize: 13, color: ARENA_V3.muted, lineHeight: 1.6 }}>
                Bid on a project, apply to a role, or join an activity - it&apos;ll show up here.
              </p>
            </div>
          ) : (
            <div style={{ background: ARENA_V3.white, borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
              {allItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(item.href)}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: 14, border: "none", background: "none", borderBottom: `1px solid ${ARENA_V3.hairlineCard}`, cursor: "pointer" }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, color: ARENA_V3.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</p>
                    <p style={{ margin: "3px 0 0", fontSize: 12, color: ARENA_V3.muted }}>{item.state}</p>
                  </div>
                  {item.pillLabel ? (
                    <span style={{ flexShrink: 0, fontSize: 10, letterSpacing: 2, color: "#8A6A22", border: "1px solid #E0CDA1", borderRadius: 20, padding: "5px 10px" }}>
                      {item.pillLabel}
                    </span>
                  ) : (
                    <ChevronRight size={16} color="#C9BFB1" style={{ flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>
          )}

          <p style={{ margin: "0 0 10px", fontSize: 10, letterSpacing: 3, color: ARENA_V3.muted }}>EXPLORE</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 24 }}>
            {EXPLORE_SURFACES.map(({ href, label, description, icon: Icon }) => (
              <button
                key={href}
                type="button"
                onClick={() => router.push(href)}
                style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", textAlign: "left", background: ARENA_V3.white, border: "none", borderRadius: 14, padding: 15, cursor: "pointer" }}
              >
                <Icon size={21} strokeWidth={1.5} color={ARENA_V3.ink} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 15, color: ARENA_V3.ink }}>{label}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: ARENA_V3.muted }}>{description}</p>
                </div>
                <ChevronRight size={16} color="#C9BFB1" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <HomeTabBar onCompose={() => setComposerOpen(true)} />
      <CreateComposer open={composerOpen} onOpenChange={setComposerOpen} onPublished={() => {}} />
    </div>
  );
}
