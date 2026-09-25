"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search as SearchIcon, X } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { CompanyCard, JobCard, PostCard, ProjectCard } from "@/components/home-v3/FeedCards";
import { search, type SearchResults, type SearchType } from "@/lib/api/search";
import { allowGuestBrowsing } from "@/lib/auth-guard";
import { cn } from "@/lib/utils";

const TABS: { key: SearchType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "activities", label: "Activities" },
  { key: "discussions", label: "Discussions" },
  { key: "jobs", label: "Jobs" },
  { key: "projects", label: "Projects" },
  { key: "companies", label: "Companies" },
];

type Section = Exclude<SearchType, "all">;
const SECTION_TITLE: Record<Section, string> = {
  activities: "Activities",
  discussions: "Discussions",
  jobs: "Jobs",
  projects: "Projects open for bids",
  companies: "Companies",
};
// "All" shows a few of each kind, with a link into that kind's tab for the rest.
const ALL_PREVIEW = 3;
const SUGGESTIONS = ["basketball", "badminton", "react", "designer", "hyderabad", "remote", "startup"];

function count(r: SearchResults) {
  return r.activities.length + r.discussions.length + r.jobs.length + r.projects.length + r.companies.length;
}

/**
 * Search across Arena - activities, discussions, jobs, projects and companies - from one box.
 * The query and tab live in the URL (?q=&type=), so a search can be shared, bookmarked or
 * reached from any screen's search button.
 */
export default function SearchPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("all");
  // Keyed by the exact query+type it answers, so a slow older response can never overwrite a
  // newer one, and a stale result is never shown under a different query.
  const [result, setResult] = useState<{ key: string; data: SearchResults | null; error?: boolean } | null>(null);

  useEffect(() => {
    if (!allowGuestBrowsing(router)) return;
    const params = new URLSearchParams(window.location.search);
    // Client-only URL read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(params.get("q") ?? "");
    const t = params.get("type") as SearchType | null;
    if (t && TABS.some((x) => x.key === t)) setType(t);
    inputRef.current?.focus();
  }, [router]);

  const trimmed = query.trim();
  const key = `${type}:${trimmed.toLowerCase()}`;

  useEffect(() => {
    const url = new URL(window.location.href);
    if (trimmed) url.searchParams.set("q", trimmed);
    else url.searchParams.delete("q");
    if (type !== "all") url.searchParams.set("type", type);
    else url.searchParams.delete("type");
    window.history.replaceState(null, "", url);

    if (trimmed.length < 2) return;
    let cancelled = false;
    // Debounced - one request once typing pauses, not one per keystroke.
    const timer = setTimeout(() => {
      search(trimmed, type, type === "all" ? 20 : 50)
        .then((data) => !cancelled && setResult({ key, data }))
        .catch(() => !cancelled && setResult({ key, data: null, error: true }));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, type, key]);

  const current = result?.key === key ? result : null;
  const loading = trimmed.length >= 2 && !current;

  function renderSection(section: Section, data: SearchResults, preview: boolean) {
    const items = data[section];
    if (items.length === 0) return null;
    const shown = preview ? items.slice(0, ALL_PREVIEW) : items;
    return (
      <section key={section} className="flex flex-col gap-3">
        {preview && (
          <div className="flex items-baseline justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{SECTION_TITLE[section]}</h2>
            {items.length > ALL_PREVIEW && (
              <button type="button" onClick={() => setType(section)} className="text-[12px] font-medium text-muted-foreground hover:text-foreground">
                See all {items.length}{items.length >= 20 ? "+" : ""} →
              </button>
            )}
          </div>
        )}
        {section === "activities" || section === "discussions"
          ? (shown as SearchResults["activities"]).map((p) => <PostCard key={p.id} post={p} />)
          : section === "jobs"
            ? (shown as SearchResults["jobs"]).map((j) => <JobCard key={j.id} job={j} />)
            : section === "projects"
              ? (shown as SearchResults["projects"]).map((p) => <ProjectCard key={p.id} project={p} />)
              : (shown as SearchResults["companies"]).map((c) => <CompanyCard key={c.id} company={c} />)}
      </section>
    );
  }

  return (
    <AppShell title="Search">
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4">
        <label htmlFor="arena-search" className="relative block">
          <span className="sr-only">Search Arena</span>
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            id="arena-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search activities, discussions, jobs, projects…"
            autoComplete="off"
            enterKeyHint="search"
            className="w-full rounded-full border border-border bg-card py-3 pl-11 pr-11 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </label>

        <div role="tablist" aria-label="Search in" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={type === t.key}
              onClick={() => setType(t.key)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors",
                type === t.key ? "bg-foreground text-background" : "border border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {trimmed.length < 2 ? (
          <div className="flex flex-col gap-3 pt-2">
            <p className="text-[13px] text-muted-foreground">Try searching for</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQuery(s)}
                  className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] text-foreground hover:bg-secondary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : current?.error || !current?.data ? (
          <p className="rounded-2xl border border-border bg-card p-5 text-center text-[14px] text-muted-foreground">
            Search isn&apos;t responding right now - try again in a moment.
          </p>
        ) : count(current.data) === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
            <p className="mb-2 text-[15px] font-medium text-foreground">Nothing matches &ldquo;{trimmed}&rdquo;</p>
            <p className="text-[13px] text-muted-foreground">
              Try fewer or different words{type !== "all" ? ", or search everything" : ""}.{" "}
              {type !== "all" && (
                <button type="button" onClick={() => setType("all")} className="underline">
                  Search all
                </button>
              )}
            </p>
            <p className="mt-4 text-[13px] text-muted-foreground">
              Or <Link href="/discuss" className="underline">ask the community</Link> in Discuss.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {type === "all"
              ? (Object.keys(SECTION_TITLE) as Section[]).map((s) => renderSection(s, current.data!, true))
              : renderSection(type, current.data, false)}
          </div>
        )}
      </div>
    </AppShell>
  );
}
