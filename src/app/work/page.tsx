import type { Metadata } from "next";
import { Suspense } from "react";
import { JobsScreen } from "@/components/career/JobsScreen";

export const metadata: Metadata = { title: "Work · Arena" };

export default function WorkPage() {
  return (
    <Suspense>
      <JobsScreen />
    </Suspense>
  );
}
