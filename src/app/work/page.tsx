import type { Metadata } from "next";
import { WorkScreen } from "@/components/screens/WorkScreen";

export const metadata: Metadata = { title: "Work · Arena" };

export default function WorkPage() {
  return <WorkScreen />;
}
