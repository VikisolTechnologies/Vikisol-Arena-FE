"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon, MapPin, Sparkles, Bookmark } from "lucide-react";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Starfield } from "@/components/landing/Starfield";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getMyEnterpriseProfile, searchTalent } from "@/lib/api/enterprise";
import { getShortlistIds, toggleShortlist } from "@/lib/api/shortlist";
import { getSession, isEnterpriseOnboarded } from "@/lib/session";
import { INDUSTRIES } from "@/lib/mock/seed";
import { cn } from "@/lib/utils";
import type { EnterpriseProfile, CandidateProfile } from "@/lib/types";

type Result = { candidate: CandidateProfile; matchPercentage: number; fitBlurb: string; availability: string };

export default function TalentUniversePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("All");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [shortlist, setShortlist] = useState<string[]>([]);

  useEffect(() => {
    if (!getSession()) { router.replace("/auth"); return; }
    if (!isEnterpriseOnboarded()) { router.replace("/enterprise/onboarding"); return; }
    getMyEnterpriseProfile().then((p) => {
      setProfile(p);
      setShortlist(getShortlistIds());
    });
  }, [router]);

  useEffect(() => {
    searchTalent({ text: query, industry, remoteOnly }).then((r) => setResults(r as Result[]));
  }, [query, industry, remoteOnly]);

  if (!profile) {
    return (
      <EnterpriseAppShell title="Talent Universe">
        <OrbLoader className="h-96" />
      </EnterpriseAppShell>
    );
  }

  return (
    <EnterpriseAppShell profile={profile}>
      <div
        className="relative mb-6 overflow-hidden rounded-[32px] border border-border p-6 sm:p-8"
        style={{ background: "radial-gradient(120% 120% at 50% 0%, #121017 0%, #09090B 60%)" }}
      >
        <Starfield
          active={Boolean(query.trim()) || industry !== "All" || remoteOnly}
          resultCount={results.length}
          seed={`${query}|${industry}|${remoteOnly}`}
        />
        <div className="relative z-[2]">
          <p className="mb-1 font-display text-xs font-bold uppercase tracking-[3px] text-primary-soft">Talent Universe</p>
          <h1 className="font-display text-2xl font-bold tracking-tight">Every talent. One search.</h1>
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Try "React developer" or "Hyderabad"'
                className="border-border bg-white/[0.05] pl-9 backdrop-blur-xl"
              />
            </div>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="h-9 rounded-md border border-border bg-white/[0.05] px-3 text-sm text-foreground outline-none backdrop-blur-xl"
            >
              <option value="All">All industries</option>
              {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setRemoteOnly((v) => !v)}
              className={cn(
                "shrink-0 rounded-md border px-3.5 py-2 text-sm transition-colors",
                remoteOnly ? "border-primary/50 bg-primary/10 text-primary-soft" : "border-border bg-white/[0.05] text-muted-foreground",
              )}
            >
              Remote only
            </button>
          </div>
        </div>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">{results.length} candidates match — only showing profiles visible to enterprises.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map(({ candidate, matchPercentage, fitBlurb, availability }) => {
          const saved = shortlist.includes(candidate.id);
          return (
            <div key={candidate.id} className="rounded-[24px] border border-border bg-white/[0.03] p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{candidate.avatarEmoji}</span>
                  <div>
                    <p className="text-sm font-semibold">{candidate.name}</p>
                    <p className="text-xs text-muted-foreground">{candidate.title}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={saved ? "Remove from shortlist" : "Save to shortlist"}
                  onClick={() => setShortlist(toggleShortlist(candidate.id))}
                >
                  <Bookmark className={cn("size-4", saved ? "fill-primary-soft text-primary-soft" : "text-muted-foreground")} />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="size-3" /> {candidate.location} · {availability}
              </div>
              <p className="mt-2.5 text-xs italic text-muted-foreground">&ldquo;{fitBlurb}&rdquo;</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {candidate.skills.slice(0, 3).map((s) => <Badge key={s.name} variant="secondary" className="bg-white/5 text-[11px] text-muted-foreground">{s.name}</Badge>)}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Badge variant="secondary" className="gap-1 bg-primary/12 text-primary-soft"><Sparkles className="size-3" /> {matchPercentage}%</Badge>
                <Button variant="ghost-glass" size="sm" onClick={() => router.push(`/enterprise/talent/${candidate.id}`)}>View</Button>
              </div>
            </div>
          );
        })}
        {results.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center text-sm text-muted-foreground">
            No candidates match — try a different search.
          </div>
        )}
      </div>
    </EnterpriseAppShell>
  );
}
