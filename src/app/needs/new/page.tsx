import type { Metadata } from "next";
import { Suspense } from "react";
import { PostFlow } from "@/components/needs/PostFlow";

export const metadata: Metadata = { title: "Post a Need · Arena" };

export default function PostNeedPage() {
  return (
    <Suspense>
      <PostFlow mode="need" />
    </Suspense>
  );
}
