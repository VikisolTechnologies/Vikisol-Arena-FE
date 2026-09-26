"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyPosts } from "@/lib/api/posts";
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
    const [profile, posts] = await Promise.all([getMyProfile(), getMyPosts()]);
    return { profile, posts };
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
