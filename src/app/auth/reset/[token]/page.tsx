import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPasswordView } from "@/components/entry/PasswordRecovery";

export const metadata: Metadata = { title: "New password · Arena" };

export default async function ResetTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <Suspense fallback={null}>
      <ResetPasswordView pathToken={token} />
    </Suspense>
  );
}
