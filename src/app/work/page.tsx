"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, ClipboardList, Store, MessageSquare, Building2, type LucideIcon } from "lucide-react";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Card } from "@/components/ui/card";
import { getMyProfile } from "@/lib/api/profile";
import { requireOnboarded } from "@/lib/auth-guard";
import type { CandidateProfile } from "@/lib/types";

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

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
  }, [router]);

  if (!profile) {
    return (
      <CandidateAppShell title="Work">
        <OrbLoader className="h-96" />
      </CandidateAppShell>
    );
  }

  return (
    <CandidateAppShell title="Work" profile={profile}>
      <p className="mb-4 text-sm text-muted-foreground">Everything job- and project-related, one tap from your Feed.</p>
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
    </CandidateAppShell>
  );
}
