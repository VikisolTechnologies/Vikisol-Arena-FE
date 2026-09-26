"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getJoinedPosts, getMyPosts } from "@/lib/api/posts";
import { getMyBids } from "@/lib/api/myBids";
import { getMyProfile } from "@/lib/api/profile";
import { getSession } from "@/lib/session";
import { JennySlot, Card, useLoad } from "./shared";
import { Status, VNextShell } from "./Shell";

export function ProfileScreen() {
  const [guest, setGuest] = useState<boolean | null>(null);
  useEffect(() => {
    setGuest(!getSession());
  }, []);
  const { data, error } = useLoad(async () => {
    if (guest !== false) return null;
    const [profile, posts, joined, bids] = await Promise.all([getMyProfile(), getMyPosts(), getJoinedPosts().catch(() => []), getMyBids().catch(() => [])]);
    return {
      profile,
      posts,
      counts: {
        needsResolved: posts.filter((post) => post.intentType === "ask" && post.status === "closed").length,
        activitiesHosted: posts.filter((post) => post.intentType === "activity").length,
        activitiesJoined: joined.filter((post) => post.intentType === "activity").length,
        projectsWon: bids.filter((bid) => bid.status === "won").length,
      },
    };
  }, [guest]);
  return (
    <VNextShell>
      <JennySlot surface="Profile" />
      {guest && (
        <>
          <Status kind="empty" title="Sign in to see your page" detail="Your name and the things you have actually done show up here." />
          <p className="mt-3 text-center">
            <Link href="/auth" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-soft">Sign in</Link>
          </p>
        </>
      )}
      {!guest && error && <Status kind="error" title="Profile did not load" detail={error} />}
      {!guest && !error && !data && <Status kind="loading" title="Loading" />}
      {!guest && data && (
        <>
          <h1 className="font-display text-3xl font-semibold">{data.profile.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.profile.title || "No title yet. It fills in from what you actually do here."}</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted-foreground">Needs resolved</dt><dd className="font-display text-2xl font-semibold">{data.counts.needsResolved}</dd></div>
            <div><dt className="text-muted-foreground">Activities hosted</dt><dd className="font-display text-2xl font-semibold">{data.counts.activitiesHosted}</dd></div>
            <div><dt className="text-muted-foreground">Activities joined</dt><dd className="font-display text-2xl font-semibold">{data.counts.activitiesJoined}</dd></div>
            <div><dt className="text-muted-foreground">Projects won</dt><dd className="font-display text-2xl font-semibold">{data.counts.projectsWon}</dd></div>
          </dl>
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
