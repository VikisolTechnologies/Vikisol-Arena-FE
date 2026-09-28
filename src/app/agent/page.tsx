import type { Metadata } from "next";
import { JennyScreen } from "@/components/screens/JennyScreen";

export const metadata: Metadata = { title: "Jenny · Arena" };

export default function AgentPage() {
  return <JennyScreen />;
}
