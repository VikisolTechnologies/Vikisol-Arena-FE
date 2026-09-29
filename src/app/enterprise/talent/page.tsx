"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { m } from "motion/react";
import { Bookmark, MapPin, Search as SearchIcon, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { press, rise, spring } from "@/lib/motion";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { Chip } from "@/components/bplus/Controls";
import { Skeleton, StateCard } from "@/components/bplus/Primitives";
import { getMyEnterpriseProfile, searchTalent } from "@/lib/api/enterprise";
import { getShortlistIds, toggleShortlist } from "@/lib/api/shortlist";
import { requireEnterpriseOnboarded } from "@/lib/auth-guard";
import { INDUSTRIES } from "@/lib/mock/seed";
import type { CandidateProfile, EnterpriseProfile } from "@/lib/types";

type Result = { candidate: CandidateProfile; availability: string };
const OPEN_LABEL: Record<string, string> = { "full-time": "Full time", contract: "Contract", projects: "Projects" };

/** Arena for Business — Talent (flow §8; no board — designed in B+). Same `searchTalent` +
 *  shortlist calls. Shows only people whose career visibility is open; no match % or "fit"
 *  blurbs — the page shows what people shared, nothing inferred. */
export default function TalentPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("All");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState(false);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [limit, setLimit] = useState(12);

  useEffect(() => {
    if (!requireEnterpriseOnboarded(router)) return;
    getMyEnterpriseProfile().then(setProfile).catch(() => {});
    getShortlistIds().then(setShortlist).catch(() => {});
  }, [router]);

  useEffect(() => {
    const t = setTimeout(() => setQuery(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => {
    let live = true;
    searchTalent({ text: query, industry, remoteOnly })
      .then((r) => {
        if (!live) return;
        setError(false);
        setLimit(12);
        setResults(r as Result[]);
      })
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [query, industry, remoteOnly]);

  const save = (id: string) => toggleShortlist(id).then(setShortlist).catch(() => {});

  return (
    <EnterpriseAppShell title="Talent" profile={profile}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search talent</span>
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-faint" aria-hidden />
          <input value={text} onChange={(e) => setText(e.target.value)} type="search" placeholder="Skill, role or area — e.g. Event planning, Gachibowli" className="min-h-12 w-full rounded-full border border-field-line bg-surface pl-11 pr-4 text-[15px] outline-none focus-visible:border-primary" />
        </label>
        <label className="flex items-center gap-2">
          <span className="sr-only">Industry</span>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="min-h-12 rounded-full border border-field-line bg-surface px-4 text-[15px] [&>option]:text-paper-ink">
            <option value="All">All industries</option>
            {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
          </select>
        </label>
        <Chip selected={remoteOnly} onToggle={() => setRemoteOnly((v) => !v)}>Open to remote</Chip>
      </div>
      <p className="mt-3 flex items-center gap-2 text-[13px] text-faint"><ShieldCheck className="size-4" aria-hidden /> Only people who made their career visible to companies appear here.</p>

      {error && <p role="alert" className="mt-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">Search didn&apos;t load. Try again.</p>}
      <div className="mt-5">
        {!results ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48" />)}</div>
        ) : results.length === 0 ? (
          <StateCard kind="empty" title="No one matches yet" detail="Try a broader skill or another area." />
        ) : (
          <>
            <p className="mb-3 text-[14px] text-faint" role="status">{results.length} {results.length === 1 ? "person" : "people"}</p>
            <m.ul initial="hidden" animate="shown" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.slice(0, limit).map(({ candidate: c }, i) => {
                const saved = shortlist.includes(c.id);
                return (
                  <m.li key={c.id} variants={rise} custom={i} className="relative flex flex-col rounded-tile border border-line bg-surface p-5 transition-colors duration-200 hover:border-foreground/25">
                    <div className="flex items-start gap-3">
                      <Avatar name={c.name} className="size-12 text-[15px]" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/enterprise/talent/${c.id}`} className="block text-[16px] font-semibold after:absolute after:inset-0 after:rounded-tile focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-primary">{c.name}</Link>
                        <p className="text-[14px] text-faint">{c.title}</p>
                      </div>
                      <m.button type="button" whileTap={press} transition={spring.snappy} onClick={() => save(c.id)} aria-pressed={saved} aria-label={saved ? `Remove ${c.name} from shortlist` : `Save ${c.name} to shortlist`} className="relative z-10 grid size-11 place-items-center rounded-full hover:bg-foreground/8">
                        <Bookmark className={cn("size-5", saved ? "fill-primary text-primary" : "text-faint")} aria-hidden />
                      </m.button>
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-[14px] text-faint"><MapPin className="size-4" aria-hidden /> {c.location || c.homeCity || "Area not shared"}{c.remote && " · Open to remote"}</p>
                    {c.openTo.length > 0 && <p className="mt-1 text-[14px] text-faint">Open to {c.openTo.map((o) => OPEN_LABEL[o] ?? o).join(", ").toLowerCase()} · {c.experienceYears} yrs</p>}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.skills.slice(0, 4).map((s) => <span key={s.name} className="inline-flex items-center gap-1 rounded-full bg-foreground/8 px-2.5 py-0.5 text-[13px]">{s.name}{s.verified && <ShieldCheck className="size-3.5 text-success-on-dark" aria-label="verified" />}</span>)}
                    </div>
                  </m.li>
                );
              })}
            </m.ul>
            {results.length > limit && (
              <div className="mt-5 flex justify-center">
                <button type="button" onClick={() => setLimit((n) => n + 12)} className="min-h-11 rounded-full border border-field-line px-5 text-[15px] font-semibold hover:bg-foreground/5">Show more ({results.length - limit} left)</button>
              </div>
            )}
          </>
        )}
      </div>
    </EnterpriseAppShell>
  );
}
