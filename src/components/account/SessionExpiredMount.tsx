"use client";

import { useRouter } from "next/navigation";
import { useSessionExpired, clearSessionExpired } from "@/lib/api/sessionExpired";
import { SessionExpiredSheet } from "./SessionExpiredSheet";

/** Mounted once in the root layout (see SHARED-CHANGES-NEEDED.md): shows on any 401 the token
 *  refresh couldn't recover from. Drafts stay on the device; only the session record is gone. */
export function SessionExpiredMount() {
  const open = useSessionExpired();
  const router = useRouter();

  return (
    <SessionExpiredSheet
      open={open}
      onSignIn={() => {
        clearSessionExpired();
        router.push("/auth?mode=signin");
      }}
      onDismiss={() => clearSessionExpired()}
    />
  );
}
