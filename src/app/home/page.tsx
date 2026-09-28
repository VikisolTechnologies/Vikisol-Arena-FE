import type { Metadata } from "next";
import { FeedScreen } from "@/components/screens/FeedScreen";

export const metadata: Metadata = { title: "Feed · Arena" };

export default function HomePage() {
  return <FeedScreen />;
}
