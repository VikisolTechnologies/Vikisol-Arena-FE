import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewApplicationScreen } from "@/components/jenny/jobsearch/ReviewApplicationScreen";

export const metadata: Metadata = { title: "Review application · Arena" };

export default function Page() {
  return (
    <Suspense>
      <ReviewApplicationScreen />
    </Suspense>
  );
}
