import type { Metadata } from "next";
import { Suspense } from "react";
import { JennyDraftScreen } from "@/components/jenny/JennyDraftScreen";

export const metadata: Metadata = { title: "Create with Jenny · Arena" };

export default function JennyDraftPage() {
  return (
    <Suspense>
      <JennyDraftScreen />
    </Suspense>
  );
}
