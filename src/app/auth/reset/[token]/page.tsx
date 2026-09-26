import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/vnext/entry/ResetPasswordForm";

export const metadata: Metadata = { title: "New password · Arena" };

export default async function ResetTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm pathToken={token} />
    </Suspense>
  );
}
