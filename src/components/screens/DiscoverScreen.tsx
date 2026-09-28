"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, m } from "motion/react";
import { List, Map as MapIcon, MapPin, Search, Wrench, Palette, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { dissolve, press, rise, spring } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { Button } from "@/components/bplus/Button";
import { Avatar } from "@/components/bplus/Avatar";
import { HScroll, Pills, PreviewPill, SectionHeader, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { NeedCard, RowCard } from "@/components/cards/FeedCards";
import { DiscoverMap } from "@/components/screens/DiscoverMap";
import { FIXTURES_ALLOWED } from "@/lib/data/mode";
import { PREVIEW_PEOPLE, PREVIEW_SKILLS } from "@/lib/data/fixtures";
import { getFeedItems, getTrending, hrefFor, search, whenLabel, type FeedItem, type Post } from "@/lib/data/feed";
import type { SearchResults } from "@/lib/api/search";

const CHIPS = [
  { id: "all", label: "All" },
  { id: "people", label: "People" },
  { id: "activities", label: "Activities" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "needs", label: "Needs" },
  { id: "offers", label: "Offers" },
] as const;
type Chip = (typeof CHIPS)[number]["id"];

export function DiscoverScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const mapMode = params.get("view") === "map" || pathname === "/map";
  const setView = (map: boolean) => router.replace(map ? "/discover?view=map" : "/discover", { scroll: false });

  return (
    <AppShell>
      <header className="flex items-start justify-between pt-3">
        <div>
          <h1 className="font-display-serif text-[34px] font-medium leading-tight">Discover</h1>
          <p className="mt-1 text-[15px] text-faint">People, activities and ideas near you.</p>
        </div>
        <m.button
          type="button"
          onClick={() => setView(!mapMode)}
          whileTap={press}
          transition={spring.snappy}
          aria-label={mapMode ? "Show as a list" : "Show on a map"}
          className="-mr-2 grid size-11 place-items-center rounded-full text-foreground outline-none hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-primary"
        >
          {mapMode ? <List className="size-6" strokeWidth={1.75} aria-hidden /> : <MapIcon className="size-6" strokeWidth={1.75} aria-hidden />}
        </m.button>
      </header>
      <AnimatePresence mode="wait" initial={false}>
        <m.div key={mapMode ? "map" : "list"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={dissolve}>
          {mapMode ? <DiscoverMap /> : <DiscoverList />}
        </m.div>
      </AnimatePresence>
    </AppShell>
  );
}

function DiscoverList() {
  const [chip, setChip] = useState<Chip>("all");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [feed, setFeed] = useState<FeedItem[] | null>(null);
  const [trending, setTrending] = useState<Post[] | null>(null);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getFeedItems("for-you", 0, 40), getTrending(0, 10).catch(() => [] as Post[])])
      .then(([f, t]) => {
        if (cancelled) return;
        setError(null);
        setFeed(f);
        setTrending(t);
      })
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "Discover didn't load."));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (!submitted) return;
    let cancelled = false;
    search(submitted)
      .then((r) => !cancelled && setResults(r))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "Search didn't load."));
    return () => {
      cancelled = true;
    };
  }, [submitted]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setResults(null);
    setSubmitted(query.trim());
  };

  const byType = useMemo(() => {
    const f = feed ?? [];
    return {
      activities: f.filter((i) => i.itemType === "activity"),
      needs: f.filter((i) => i.itemType === "ask"),
      offers: f.filter((i) => i.itemType === "offer"),
      projects: f.filter((i) => i.itemType === "project"),
    };
  }, [feed]);

  return (
    <>
      <form role="search" onSubmit={submit} className="mt-5">
        <label className="flex h-13 items-center gap-3 rounded-button border border-field-line bg-surface px-4 focus-within:border-primary">
          <Search className="size-5 shrink-0 text-faint" strokeWidth={1.75} aria-hidden />
          <span className="sr-only">Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value) setSubmitted("");
            }}
            placeholder="Search people, activities, skills…"
            className="h-12 min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-faint"
          />
        </label>
      </form>

      <div className="mt-4">
        <Pills label="Show" options={CHIPS} value={chip} onChange={setChip} />
      </div>

      {error ? (
        <div className="mt-6">
          <StateCard kind="error" title="Discover didn't load" detail={error} action={<Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>} />
        </div>
      ) : submitted ? (
        <SearchResultsList results={results} query={submitted} />
      ) : !feed ? (
        <div className="mt-6 space-y-3" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <m.div key={chip} initial="hidden" animate="shown" className="mt-6 space-y-8">
          {(chip === "all" || chip === "people") && FIXTURES_ALLOWED && (
            <m.section variants={rise} custom={0} aria-label="People near you">
              <SectionHeader title="People near you" action={<PreviewPill />} />
              <HScroll label="People near you">
                {PREVIEW_PEOPLE.map((p) => (
                  <div key={p.id} role="listitem" className="w-[132px] shrink-0 snap-start rounded-tile bg-surface p-3">
                    <Avatar name={p.name} className="size-14 text-[20px]" />
                    <p className="mt-3 truncate text-[15px] font-semibold">{p.name.split(" ")[0]}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[13px] text-faint">
                      <MapPin className="size-3.5" strokeWidth={1.75} aria-hidden />
                      {p.distanceKm} km
                    </p>
                    <p className="mt-1 line-clamp-2 text-[13px] text-foreground/85">{p.interests.join(" · ")}</p>
                  </div>
                ))}
              </HScroll>
            </m.section>
          )}
          {(chip === "all" || chip === "activities") && (
            <m.section variants={rise} custom={1} aria-label="Popular this week">
              <SectionHeader title={chip === "activities" ? "Activities near you" : "Popular this week"} />
              <ActivityGrid posts={chip === "activities" ? byType.activities : (trending ?? []).filter((p) => p.intentType === "activity")} fallback={byType.activities} />
            </m.section>
          )}
          {(chip === "all" || chip === "skills") && FIXTURES_ALLOWED && (
            <m.section variants={rise} custom={2} aria-label="Skills and support">
              <SectionHeader title="Skills & support" action={<PreviewPill />} />
              <div className="grid grid-cols-2 gap-3">
                {PREVIEW_SKILLS.map((s) => {
                  const IconCmp = s.id === "s-ux" ? Palette : s.id === "s-cycle" ? Wrench : GraduationCap;
                  return (
                    <div key={s.id} className="flex items-center gap-3 rounded-tile bg-paper p-3 text-paper-ink">
                      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", s.tone === "info" ? "bg-info/15 text-info-on-paper" : s.tone === "success" ? "bg-success/15 text-success-on-paper" : "bg-primary/15 text-primary-on-paper")}>
                        <IconCmp className="size-5" strokeWidth={1.9} aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold">{s.label}</span>
                        <span className="block text-[13px] text-paper-ink-muted">{s.nearby} nearby</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </m.section>
          )}
          {(chip === "all" || chip === "needs") && byType.needs.length > 0 && (
            <m.section variants={rise} custom={3} aria-label="Needs">
              <SectionHeader title="Needs nearby" />
              <div className="grid grid-cols-2 gap-3">
                {byType.needs.slice(0, chip === "needs" ? 20 : 4).map((i) => (
                  <NeedCard key={i.id} item={i} />
                ))}
              </div>
            </m.section>
          )}
          {(chip === "all" || chip === "offers") && byType.offers.length > 0 && (
            <m.section variants={rise} custom={4} aria-label="Offers" className="space-y-3">
              <SectionHeader title="Offers" />
              {byType.offers.slice(0, chip === "offers" ? 20 : 3).map((i) => (
                <RowCard key={i.id} item={i} />
              ))}
            </m.section>
          )}
          {(chip === "all" || chip === "projects") && byType.projects.length > 0 && (
            <m.section variants={rise} custom={5} aria-label="Projects" className="space-y-3">
              <SectionHeader title="Projects" />
              {byType.projects.slice(0, chip === "projects" ? 20 : 3).map((i) => (
                <RowCard key={i.id} item={i} />
              ))}
            </m.section>
          )}
          <EmptyFor chip={chip} byType={byType} />
        </m.div>
      )}
    </>
  );
}

function EmptyFor({ chip, byType }: { chip: Chip; byType: Record<"activities" | "needs" | "offers" | "projects", FeedItem[]> }) {
  const empty =
    (chip === "needs" && byType.needs.length === 0) ||
    (chip === "offers" && byType.offers.length === 0) ||
    (chip === "projects" && byType.projects.length === 0) ||
    ((chip === "people" || chip === "skills") && !FIXTURES_ALLOWED);
  if (!empty) return null;
  return <StateCard kind="empty" title={`No ${CHIPS.find((c) => c.id === chip)?.label.toLowerCase()} nearby yet`} detail="Be the first — it takes a minute." action={<Button onClick={() => window.dispatchEvent(new Event("arena-open-create"))}>Post something</Button>} />;
}

/** Board: "Popular this week" two-up photo cards. Falls back to recent activities. */
function ActivityGrid({ posts, fallback }: { posts: (Post | FeedItem)[]; fallback: FeedItem[] }) {
  const list = (posts.length ? posts : fallback).slice(0, 6);
  if (list.length === 0) return <p className="text-[15px] text-faint">No activities posted nearby yet.</p>;
  return (
    <div className="grid grid-cols-2 gap-3">
      {list.map((p) => {
        const going = p.spotsFilled ? `${p.spotsFilled} going` : null;
        return (
          <m.div key={p.id} whileTap={press} transition={spring.snappy}>
            <Link href={hrefFor({ id: p.id, itemType: "activity" })} className="block overflow-hidden rounded-tile bg-paper text-paper-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <div className="relative aspect-[16/10] bg-[radial-gradient(circle_at_30%_20%,var(--warning),var(--primary-pressed)_60%,var(--surface))]">
                {p.mediaUrls[0] && (
                  // eslint-disable-next-line @next/next/no-img-element -- user media, any host
                  <img src={p.mediaUrls[0]} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                )}
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-[15px] font-semibold leading-snug">{p.title || p.body.slice(0, 60)}</p>
                <p className="mt-1 flex items-center gap-1 text-[12px] text-paper-ink-muted">
                  <MapPin className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                  <span className="truncate">{[whenLabel(p.startsAt), going].filter(Boolean).join(" · ") || p.locationText || "Nearby"}</span>
                </p>
              </div>
            </Link>
          </m.div>
        );
      })}
    </div>
  );
}

function SearchResultsList({ results, query }: { results: SearchResults | null; query: string }) {
  if (!results) return <div className="mt-6 space-y-3" aria-busy="true" aria-label="Searching"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;
  const rows = [
    ...results.activities.map((p) => ({ id: p.id, href: `/feed/${p.id}`, title: p.title || p.body, meta: "Activity" })),
    ...results.discussions.map((p) => ({ id: p.id, href: `/feed/${p.id}`, title: p.title || p.body, meta: p.intentType === "ask" ? "Need" : p.intentType === "offer" ? "Offer" : "Post" })),
    ...results.jobs.map((j) => ({ id: j.id, href: `/jobs/${j.id}`, title: j.title, meta: `Job · ${j.company}` })),
    ...results.projects.map((p) => ({ id: p.id, href: `/marketplace/${p.id}`, title: p.title, meta: "Project" })),
    ...results.companies.map((c) => ({ id: c.id, href: `/companies/${c.id}`, title: c.name, meta: c.industry })),
  ];
  if (rows.length === 0) return <div className="mt-6"><StateCard kind="empty" title="Nothing matches yet" detail={`No results for “${query}”. Try fewer words.`} /></div>;
  return (
    <m.ul initial="hidden" animate="shown" className="mt-6 space-y-2.5" aria-label={`Results for ${query}`}>
      {rows.map((r, i) => (
        <m.li key={`${r.meta}-${r.id}`} variants={rise} custom={i}>
          <Link href={r.href} className="block rounded-tile bg-paper px-4 py-3 text-paper-ink outline-none focus-visible:outline-2 focus-visible:outline-primary">
            <span className="block text-[12px] font-semibold uppercase tracking-wide text-paper-ink-muted">{r.meta}</span>
            <span className="mt-0.5 line-clamp-2 block text-[16px] font-semibold">{r.title}</span>
          </Link>
        </m.li>
      ))}
    </m.ul>
  );
}
