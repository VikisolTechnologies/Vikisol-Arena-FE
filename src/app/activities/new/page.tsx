import type { Metadata } from "next";
import { Suspense } from "react";
import { ActivityCreateFlow } from "@/components/activities/ActivityCreateFlow";

export const metadata: Metadata = { title: "Host an activity · Arena" };

export default function NewActivityPage() {
  return (
    <Suspense>
      <ActivityCreateFlow />
    </Suspense>
  );
}
