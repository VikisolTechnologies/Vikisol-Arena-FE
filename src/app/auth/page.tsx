import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthJourney } from "@/components/vnext/entry/AuthJourney";

export const metadata: Metadata = { title: "Welcome · Arena" };

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthJourney />
    </Suspense>
  );
}
