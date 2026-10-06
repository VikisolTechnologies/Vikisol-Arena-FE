import type { Metadata } from "next";
import { ForgotPasswordView } from "@/components/entry/PasswordRecovery";

export const metadata: Metadata = { title: "Reset password · Arena" };

export default function ForgotPage() {
  return <ForgotPasswordView />;
}
