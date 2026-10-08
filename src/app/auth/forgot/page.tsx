import type { Metadata } from "next";
import { ForgotEmailScreen } from "@/components/login/ForgotEmailScreen";

export const metadata: Metadata = { title: "Reset password · Arena" };

export default function ForgotPage() {
  return <ForgotEmailScreen />;
}
