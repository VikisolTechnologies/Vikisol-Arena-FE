import type { Metadata } from "next";
import { Suspense } from "react";
import { JobSearchFlow } from "@/components/jenny/jobsearch/JobSearchFlow";

export const metadata: Metadata = { title: "Job search with Jenny · Arena" };

export default function Page() {
  return (
    <Suspense>
      <JobSearchFlow />
    </Suspense>
  );
}
