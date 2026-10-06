import type { Metadata } from "next";
import { NotificationsScreen } from "@/components/inbox/NotificationsScreen";

export const metadata: Metadata = { title: "Notifications · Arena" };

export default function NotificationsPage() {
  return <NotificationsScreen />;
}
