import type { Metadata } from "next";
import { Suspense } from "react";
import { JobsScreen } from "@/components/career/JobsScreen";

export const metadata: Metadata = { title: "Jobs · Arena" };

export default function JobsPage() {
  return (
    <Suspense>
      <JobsScreen />
    </Suspense>
  );
}
