import type { Metadata } from "next";
import { OnboardingJourney } from "@/components/vnext/entry/OnboardingJourney";

export const metadata: Metadata = { title: "Get started · Arena" };

export default function OnboardingPage() {
  return <OnboardingJourney />;
}
