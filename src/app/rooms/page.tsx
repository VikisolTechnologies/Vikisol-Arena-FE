import type { Metadata } from "next";
import { Suspense } from "react";
import { InboxScreen } from "@/components/inbox/InboxScreen";

export const metadata: Metadata = { title: "Inbox · Arena" };

export default function InboxPage() {
  return (
    <Suspense>
      <InboxScreen />
    </Suspense>
  );
}
