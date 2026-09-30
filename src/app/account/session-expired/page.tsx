"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AccountPage } from "@/components/account/AccountPage";
import { SessionExpiredSheet } from "@/components/account/SessionExpiredSheet";
import { StateCard } from "@/components/bplus/Primitives";

/** Specimen route for the session-expired sheet (flow §1.4). Wire the live trigger via SHARED-CHANGES. */
export default function SessionExpiredPage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <AccountPage title="Session expired" lede="This screen shows the sheet people see when Arena needs them to sign in again.">
      <StateCard
        kind="empty"
        title="Draft kept on this device"
        detail="Anything you were writing stays here until you sign in and continue."
      />
      <SessionExpiredSheet
        open={open}
        draftKept
        onSignIn={() => router.push("/auth?mode=signin")}
        onDismiss={() => setOpen(false)}
      />
    </AccountPage>
  );
}
