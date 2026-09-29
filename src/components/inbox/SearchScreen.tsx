"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { m } from "motion/react";
import { Bookmark, Briefcase, Building2, Check, ChevronRight, HeartHandshake, Layers, MapPin, MessagesSquare, Search as SearchIcon, ShieldCheck, Sparkles, UserRound, Users, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { rise } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button } from "@/components/bplus/Button";
import { Pills, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { search, type SearchResults, type SearchType } from "@/lib/api/search";
import { savePost, unsavePost } from "@/lib/api/posts";
import { isRealMode } from "@/lib/api/mode";
import { distanceKm, getFeedItems, originFor, whenLabel, type FeedItem, type Origin } from "@/lib/data/feed";
import { AREAS, EMPTY_DRAFT, readEntryDraft, subscribeEntryDraft, writeEntryDraft } from "@/lib/data/onboarding";
import { FIXTURES_ALLOWED } from "@/lib/data/mode";
import { PREVIEW_PEOPLE } from "@/lib/data/fixtures";
import type { Post } from "@/lib/types";
import { allowGuestBrowsing } from "@/lib/auth-guard";
import { timeAgo } from "@/lib/data/time";
import { Cover } from "@/components/covers/Cover";

const SCOPES = [
  { id: "all", label: "All" },
  { id: "people", label: "People" },
  { id: "activities", label: "Activities" },
  { id: "needs", label: "Needs" },
  { id: "jobs", label: "Jobs" },
  { id: "skills", label: "Skills" },
] as const;
type Scope = (typeof SCOPES)[number]["id"];
const SCOPE_ICONS: Partial<Record<Scope, LucideIcon>> = { people: UserRound, activities: Users, needs: HeartHandshake, jobs: Briefcase, skills: Sparkles };
/** "Needs" are asks inside the API's discussions results. People and Skills have no API search yet
 *  (FE-API-GAPS #17): preview mode searches the preview neighbours; real mode says so. */
const API_TYPE: Record<Scope, SearchType | null> = { all: "all", people: null, activities: "activities", needs: "discussions", jobs: "jobs", skills: null };
const RADII = [2, 5, 10, 0] as const; // 0 = any distance
type Sort = "recent" | "nearest";

interface Row {
  key: string;
  href: string;
  title: string;
  kind: string;
  icon: LucideIcon;
  meta: string;
  media?: string;
  place?: string;
  /** km from the chosen area, when the item has a point. */
  km?: number | null;
  /** Posts can be saved from the row. */
  postId?: string;
  person?: string;
  /** ms timestamp when known — "Most recent" sorts on this (correction #4: no relevance score). */
  at?: number;
  /** Activities get a generated cover when they have no photo. */
  cover?: { id: string; tags?: string[]; title?: string; startsAt?: string };
}

const KIND_TONE: Record<string, string> = { Activity: "text-success-on-paper", Need: "text-primary-on-paper", Offer: "text-success-on-paper", Job: "text-info-on-paper", Person: "text-info-on-paper" };

export function toRows(data: SearchResults, scope: Scope, origin?: Origin): Row[] {
  const rows: Row[] = [];
  const want = (s: Scope) => scope === "all" || scope === s;
  const km = (p: Post) => (origin ? distanceKm(origin, { lat: p.approxLat, lng: p.approxLng }) : null);
  if (want("activities"))
    for (const p of data.activities)
      rows.push({ key: `a-${p.id}`, href: `/feed/${p.id}`, title: p.title?.trim() || p.body.slice(0, 80), kind: "Activity", icon: Users, meta: (p.startsAt && whenLabel(p.startsAt)) || timeAgo(p.createdAt), place: p.locationText, km: km(p), postId: p.id, media: p.mediaUrls[0], at: Date.parse(p.createdAt), cover: { id: p.id, tags: p.tags, title: p.title, startsAt: p.startsAt } });
  for (const p of data.discussions) {
    const isNeed = p.intentType === "ask";
    if (isNeed ? !want("needs") : scope !== "all") continue;
    rows.push({ key: `d-${p.id}`, href: `/feed/${p.id}`, title: p.title?.trim() || p.body.slice(0, 80), kind: isNeed ? "Need" : p.intentType === "offer" ? "Offer" : "Discussion", icon: isNeed ? HeartHandshake : MessagesSquare, meta: (p.startsAt && whenLabel(p.startsAt)) || "Flexible dates", place: p.locationText, km: km(p), postId: p.id, media: p.mediaUrls[0], at: Date.parse(p.createdAt) });
  }
  if (want("jobs"))
    for (const j of data.jobs)
      rows.push({ key: `j-${j.id}`, href: `/jobs/${j.id}`, title: j.title, kind: "Job", icon: Briefcase, meta: [j.company, j.employmentType].filter(Boolean).join(" · "), place: j.remote ? "Remote" : j.location, at: Date.now() - j.postedDaysAgo * 86_400_000 });
  if (scope === "all")
    for (const p of data.projects) rows.push({ key: `p-${p.id}`, href: `/marketplace/${p.id}`, title: p.title, kind: "Project", icon: Layers, meta: `₹${p.budgetMin.toLocaleString("en-IN")}–${p.budgetMax.toLocaleString("en-IN")} · ${p.durationWeeks} weeks` });
  if (scope === "all")
    for (const c of data.companies) rows.push({ key: `c-${c.id}`, href: `/companies/${c.id}`, title: c.name, kind: "Company", icon: Building2, meta: `${c.openJobCount} open ${c.openJobCount === 1 ? "job" : "jobs"}` });
  // Dated rows newest first; undated (projects, companies) keep the API's order after them.
  return rows.map((r, i) => ({ r, i })).sort((a, b) => (b.r.at ?? -Infinity) - (a.r.at ?? -Infinity) || a.i - b.i).map(({ r }) => r);
}

/** Preview mode only: the preview neighbours as people/skills results (gap #17 in real mode). */
function previewPeopleRows(q: string, skills: boolean): Row[] {
  const t = q.toLowerCase();
  return PREVIEW_PEOPLE.filter((p) => !t || `${skills ? "" : p.name} ${p.interests.join(" ")}`.toLowerCase().includes(t)).map((p) => ({
    key: `u-${p.id}`,
    href: `/people/${p.id}`,
    title: p.name,
    kind: skills ? "Skills" : "Person",
    icon: UserRound,
    meta: p.interests.join(", "),
    km: p.distanceKm,
    person: p.name,
  }));
}

/** Board "Messages, trust…" #4 — Search: scopes, the area, a radius and a results list with
 *  photos. Query and scope live in the URL (?q=&scope=). Before anything is typed it lists what's
 *  newest nearby — still real results, not suggestions. */
export function SearchScreen() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const params = useSearchParams();
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [scope, setScope] = useState<Scope>(() => SCOPES.find((x) => x.id === params.get("scope"))?.id ?? "all");
  const [radius, setRadius] = useState<(typeof RADII)[number]>(5);
  const [sort, setSort] = useState<Sort>("recent");
  const [sheet, setSheet] = useState<"area" | "radius" | "safe" | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const draft = useSyncExternalStore(subscribeEntryDraft, readEntryDraft, () => EMPTY_DRAFT);
  const area = draft.area || AREAS[0];
  const origin = useMemo(() => originFor(null, area), [area]);
  // Keyed by the exact query+scope it answers so a slow older response never shows under a newer one.
  const [result, setResult] = useState<{ key: string; data: SearchResults | null } | null>(null);
  const [nearby, setNearby] = useState<FeedItem[] | null>(null);

  useEffect(() => {
    if (!allowGuestBrowsing(router)) return;
    input.current?.focus();
    getFeedItems("for-you", 0, 40).then(setNearby).catch(() => setNearby([]));
  }, [router]);

  const trimmed = query.trim();
  const apiType = API_TYPE[scope];
  const key = `${scope}:${trimmed.toLowerCase()}`;
  useEffect(() => {
    const url = new URL(window.location.href);
    if (trimmed) url.searchParams.set("q", trimmed);
    else url.searchParams.delete("q");
    if (scope !== "all") url.searchParams.set("scope", scope);
    else url.searchParams.delete("scope");
    window.history.replaceState(null, "", url);
    if (trimmed.length < 2 || !apiType) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      search(trimmed, apiType, scope === "all" ? 20 : 50)
        .then((data) => !cancelled && setResult({ key, data }))
        .catch(() => !cancelled && setResult({ key, data: null }));
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmed, scope, key, apiType]);

  const peopleScope = scope === "people" || scope === "skills";
  const current = result?.key === key ? result : null;
  let rows: Row[] = [];
  if (peopleScope) rows = FIXTURES_ALLOWED && !isRealMode() ? previewPeopleRows(trimmed, scope === "skills") : [];
  else if (trimmed.length >= 2) rows = current?.data ? toRows(current.data, scope, origin) : [];
  else if (nearby) {
    // Nothing typed yet: the newest things nearby, as results.
    const asResults: SearchResults = { query: "", activities: [], discussions: [], jobs: [], projects: [], companies: [] };
    for (const i of nearby) {
      const post = { ...i, intentType: i.itemType, audience: "global", visibility: i.visibility ?? "public", spotsFilled: i.spotsFilled ?? 0, joinable: !!i.joinable, commentCount: 0, reactionCount: 0, authorJoinCount: 0, authorAccountAgeDays: 0, authorUserId: i.authorUserId ?? "", authorName: i.authorName ?? "", authorEmoji: "" } as unknown as Post;
      if (i.itemType === "activity") asResults.activities.push(post);
      else if (i.itemType === "ask" || i.itemType === "offer") asResults.discussions.push(post);
    }
    rows = toRows(asResults, scope, origin).filter((r) => r.km != null);
  }
  // Radius: items with a point outside it drop out; items without one stay, marked "distance unknown".
  if (radius) rows = rows.filter((r) => r.km == null || r.km <= radius);
  if (sort === "nearest" || peopleScope) rows = [...rows].sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
  const waiting = !peopleScope && (trimmed.length >= 2 ? !current : !nearby);

  const toggleSave = async (postId: string) => {
    const next = !saved[postId];
    setSaved((m) => ({ ...m, [postId]: next }));
    try {
      await (next ? savePost(postId) : unsavePost(postId));
    } catch {
      setSaved((m) => ({ ...m, [postId]: !next }));
    }
  };

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
          placeholder="People, activities, needs, skills, jobs…"
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
        <Pills label="Search in" options={SCOPES} value={scope} onChange={setScope} icons={SCOPE_ICONS} compact />
      </div>
      <button type="button" onClick={() => setSheet("area")} className="mt-3 flex min-h-12 w-full items-center gap-3 rounded-full border border-field-line px-4 text-left text-[15px]">
        <MapPin className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="text-faint">Near</span>
        <span className="min-w-0 flex-1 truncate font-medium">{area}</span>
        <ChevronRight className="size-5 shrink-0 text-faint" aria-hidden />
      </button>
      <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
        <button type="button" onClick={() => setSheet("radius")} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-field-line px-4 text-[15px]">
          {radius ? `Within ${radius} km` : "Any distance"} <ChevronRight className="size-4 text-faint" aria-hidden />
        </button>
        <button type="button" onClick={() => setSheet("safe")} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-field-line px-4 text-[15px]">
          <ShieldCheck className="size-4 text-success-on-dark" aria-hidden /> Safe &amp; private <ChevronRight className="size-4 text-faint" aria-hidden />
        </button>
      </div>

      <div className="mt-5 flex-1">
        {peopleScope && (isRealMode() || !FIXTURES_ALLOWED) ? (
          <StateCard kind="empty" title={scope === "people" ? "People search is coming" : "Skill search is coming"} detail="For now, find neighbours through activities and needs you join." />
        ) : waiting ? (
          <div className="space-y-3" aria-busy="true" aria-label="Searching">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[92px] w-full" />)}
          </div>
        ) : trimmed.length >= 2 && !peopleScope && !current?.data ? (
          <StateCard kind="error" title="Search isn't responding" detail="Try again in a moment." />
        ) : rows.length === 0 ? (
          <StateCard kind="empty" title={trimmed ? `Nothing matches “${trimmed}”` : `Nothing within ${radius || "any"} km yet`} detail={radius && radius < 10 ? "Try a wider distance or fewer words." : scope !== "all" ? "Try fewer words, or search everything." : "Try fewer or different words."} action={radius && radius < 10 ? <button type="button" onClick={() => setRadius(10)} className="min-h-11 text-[15px] font-semibold text-primary underline underline-offset-4">Widen to 10 km</button> : scope !== "all" ? <button type="button" onClick={() => setScope("all")} className="min-h-11 text-[15px] font-semibold text-primary underline underline-offset-4">Search everything</button> : undefined} />
        ) : (
          <>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-[17px] font-semibold">{trimmed ? "Results" : peopleScope ? "People nearby" : "Newest nearby"}</h2>
              {peopleScope ? <p className="text-[13px] text-faint">Nearest first</p> : <button type="button" onClick={() => setSort((s) => (s === "recent" ? "nearest" : "recent"))} className="min-h-11 text-[13px] text-faint underline underline-offset-4" aria-label={`Sort: ${sort === "recent" ? "most recent first" : "nearest first"}. Change`}>
                {sort === "recent" ? "Most recent first" : "Nearest first"}
              </button>}
            </div>
            <m.ul key={`${key}-${sort}-${radius}`} initial="hidden" animate="shown" className="space-y-2.5" aria-label="Search results">
              {rows.map((r, i) => (
                <m.li key={r.key} variants={rise} custom={i} className="relative">
                  <Link href={r.href} className="flex min-h-[92px] items-center gap-3 rounded-tile bg-paper p-2 pr-14 text-paper-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <span className="grid size-[76px] shrink-0 place-items-center overflow-hidden rounded-xl bg-[radial-gradient(circle_at_30%_20%,var(--warning),var(--primary-pressed)_65%,var(--surface))] text-white">
                      {r.person ? (
                        <Avatar name={r.person} className="size-full rounded-none text-[22px]" />
                      ) : r.media || r.cover ? (
                        <Cover source={{ id: r.cover?.id ?? r.key, kind: r.cover ? "activity" : undefined, media: r.media, tags: r.cover?.tags, title: r.cover?.title, startsAt: r.cover?.startsAt }} className="size-full" sizes="96px" />
                      ) : (
                        <r.icon className="size-7" strokeWidth={1.75} aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-semibold">{r.title}</span>
                      <span className="block truncate text-[13px] text-paper-ink-muted"><span className={cn("font-semibold", KIND_TONE[r.kind] ?? "text-primary-on-paper")}>{r.kind}</span> · {r.meta}</span>
                      {(r.place || r.km != null) && (
                        <span className="mt-0.5 flex items-center gap-1 text-[13px] text-paper-ink-muted">
                          <MapPin className="size-3.5 shrink-0 text-success-on-paper" strokeWidth={2} aria-hidden />
                          <span className="truncate">{[r.place, r.km != null ? `${Math.round(r.km * 10) / 10} km` : r.postId ? "distance unknown" : null].filter(Boolean).join(" · ")}</span>
                        </span>
                      )}
                    </span>
                  </Link>
                  {r.postId ? (
                    <button type="button" onClick={() => void toggleSave(r.postId!)} aria-pressed={!!saved[r.postId]} aria-label={`${saved[r.postId] ? "Saved" : "Save"} ${r.title}`} className="absolute right-1.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full text-paper-ink">
                      <Bookmark className="size-5" strokeWidth={1.9} fill={saved[r.postId] ? "currentColor" : "none"} aria-hidden />
                    </button>
                  ) : r.person ? (
                    <UserRound aria-hidden className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-paper-ink" strokeWidth={1.9} />
                  ) : null}
                </m.li>
              ))}
            </m.ul>
          </>
        )}
      </div>

      <BottomSheet open={sheet === "area"} onClose={() => setSheet(null)} title="Near">
        <h2 className="mt-2 font-display-serif text-[26px] font-medium">Search near</h2>
        <ul className="mt-4 space-y-1">
          {AREAS.map((a) => (
            <li key={a}>
              <button type="button" onClick={() => { writeEntryDraft({ ...readEntryDraft(), area: a }); setSheet(null); }} aria-pressed={a === area} className="flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-left text-[16px] hover:bg-paper-muted">
                {a} {a === area && <Check className="size-5 text-primary-on-paper" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] text-paper-ink-muted">This is also your area on the Feed and Discover.</p>
      </BottomSheet>
      <BottomSheet open={sheet === "radius"} onClose={() => setSheet(null)} title="Distance">
        <h2 className="mt-2 font-display-serif text-[26px] font-medium">How far?</h2>
        <ul className="mt-4 space-y-1">
          {RADII.map((r) => (
            <li key={r}>
              <button type="button" onClick={() => { setRadius(r); setSheet(null); }} aria-pressed={r === radius} className="flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-left text-[16px] hover:bg-paper-muted">
                {r ? `Within ${r} km` : "Any distance"} {r === radius && <Check className="size-5 text-primary-on-paper" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] text-paper-ink-muted">Measured from your area&apos;s centre. Jobs and anything without a place stay in the list, marked &ldquo;distance unknown&rdquo;.</p>
      </BottomSheet>
      <BottomSheet open={sheet === "safe"} onClose={() => setSheet(null)} title="Safe & private">
        <h2 className="mt-2 font-display-serif text-[26px] font-medium">Safe &amp; private</h2>
        <ul className="mt-4 space-y-3 text-[15px]">
          <li className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-success-on-paper" aria-hidden /> Distances are approximate. Exact places show only after a host approves you.</li>
          <li className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-success-on-paper" aria-hidden /> People you&apos;ve blocked never appear in your results.</li>
          <li className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-success-on-paper" aria-hidden /> Your searches aren&apos;t shown to anyone.</li>
        </ul>
        <div className="mt-6"><Button onClick={() => setSheet(null)}>Got it</Button></div>
      </BottomSheet>
    </AppShell>
  );
}
