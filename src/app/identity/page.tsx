import type { Metadata } from "next";
import { ProfileScreen } from "@/components/screens/ProfileScreen";

export const metadata: Metadata = { title: "You · Arena" };

export default function IdentityPage() {
  return <ProfileScreen />;
}
