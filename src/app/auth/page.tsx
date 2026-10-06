import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthFlow } from "@/components/entry/AuthFlow";

export const metadata: Metadata = { title: "Welcome · Arena" };

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthFlow />
    </Suspense>
  );
}
