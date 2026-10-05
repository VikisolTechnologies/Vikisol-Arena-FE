"use client";

import { useMissingDob, clearMissingDob } from "@/lib/api/missingDob";
import { MissingDobSheet } from "./MissingDobSheet";

/** Mounted once in the root layout (MARATHON-FE-2 Step 0), same pattern as SessionExpiredMount. */
export function MissingDobMount() {
  const open = useMissingDob();
  return <MissingDobSheet open={open} onDismiss={clearMissingDob} />;
}
