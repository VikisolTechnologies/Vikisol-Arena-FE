"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { EMPTY_DRAFT, readEntryDraft, subscribeEntryDraft } from "@/lib/data/onboarding";
import { AnimatePresence, m } from "motion/react";
import { BookOpen, CalendarDays, Camera, Footprints, GraduationCap, Leaf, List, Map as MapIcon, MapPin, Palette, Search, SlidersHorizontal, Sprout, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { dissolve, press, rise, spring } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { Button } from "@/components/bplus/Button";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Chip } from "@/components/bplus/Controls";
import { Avatar } from "@/components/bplus/Avatar";
import { DemoBadge, HScroll, Pills, PreviewPill, SectionHeader, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { NeedCard, RowCard } from "@/components/cards/FeedCards";
import { DiscoverMap } from "@/components/screens/DiscoverMap";
import { FIXTURES_ALLOWED } from "@/lib/data/mode";
import { PREVIEW_PEOPLE, PREVIEW_SKILLS } from "@/lib/data/fixtures";
import { LAUNCH_ZONE, filterFeed, getFeedItems, getTrending, hrefFor, originFor, search, whenLabel, type FeedItem, type Post } from "@/lib/data/feed";
import { isDemo } from "@/lib/data/feed";
import type { SearchResults } from "@/lib/api/search";
import { Cover } from "@/components/covers/Cover";
import dynamic from "next/dynamic";
import { intentFrom } from "@/lib/jenny/intent";
import { JENNY_PREVIEW } from "@/lib/data/jenny";
import { understand } from "@/lib/jenny/understand";

// Preview-only (P8): its code loads only where it can render.
const IntentResults = dynamic(() => import("@/components/jenny/IntentResults").then((m) => m.IntentResults), { ssr: false });

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

/** Discover & join board: Today / Weekend / Free, then Fitness / Learning / All filters, and
 *  "Browse by category". Categories match the activity's own tags or words — no hidden scoring.
 *  "Free": Arena activities carry no price (paid work is a project), so every activity is free. */
const WHEN = [
  { id: "any", label: "Any time" },
  { id: "today", label: "Today" },
  { id: "weekend", label: "Weekend" },
] as const;
type When = (typeof WHEN)[number]["id"];
const CATEGORIES = [
  { id: "fitness", label: "Fitness", words: ["run", "fitness", "badminton", "yoga", "cycle", "trek", "sport", "football", "cricket"], icon: Footprints, tile: "bg-[#e3f1e6] text-[#1f6e3e]", tag: "bg-success/15 text-success-on-paper" },
  { id: "learning", label: "Learning", words: ["learn", "class", "workshop", "study", "tutor", "course", "pottery"], icon: BookOpen, tile: "bg-[#e1ebfb] text-[#1d57b8]", tag: "bg-info/15 text-info-on-paper" },
  { id: "community", label: "Community", words: ["community", "volunteer", "clean", "meet", "neighbour", "neighbor"], icon: Sprout, tile: "bg-[#f1ead8] text-[#5f6b1f]", tag: "bg-success/15 text-success-on-paper" },
  { id: "food", label: "Food", words: ["food", "cook", "meal", "lunch", "dinner", "breakfast"], icon: Utensils, tile: "bg-[#fbe6da] text-[#b83a0a]", tag: "bg-primary/10 text-primary-on-paper" },
  { id: "arts", label: "Arts & Culture", words: ["art", "music", "pottery", "paint", "photo", "dance", "culture"], icon: Palette, tile: "bg-[#ece3f6] text-[#6b3fa0]", tag: "bg-[#ece3f6] text-[#6b3fa0]" },
  { id: "environment", label: "Environment", words: ["environment", "tree", "plant", "garden", "lake", "green"], icon: Leaf, tile: "bg-[#e3f1e6] text-[#1f6e3e]", tag: "bg-success/15 text-success-on-paper" },
] as const;
const categoryOf = (p: { title?: string | null; body: string; tags: string[] }) => {
  const hay = `${p.title ?? ""} ${p.body} ${p.tags.join(" ")}`.toLowerCase();
  return CATEGORIES.find((c) => c.words.some((w) => hay.includes(w)));
};

function inWhen(iso: string | undefined, when: string) {
  if (when === "any") return true;
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  if (when === "today") return d.toDateString() === now.toDateString();
  const days = (d.getTime() - now.getTime()) / 86_400_000;
  return (d.getDay() === 0 || d.getDay() === 6) && days > -1 && days < 7;
}

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
  const params = useSearchParams();
  // `?show=activities` deep-links a filter (Feed's "See all", the compare pages).
  const [chip, setChip] = useState<Chip>(() => CHIPS.find((c) => c.id === params.get("show"))?.id ?? "all");
  const [when, setWhen] = useState<When>("any");
  const [category, setCategory] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // `?q=` opens with a search already made (Jenny's intent deep link, the compare pages).
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [submitted, setSubmitted] = useState(() => params.get("q") ?? "");
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
    setPlain(false);
    setSubmitted(query.trim());
  };
  // A sentence Jenny can read becomes editable filters (P8 board "Discover"); "plain" = keyword search.
  const [plain, setPlain] = useState(false);
  const intent = useMemo(() => (JENNY_PREVIEW && submitted && !plain ? intentFrom(understand(submitted)) : null), [submitted, plain]);

  // Discover is "near you": the same radius rule as the Feed's Nearby (fidelity pass).
  const draft = useSyncExternalStore(subscribeEntryDraft, readEntryDraft, () => EMPTY_DRAFT);
  const origin = useMemo(() => originFor(null, draft.area), [draft.area]);
  const near = useMemo(() => filterFeed(feed ?? [], "nearby", origin, LAUNCH_ZONE.radiusKm), [feed, origin]);
  const nearTrending = useMemo(() => (trending ?? []).filter((p) => near.some((n) => n.id === p.id)), [trending, near]);
  const byType = useMemo(() => {
    const f = near;
    return {
      activities: f.filter((i) => {
        if (i.itemType !== "activity" || !inWhen(i.startsAt, when)) return false;
        if (!category) return true;
        const hay = `${i.title ?? ""} ${i.body} ${i.tags.join(" ")}`.toLowerCase();
        return CATEGORIES.find((c) => c.id === category)!.words.some((w) => hay.includes(w));
      }),
      needs: f.filter((i) => i.itemType === "ask"),
      offers: f.filter((i) => i.itemType === "offer"),
      projects: f.filter((i) => i.itemType === "project" || i.itemType === "collab"),
    };
  }, [near, when, category]);

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
            placeholder={JENNY_PREVIEW ? "Search, or tell Jenny what you're after…" : "Search people, activities, skills…"}
            className="h-12 min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-faint"
          />
        </label>
      </form>

      {chip === "activities" ? (
        <ActivityFilters when={when} setWhen={setWhen} category={category} setCategory={setCategory} onAll={() => setFiltersOpen(true)} />
      ) : (
        <div className="mt-4">
          <Pills label="Show" options={CHIPS} value={chip} onChange={setChip} />
        </div>
      )}
      <AllFiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} chip={chip} setChip={setChip} when={when} setWhen={setWhen} category={category} setCategory={setCategory} />

      {error ? (
        <div className="mt-6">
          <StateCard kind="error" title="Discover didn't load" detail={error} action={<Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>} />
        </div>
      ) : submitted && intent && feed ? (
        <IntentResults key={submitted} query={submitted} initial={intent} items={feed} origin={origin} area={(draft.area || LAUNCH_ZONE.name).split(" / ")[0]} onPlain={() => setPlain(true)} />
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
                  <div key={p.id} role="listitem" className="relative aspect-[3/4] w-[118px] shrink-0 snap-start overflow-hidden rounded-tile bg-surface">
                    <Avatar name={p.name} className="absolute inset-0 size-full rounded-none text-[28px]" />
                    <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-transparent" />
                    <div className="absolute inset-x-2.5 bottom-2.5 text-white">
                      <p className="truncate text-[16px] font-semibold">{p.name.split(" ")[0]}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[13px] text-white/90">
                        <MapPin className="size-3.5" strokeWidth={2} aria-hidden />
                        {p.distanceKm} km
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-white/90">{p.interests.join(" · ")}</p>
                    </div>
                  </div>
                ))}
              </HScroll>
            </m.section>
          )}
          {(chip === "all" || chip === "activities") && (
            <m.section variants={rise} custom={1} aria-label="Popular this week">
              <SectionHeader title={chip === "activities" ? "Activities near you" : "Popular this week"} />
              <ActivityGrid posts={chip === "activities" ? byType.activities : nearTrending.filter((p) => p.intentType === "activity")} fallback={chip === "activities" ? [] : byType.activities} detailed={chip === "activities"} />
            </m.section>
          )}
          {chip === "activities" && (
            <m.section variants={rise} custom={2} aria-label="Browse by category">
              <SectionHeader title="Browse by category" />
              <div className="grid grid-cols-3 gap-2.5">
                {CATEGORIES.map((c) => {
                  const on = category === c.id;
                  return (
                    <m.button
                      key={c.id}
                      type="button"
                      aria-pressed={on}
                      whileTap={press}
                      transition={spring.snappy}
                      onClick={() => setCategory(on ? null : c.id)}
                      className={cn("flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-tile p-2 outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-primary", c.tile, on && "ring-2 ring-primary")}
                    >
                      <c.icon className="size-8" strokeWidth={2.2} aria-hidden />
                      <span className="text-center text-[14px] font-semibold leading-tight text-paper-ink">{c.label}</span>
                    </m.button>
                  );
                })}
              </div>
            </m.section>
          )}
          {(chip === "all" || chip === "skills") && FIXTURES_ALLOWED && (
            <m.section variants={rise} custom={2} aria-label="Skills and support">
              <SectionHeader title="Skills & support" action={<PreviewPill />} />
              <div className="grid grid-cols-2 gap-3">
                {PREVIEW_SKILLS.map((s) => {
                  const IconCmp = s.id === "s-ux" ? Palette : s.id === "s-photo" ? Camera : GraduationCap;
                  return (
                    <div key={s.id} className="flex items-center gap-3 rounded-tile bg-paper p-3 text-paper-ink">
                      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", s.tone === "info" ? "bg-info/15 text-info-on-paper" : s.tone === "success" ? "bg-success/15 text-success-on-paper" : "bg-primary/10 text-primary-on-paper")}>
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
function ActivityGrid({ posts, fallback, detailed }: { posts: (Post | FeedItem)[]; fallback: FeedItem[]; detailed?: boolean }) {
  const list = (posts.length ? posts : fallback).filter((p) => !["closed", "cancelled", "expired"].includes(p.status)).slice(0, 6);
  if (list.length === 0) return <p className="text-[15px] text-faint">{detailed ? "Nothing matches these filters yet. Try another day or category." : "No activities posted nearby yet."}</p>;
  return (
    <div className="grid grid-cols-2 gap-3">
      {list.map((p) => {
        const going = p.spotsFilled ? `${p.spotsFilled} going` : null;
        return (
          <m.div key={p.id} whileTap={press} transition={spring.snappy}>
            <Link href={hrefFor({ id: p.id, itemType: "activity" })} className="block overflow-hidden rounded-tile bg-paper text-paper-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <span className="relative block">
                <Cover source={{ id: p.id, kind: "activity", media: p.mediaUrls[0], tags: p.tags, title: p.title, body: p.body, startsAt: p.startsAt }} className="aspect-[16/10]" />
                {isDemo(p) && <DemoBadge onPhoto className="absolute left-2 top-2" />}
              </span>
              {detailed ? (
                <div className="p-3">
                  <p className="line-clamp-2 text-[15px] font-semibold leading-snug">{p.title || p.body.slice(0, 60)}</p>
                  {(() => {
                    const c = categoryOf(p);
                    return c ? <span className={cn("mt-1.5 inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold", c.tag)}>{c.label}</span> : null;
                  })()}
                  {p.startsAt && <p className="mt-1.5 flex items-center gap-1 text-[13px] text-paper-ink-muted"><CalendarDays className="size-3.5 shrink-0" strokeWidth={1.9} aria-hidden /> <span className="truncate">{whenLabel(p.startsAt)}</span></p>}
                  {p.locationText && <p className="mt-0.5 flex items-center gap-1 text-[13px] text-paper-ink-muted"><MapPin className="size-3.5 shrink-0" strokeWidth={1.9} aria-hidden /> <span className="truncate">{p.locationText}</span></p>}
                </div>
              ) : (
              <div className="p-3">
                <p className="line-clamp-2 text-[15px] font-semibold leading-snug">{p.title || p.body.slice(0, 60)}</p>
                {p.locationText && <p className="mt-0.5 truncate text-[13px] text-paper-ink-muted">{p.locationText}</p>}
                <p className="mt-1 flex items-center gap-1 text-[12px] text-paper-ink-muted">
                  <MapPin className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                  <span className="truncate">{[whenLabel(p.startsAt), going].filter(Boolean).join(" · ") || p.locationText || "Nearby"}</span>
                </p>
              </div>
              )}
            </Link>
          </m.div>
        );
      })}
    </div>
  );
}

/** Board rows: Today / Weekend / Free, then Fitness / Learning / All filters. */
function ActivityFilters({ when, setWhen, category, setCategory, onAll }: { when: When; setWhen: (w: When) => void; category: string | null; setCategory: (c: string | null) => void; onAll: () => void }) {
  const chip = (on: boolean) => cn("inline-flex h-11 items-center gap-1.5 rounded-full border px-5 text-[15px] font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary", on ? "border-primary bg-primary text-primary-foreground" : "border-field-line text-foreground");
  const extra = (category && !["fitness", "learning"].includes(category) ? 1 : 0);
  // Every activity is free, so "Free" narrows nothing; it still toggles so it behaves like a chip.
  const [free, setFree] = useState(false);
  return (
    <div className="mt-4 space-y-2.5" role="group" aria-label="Filter activities">
      <div className="flex flex-wrap gap-2.5">
        {(["today", "weekend"] as const).map((w) => (
          <m.button key={w} type="button" aria-pressed={when === w} whileTap={press} transition={spring.snappy} onClick={() => setWhen(when === w ? "any" : w)} className={chip(when === w)}>
            {w === "today" ? "Today" : "Weekend"}
          </m.button>
        ))}
        <m.button type="button" aria-pressed={free} aria-describedby="free-note" whileTap={press} transition={spring.snappy} className={chip(free)} onClick={() => setFree((f) => !f)}>
          Free
        </m.button>
        <span id="free-note" className="sr-only">Every activity on Arena is free.</span>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {(["fitness", "learning"] as const).map((c) => (
          <m.button key={c} type="button" aria-pressed={category === c} whileTap={press} transition={spring.snappy} onClick={() => setCategory(category === c ? null : c)} className={chip(category === c)}>
            {c === "fitness" ? "Fitness" : "Learning"}
          </m.button>
        ))}
        <m.button type="button" whileTap={press} transition={spring.snappy} onClick={onAll} className={chip(extra > 0)}>
          <SlidersHorizontal className="size-4" aria-hidden /> All filters{extra ? " · 1" : ""}
        </m.button>
      </div>
    </div>
  );
}

function AllFiltersSheet({ open, onClose, chip, setChip, when, setWhen, category, setCategory }: { open: boolean; onClose: () => void; chip: Chip; setChip: (c: Chip) => void; when: When; setWhen: (w: When) => void; category: string | null; setCategory: (c: string | null) => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="All filters">
      <h2 className="mt-2 font-display-serif text-[26px] font-medium">All filters</h2>
      <section className="mt-5" aria-label="Show">
        <h3 className="mb-2 text-[15px] font-semibold">Show</h3>
        <div className="flex flex-wrap gap-2">
          {CHIPS.map((c) => <Chip key={c.id} selected={chip === c.id} onToggle={() => setChip(c.id)}>{c.label}</Chip>)}
        </div>
      </section>
      <section className="mt-5" aria-label="When">
        <h3 className="mb-2 text-[15px] font-semibold">When</h3>
        <div className="flex flex-wrap gap-2">
          {WHEN.map((w) => <Chip key={w.id} selected={when === w.id} onToggle={() => setWhen(w.id)}>{w.label}</Chip>)}
        </div>
      </section>
      <section className="mt-5" aria-label="Category">
        <h3 className="mb-2 text-[15px] font-semibold">Category</h3>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => <Chip key={c.id} selected={category === c.id} onToggle={() => setCategory(category === c.id ? null : c.id)}>{c.label}</Chip>)}
        </div>
      </section>
      <p className="mt-5 text-[13px] text-paper-ink-muted">Every activity on Arena is free — paid work is posted as a project.</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => { setWhen("any"); setCategory(null); }}>Clear</Button>
        <Button onClick={onClose}>Show results</Button>
      </div>
    </BottomSheet>
  );
}

function SearchResultsList({ results, query }: { results: SearchResults | null; query: string }) {
  if (!results) return <div className="mt-6 space-y-3" aria-busy="true" aria-label="Searching"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;
  const rows = [
    ...results.activities.map((p) => ({ id: p.id, href: `/feed/${p.id}`, title: p.title || p.body, meta: "Activity" })),
    ...results.discussions.map((p) => ({ id: p.id, href: `/feed/${p.id}`, title: p.title || p.body, meta: p.intentType === "ask" ? "Need" : p.intentType === "offer" ? "Offer" : p.intentType === "collab" ? "Project" : "Post" })),
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
