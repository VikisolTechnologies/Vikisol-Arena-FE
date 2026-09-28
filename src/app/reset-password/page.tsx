import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPasswordView } from "@/components/entry/PasswordRecovery";

export const metadata: Metadata = { title: "New password · Arena" };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordView />
    </Suspense>
  );
}
