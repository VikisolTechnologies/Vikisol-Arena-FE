"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, ClipboardList, Store, MessageSquare, Building2, MapPin, Sparkles, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMyProfile } from "@/lib/api/profile";
import { getJobs } from "@/lib/api/jobs";
import { requireOnboarded } from "@/lib/auth-guard";
import { formatINRRange } from "@/lib/format";
import type { CandidateProfile, Job } from "@/lib/types";

const WORK_SURFACES: { href: string; label: string; description: string; icon: LucideIcon }[] = [
  { href: "/discover", label: "Discover", description: "Swipe through jobs matched to your profile", icon: Compass },
  { href: "/applications", label: "Applications", description: "Track every application through the pipeline", icon: ClipboardList },
  { href: "/marketplace", label: "Marketplace", description: "Bid on projects, or post one of your own", icon: Store },
  { href: "/companies", label: "Companies", description: "Browse companies, see open roles, follow the ones you like", icon: Building2 },
  { href: "/agent", label: "Agent", description: "Chat with your agent, approve actions it drafts", icon: MessageSquare },
];

export default function WorkHubPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [topMatch, setTopMatch] = useState<Job | null>(null);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
    getJobs().then((jobs) => {
      const best = [...jobs].sort((a, b) => b.matchPercentage - a.matchPercentage)[0];
      setTopMatch(best ?? null);
    });
  }, [router]);

  if (!profile) {
    return (
      <AppShell title="Work">
        <OrbLoader className="h-96" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Work" profile={profile}>
      <p className="mb-4 text-sm text-muted-foreground">Everything job- and project-related, one tap from your Feed.</p>

      {/* ARENA-VISUAL-RICHNESS.md R1/R4 - Work's named hero: one black "top match" opportunity
          above the ivory hub cards, same fixed-dark-on-purpose treatment as SwipeCard/Home's
          composer bar (see SwipeCard.tsx's comment for why this opts out of the semantic cascade). */}
      {topMatch && (
        <button
          type="button"
          onClick={() => router.push("/discover")}
          className="group relative mb-5 block w-full overflow-hidden rounded-[24px] border border-white/10 bg-ink p-5 text-left text-white shadow-[0_20px_60px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- seeded placeholder, see PersonAvatar/SwipeCard */}
          <img
            src={`https://picsum.photos/seed/${encodeURIComponent(topMatch.id)}/900/280`}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
            loading="lazy"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Your top match</p>
              <h2 className="mt-1 font-display text-xl font-bold tracking-tight">{topMatch.title}</h2>
              <p className="text-sm text-white/60">{topMatch.company}</p>
            </div>
            <Badge variant="secondary" className="gap-1 shrink-0 bg-champagne text-ink">
              <Sparkles className="size-3" /> {topMatch.matchPercentage}% match
            </Badge>
          </div>
          <div className="relative mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/60">
            <span className="flex items-center gap-1">
              <MapPin className="size-3" /> {topMatch.location}
            </span>
            <span>{formatINRRange(topMatch.salaryMin, topMatch.salaryMax, "LPA")}</span>
          </div>
        </button>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {WORK_SURFACES.map(({ href, label, description, icon: Icon }) => (
          <button
            key={href}
            type="button"
            onClick={() => router.push(href)}
            className="text-left transition-transform hover:-translate-y-0.5"
          >
            <Card className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary-soft">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block font-display text-sm font-bold">{label}</span>
                <span className="block text-xs text-muted-foreground">{description}</span>
              </span>
            </Card>
          </button>
        ))}
      </div>
    </AppShell>
  );
}
