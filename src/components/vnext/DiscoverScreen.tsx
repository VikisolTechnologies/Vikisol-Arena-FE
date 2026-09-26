"use client";

import { useState } from "react";
import { getFeedItems } from "@/lib/api/feed";
import { search } from "@/lib/api/search";
import { JennySlot, Card, hrefFor, labelFor, useLoad } from "./shared";
import { Status, VNextShell } from "./Shell";

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
