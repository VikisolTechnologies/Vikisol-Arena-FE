import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/vnext/entry/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset password · Arena" };

export default function ForgotPage() {
  return <ForgotPasswordForm />;
}
