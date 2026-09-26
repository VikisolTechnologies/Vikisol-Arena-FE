"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getFeedItems } from "@/lib/api/feed";
import { getNearby } from "@/lib/api/posts";
import { search } from "@/lib/api/search";
import { getMyApplications } from "@/lib/api/applications";
import { getMyPosts } from "@/lib/api/posts";
import { getMyProfile } from "@/lib/api/profile";
import type { FeedItem } from "@/lib/types";
import { JennySlot } from "./JennySlot";
import { Status, VNextShell } from "./Shell";

function useLoad<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    load()
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load this.");
      });
    return () => {
      cancelled = true;
    };
    // The caller passes the values this load closes over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error };
}

function Card({ href, title, meta }: { href: string; title: string; meta: string }) {
  return (
    <Link href={href} className="block rounded-3xl border border-border bg-card px-4 py-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
    </Link>
  );
}

export function FeedScreen() {
  const { data, error } = useLoad(() => getFeedItems("for-you", 0, 20), []);
  return (
    <VNextShell>
      <JennySlot surface="Feed" />
      {error && <Status kind="error" title="The feed did not load" detail={error} />}
      {!error && !data && <Status kind="loading" title="Loading" />}
      {data && data.length === 0 && <Status kind="empty" title="Arena is quiet right now" detail="When someone nearby posts a need, an activity, or a piece of work, it will show up here." />}
      {data && data.length > 0 && (
        <>
          <p className="mb-3 text-xs text-muted-foreground">{data.length} {data.length === 1 ? "thing" : "things"} in this feed</p>
          <div className="grid gap-3">
            {data.map((item) => (
              <Card key={item.id} href={hrefFor(item)} title={item.title || item.body.slice(0, 80)} meta={labelFor(item)} />
            ))}
          </div>
        </>
      )}
    </VNextShell>
  );
}

function hrefFor(item: FeedItem) {
  if (item.itemType === "job") return `/jobs/${item.id}`;
  if (item.itemType === "project") return `/marketplace/${item.id}`;
  return `/feed/${item.id}`;
}

function labelFor(item: FeedItem) {
  const who = item.authorName || item.authorCompanyName || "Someone";
  return `${item.itemType} · ${who}${item.locationText ? ` · ${item.locationText}` : ""}`;
}

export function DiscoverScreen() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const feed = useLoad(() => getFeedItems("for-you", 0, 20), []);
  const found = useLoad(() => (submitted ? search(submitted) : Promise.resolve(null)), [submitted]);
  const error = found.error || feed.error;
  return (
    <VNextShell>
      <p className="text-xs uppercase tracking-wide text-primary-soft">Who and what exists</p>
      <JennySlot surface="Discover" />
      <form
        className="mb-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(query.trim());
        }}
      >
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, work, activities" className="min-h-11 flex-1 rounded-full border border-border bg-card px-4 text-sm" />
        <button type="submit" className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">Search</button>
      </form>
      {error && <Status kind="error" title="Search did not load" detail={error} />}
      {!submitted && !error && !feed.data && <Status kind="loading" title="Loading" />}
      {!submitted && feed.data && feed.data.length === 0 && <Status kind="empty" title="Nothing is listed yet" />}
      {!submitted && feed.data && (
        <div className="grid gap-3">
          {feed.data.map((item) => (
            <Card key={item.id} href={hrefFor(item)} title={item.title || item.body.slice(0, 80)} meta={labelFor(item)} />
          ))}
        </div>
      )}
      {submitted && !found.data && !error && <Status kind="loading" title="Loading" />}
      {found.data && (
        <div className="grid gap-3">
          {found.data.activities.map((post) => <Card key={post.id} href={`/feed/${post.id}`} title={post.title || post.body} meta="Activity" />)}
          {found.data.discussions.map((post) => <Card key={post.id} href={`/feed/${post.id}`} title={post.title || post.body} meta="Discussion" />)}
          {found.data.jobs.map((job) => <Card key={job.id} href={`/jobs/${job.id}`} title={job.title} meta={job.company} />)}
          {found.data.projects.map((project) => <Card key={project.id} href={`/marketplace/${project.id}`} title={project.title} meta="Project" />)}
          {found.data.companies.map((company) => <Card key={company.id} href={`/companies/${company.id}`} title={company.name} meta={company.industry} />)}
          {found.data.activities.length + found.data.discussions.length + found.data.jobs.length + found.data.projects.length + found.data.companies.length === 0 && <Status kind="empty" title="Nothing matches yet" />}
        </div>
      )}
    </VNextShell>
  );
}

export function MapScreen() {
  const { data, error } = useLoad(() => getNearby({ lat: 17.385, lng: 78.4867, radiusKm: 10 }), []);
  return (
    <VNextShell>
      <p className="text-xs uppercase tracking-wide text-primary-soft">Around Hyderabad</p>
      <JennySlot surface="Map" />
      <p className="mb-3 text-xs text-muted-foreground">A list of real nearby activities. The map canvas stays off this first load.</p>
      {error && <Status kind="error" title="Nearby did not load" detail={error} />}
      {!error && !data && <Status kind="loading" title="Loading" />}
      {data && data.length === 0 && <Status kind="empty" title="Nothing nearby in the last search" detail="10 km around Hyderabad returned no activities." />}
      {data && data.length > 0 && (
        <div className="grid gap-3">
          {data.map((post) => (
            <Card key={post.id} href={`/feed/${post.id}`} title={post.title || post.body.slice(0, 80)} meta={post.locationText || "Activity"} />
          ))}
        </div>
      )}
    </VNextShell>
  );
}

export function WorkScreen() {
  const { data, error } = useLoad(() => getMyApplications(), []);
  return (
    <VNextShell>
      <p className="font-display text-2xl font-semibold">Work</p>
      <JennySlot surface="Work" />
      {error && <Status kind="error" title="Work did not load" detail={error} />}
      {!error && !data && <Status kind="loading" title="Loading" />}
      {data && data.length === 0 && <Status kind="empty" title="You are not in anything yet" detail="When you apply, join, or start a project, it will be listed here." />}
      {data && data.length > 0 && (
        <div className="grid gap-3">
          {data.map((application) => (
            <Card key={application.id} href={`/applications/${application.id}`} title={`Application · ${application.stage}`} meta="Open the record" />
          ))}
        </div>
      )}
    </VNextShell>
  );
}

export function ProfileScreen() {
  const { data, error } = useLoad(async () => {
    const [profile, posts] = await Promise.all([getMyProfile(), getMyPosts()]);
    return { profile, posts };
  }, []);
  return (
    <VNextShell>
      <JennySlot surface="Profile" />
      {error && <Status kind="error" title="Profile did not load" detail={error} />}
      {!error && !data && <Status kind="loading" title="Loading" />}
      {data && (
        <>
          <h1 className="font-display text-3xl font-semibold">{data.profile.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.profile.title || "No title yet. It fills in from what you actually do here."}</p>
          <div className="mt-5 grid gap-3">
            {data.posts.length === 0 && <Status kind="empty" title="No outcomes yet" detail="Publish a need or join an activity and it will show on this page." />}
            {data.posts.map((post) => (
              <Card key={post.id} href={`/feed/${post.id}`} title={post.title || post.body.slice(0, 80)} meta={post.intentType} />
            ))}
          </div>
        </>
      )}
    </VNextShell>
  );
}
