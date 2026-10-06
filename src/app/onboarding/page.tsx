import { Suspense } from "react";
import type { Metadata } from "next";
import { Onboarding } from "@/components/entry/onboarding/Onboarding";

export const metadata: Metadata = { title: "Get started · Arena" };

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <Onboarding />
    </Suspense>
  );
}
