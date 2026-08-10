"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CompanyFollowButton } from "@/components/companies/CompanyFollowButton";
import { getMyProfile } from "@/lib/api/profile";
import { listCompanies } from "@/lib/api/companies";
import { requireOnboarded } from "@/lib/auth-guard";
import type { CandidateProfile, Company } from "@/lib/types";

export default function CompaniesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [query, setQuery] = useState("");

  const load = () => { listCompanies(query).then((p) => setCompanies(p.content)); };

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
  }, [router]);

  useEffect(load, [query]);

  if (!profile) {
    return (
      <AppShell title="Companies">
        <OrbLoader className="h-96" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Companies" profile={profile}>
      <div className="relative mb-5 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search companies..." className="border-border bg-card pl-9" />
      </div>

      {!companies ? (
        <OrbLoader className="h-64" />
      ) : companies.length === 0 ? (
        <EmptyState title="No companies found" className="py-16" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => router.push(`/companies/${c.id}`)}
              className="w-full rounded-[24px] border border-border bg-card p-5 text-left transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {/* R2 - company logo; seeded placeholder until real company logos exist. */}
                  {/* eslint-disable-next-line @next/next/no-img-element -- seeded placeholder, see PersonAvatar */}
                  <img
                    src={`https://picsum.photos/seed/${encodeURIComponent(c.id)}/80/80`}
                    alt=""
                    className="size-10 shrink-0 rounded-xl object-cover"
                    loading="lazy"
                  />
                  <div>
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.industry} · {c.size}</p>
                  </div>
                </div>
                <CompanyFollowButton companyId={c.id} initialFollowing={!!c.viewerFollows} />
              </div>
              <div className="mt-3.5 flex items-center gap-2">
                <Badge variant="secondary" className="bg-secondary text-[11px] text-muted-foreground">{c.openJobCount} open role{c.openJobCount === 1 ? "" : "s"}</Badge>
                <Badge variant="secondary" className="bg-secondary text-[11px] text-muted-foreground">{c.followerCount} follower{c.followerCount === 1 ? "" : "s"}</Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </AppShell>
  );
}
