import type { Metadata } from "next";
import { Suspense } from "react";
import { JennyScreen } from "@/components/screens/JennyScreen";

export const metadata: Metadata = { title: "Jenny · Arena" };

export default function AgentPage() {
  return (
    <Suspense>
      <JennyScreen />
    </Suspense>
  );
}
