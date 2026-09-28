"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { m } from "motion/react";
import { Briefcase, Building2, HeartHandshake, Layers, MessagesSquare, Search as SearchIcon, Users, X, type LucideIcon } from "lucide-react";
import { rise } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { Pills, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { search, type SearchResults, type SearchType } from "@/lib/api/search";
import { allowGuestBrowsing } from "@/lib/auth-guard";
import { timeAgo } from "@/lib/data/time";

const SCOPES = [
  { id: "all", label: "All" },
  { id: "activities", label: "Activities" },
  { id: "needs", label: "Needs" },
  { id: "jobs", label: "Jobs" },
  { id: "projects", label: "Projects" },
] as const;
type Scope = (typeof SCOPES)[number]["id"];
/** "Needs" are asks inside the API's discussions results. */
const API_TYPE: Record<Scope, SearchType> = { all: "all", activities: "activities", needs: "discussions", jobs: "jobs", projects: "projects" };
const SUGGESTIONS = ["running", "badminton", "moving help", "designer", "tutoring", "remote"];

interface Row {
  key: string;
  href: string;
  title: string;
  kind: string;
  icon: LucideIcon;
  meta: string;
  media?: string;
  /** ms timestamp when known — "Most recent" sorts on this (correction #4: no relevance score). */
  at?: number;
}

export function toRows(data: SearchResults, scope: Scope): Row[] {
  const rows: Row[] = [];
  const want = (s: Scope) => scope === "all" || scope === s;
  if (want("activities"))
    for (const p of data.activities)
      rows.push({ key: `a-${p.id}`, href: `/feed/${p.id}`, title: p.title?.trim() || p.body.slice(0, 80), kind: "Activity", icon: Users, meta: [p.locationText, timeAgo(p.createdAt)].filter(Boolean).join(" · "), media: p.mediaUrls[0], at: Date.parse(p.createdAt) });
  for (const p of data.discussions) {
    const isNeed = p.intentType === "ask";
    if (isNeed ? !want("needs") : scope !== "all") continue;
    rows.push({ key: `d-${p.id}`, href: `/feed/${p.id}`, title: p.title?.trim() || p.body.slice(0, 80), kind: isNeed ? "Need" : p.intentType === "offer" ? "Offer" : "Discussion", icon: isNeed ? HeartHandshake : MessagesSquare, meta: [p.locationText, timeAgo(p.createdAt)].filter(Boolean).join(" · "), media: p.mediaUrls[0], at: Date.parse(p.createdAt) });
  }
  if (want("jobs"))
    for (const j of data.jobs)
      rows.push({ key: `j-${j.id}`, href: `/jobs/${j.id}`, title: j.title, kind: "Job", icon: Briefcase, meta: [j.company, j.remote ? "Remote" : j.location, j.postedDaysAgo === 0 ? "today" : `${j.postedDaysAgo} d ago`].filter(Boolean).join(" · "), at: Date.now() - j.postedDaysAgo * 86_400_000 });
  if (want("projects"))
    for (const p of data.projects) rows.push({ key: `p-${p.id}`, href: `/marketplace/${p.id}`, title: p.title, kind: "Project", icon: Layers, meta: `₹${p.budgetMin.toLocaleString("en-IN")}–${p.budgetMax.toLocaleString("en-IN")} · ${p.durationWeeks} weeks` });
  if (scope === "all")
    for (const c of data.companies) rows.push({ key: `c-${c.id}`, href: `/companies/${c.id}`, title: c.name, kind: "Company", icon: Building2, meta: `${c.openJobCount} open ${c.openJobCount === 1 ? "job" : "jobs"}` });
  // Dated rows newest first; undated (projects, companies) keep the API's order after them.
  return rows.map((r, i) => ({ r, i })).sort((a, b) => (b.r.at ?? -Infinity) - (a.r.at ?? -Infinity) || a.i - b.i).map(({ r }) => r);
}

/** Board "Messages, trust…" #4 — Search. Query and scope live in the URL (?q=&scope=). */
export function SearchScreen() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const params = useSearchParams();
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [scope, setScope] = useState<Scope>(() => SCOPES.find((x) => x.id === params.get("scope"))?.id ?? "all");
  // Keyed by the exact query+scope it answers so a slow older response never shows under a newer one.
  const [result, setResult] = useState<{ key: string; data: SearchResults | null } | null>(null);

  useEffect(() => {
    if (!allowGuestBrowsing(router)) return;
    input.current?.focus();
  }, [router]);

  const trimmed = query.trim();
  const key = `${scope}:${trimmed.toLowerCase()}`;
  useEffect(() => {
    const url = new URL(window.location.href);
    if (trimmed) url.searchParams.set("q", trimmed);
    else url.searchParams.delete("q");
    if (scope !== "all") url.searchParams.set("scope", scope);
    else url.searchParams.delete("scope");
    window.history.replaceState(null, "", url);
    if (trimmed.length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      search(trimmed, API_TYPE[scope], scope === "all" ? 20 : 50)
        .then((data) => !cancelled && setResult({ key, data }))
        .catch(() => !cancelled && setResult({ key, data: null }));
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmed, scope, key]);

  const current = result?.key === key ? result : null;
  const rows = current?.data ? toRows(current.data, scope) : [];

  return (
    <AppShell>
      <h1 className="pt-3 font-display-serif text-[34px] font-medium leading-tight">Search</h1>
      <label className="mt-4 flex h-[52px] items-center gap-2.5 rounded-full border border-field-line bg-surface px-4 focus-within:border-primary">
        <SearchIcon className="size-5 shrink-0 text-faint" aria-hidden />
        <span className="sr-only">Search Arena</span>
        <input
          ref={input}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Activities, needs, jobs, projects…"
          autoComplete="off"
          enterKeyHint="search"
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(""); input.current?.focus(); }} aria-label="Clear search" className="-mr-2 grid size-11 place-items-center rounded-full text-faint">
            <X className="size-5" aria-hidden />
          </button>
        )}
      </label>
      <div className="mt-4">
        <Pills label="Search in" options={SCOPES} value={scope} onChange={setScope} compact />
      </div>

      <div className="mt-5 flex-1">
        {trimmed.length < 2 ? (
          <div>
            <p className="text-[14px] text-faint">Try searching for</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => setQuery(s)} className="min-h-11 rounded-full border border-field-line px-4 text-[14px]">{s}</button>
              ))}
            </div>
          </div>
        ) : !current ? (
          <div className="space-y-3" aria-busy="true" aria-label="Searching">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[76px] w-full" />)}
          </div>
        ) : !current.data ? (
          <StateCard kind="error" title="Search isn't responding" detail="Try again in a moment." />
        ) : rows.length === 0 ? (
          <StateCard kind="empty" title={`Nothing matches “${trimmed}”`} detail={scope !== "all" ? "Try fewer words, or search everything." : "Try fewer or different words."} action={scope !== "all" ? <button type="button" onClick={() => setScope("all")} className="min-h-11 text-[15px] font-semibold text-primary underline underline-offset-4">Search everything</button> : undefined} />
        ) : (
          <>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-[17px] font-semibold">Results</h2>
              <p className="text-[13px] text-faint">Most recent first</p>
            </div>
            <m.ul key={key} initial="hidden" animate="shown" className="space-y-2.5" aria-label="Search results">
              {rows.map((r, i) => (
                <m.li key={r.key} variants={rise} custom={i}>
                  <Link href={r.href} className="flex min-h-[76px] items-center gap-3 rounded-tile bg-paper p-2.5 pr-3.5 text-paper-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-[radial-gradient(circle_at_30%_20%,var(--warning),var(--primary-pressed)_65%,var(--surface))] text-white">
                      {r.media ? (
                        // eslint-disable-next-line @next/next/no-img-element -- user media
                        <img src={r.media} alt="" className="size-full object-cover" />
                      ) : (
                        <r.icon className="size-6" strokeWidth={1.75} aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-semibold">{r.title}</span>
                      <span className="block truncate text-[13px] text-paper-ink-muted"><span className="font-semibold text-primary-on-paper">{r.kind}</span> · {r.meta}</span>
                    </span>
                  </Link>
                </m.li>
              ))}
            </m.ul>
          </>
        )}
      </div>
    </AppShell>
  );
}
