import type { Metadata } from "next";
import { Suspense } from "react";
import { ShortlistScreen } from "@/components/jenny/jobsearch/ShortlistScreen";

export const metadata: Metadata = { title: "Today's shortlist · Arena" };

export default function Page() {
  return (
    <Suspense>
      <ShortlistScreen />
    </Suspense>
  );
}
