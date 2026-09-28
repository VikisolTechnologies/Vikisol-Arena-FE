"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ActivityMissing, ActivityScreen } from "@/components/activity/ActivityScreen";
import { PostDetailLegacy } from "@/components/legacy/PostDetailLegacy";
import { AppShell } from "@/components/bplus/AppShell";
import { Skeleton } from "@/components/bplus/Primitives";
import { getPost } from "@/lib/api/posts";
import type { Post } from "@/lib/types";

/** Activities use the B+ activity screen (P3). Needs/offers/updates keep the previous detail
 *  view until P4 rebuilds them. */
export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    getPost(id).then((p) => !cancelled && setPost(p ?? null)).catch(() => !cancelled && setPost(null));
    return () => {
      cancelled = true;
    };
  }, [id]);
  if (post === undefined) {
    return (
      <AppShell>
        <div className="space-y-3 pt-3" aria-busy="true" aria-label="Loading">
          <Skeleton className="aspect-[4/3] w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AppShell>
    );
  }
  if (post === null) return <ActivityMissing />;
  return post.intentType === "activity" ? <ActivityScreen post={post} /> : <PostDetailLegacy />;
}
