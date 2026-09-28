import type { Metadata } from "next";
import { PostNeedScreen } from "@/components/needs/PostNeedScreen";

export const metadata: Metadata = { title: "Post a Need · Arena" };

export default function PostNeedPage() {
  return <PostNeedScreen />;
}
