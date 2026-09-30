"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { ActivityMissing, ActivityScreen } from "@/components/activity/ActivityScreen";
import { AppShell } from "@/components/bplus/AppShell";
import { Skeleton } from "@/components/bplus/Primitives";
import { getPost } from "@/lib/api/posts";
import type { Post } from "@/lib/types";

// The post request starts when this route's code arrives rather than after hydration (the hero
// photo can't be found before the post is back). Used once, for the URL it was made for.
let early: { id: string; post: Promise<Post | undefined> } | null = null;
if (typeof window !== "undefined") {
  const m = window.location.pathname.match(/^\/feed\/([^/]+)$/);
  if (m) {
    early = { id: decodeURIComponent(m[1]), post: getPost(decodeURIComponent(m[1])) };
    early.post.catch(() => {});
  }
}
function postRequest(id: string) {
  const e = early;
  early = null;
  return e && e.id === id ? e.post : getPost(id);
}

function Loading() {
  return (
    <AppShell>
      <div className="space-y-3 pt-3" aria-busy="true" aria-label="Loading">
        <Skeleton className="aspect-[4/3] w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </AppShell>
  );
}

// Activities are most of what people open; needs/offers and the older detail view load only for
// posts of their type (performance pass: this route shipped all three).
const NeedScreen = dynamic(() => import("@/components/needs/NeedScreen").then((m) => m.NeedScreen), { loading: Loading });
const PostDetailLegacy = dynamic(() => import("@/components/legacy/PostDetailLegacy").then((m) => m.PostDetailLegacy), { loading: Loading });

/** Activities (P3), needs (P4) and offers (P6c) use their B+ screens. Updates and company posts
 *  keep the previous detail view until P11. */
export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    postRequest(id).then((p) => !cancelled && setPost(p ?? null)).catch(() => !cancelled && setPost(null));
    return () => {
      cancelled = true;
    };
  }, [id]);
  if (post === undefined) return <Loading />;
  if (post === null) return <ActivityMissing />;
  if (post.intentType === "activity") return <ActivityScreen post={post} />;
  if (post.intentType === "ask" || post.intentType === "offer") return <NeedScreen post={post} />;
  return <PostDetailLegacy />;
}
