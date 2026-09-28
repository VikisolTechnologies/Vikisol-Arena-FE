import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkScreen } from "@/components/screens/WorkScreen";

export const metadata: Metadata = { title: "Work · Arena" };

export default function WorkPage() {
  return (
    <Suspense>
      <WorkScreen />
    </Suspense>
  );
}
