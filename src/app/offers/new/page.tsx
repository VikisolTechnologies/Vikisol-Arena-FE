import type { Metadata } from "next";
import { Suspense } from "react";
import { PostFlow } from "@/components/needs/PostFlow";

export const metadata: Metadata = { title: "Make an Offer · Arena" };

export default function MakeOfferPage() {
  return (
    <Suspense>
      <PostFlow mode="offer" />
    </Suspense>
  );
}
