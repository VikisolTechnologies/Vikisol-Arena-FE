import type { Metadata } from "next";
import { Suspense } from "react";
import { AutomationScreen } from "@/components/jenny/jobsearch/AutomationScreen";

export const metadata: Metadata = { title: "My job search · Arena" };

export default function Page() {
  return (
    <Suspense>
      <AutomationScreen />
    </Suspense>
  );
}
