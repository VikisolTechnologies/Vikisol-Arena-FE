"use client";

import { AdminShell, usePlatformAdminGate } from "@/components/admin/AdminShell";
import { StateCard } from "@/components/bplus/Primitives";

export default function JennyOversightPage() {
  usePlatformAdminGate();

  return (
    <AdminShell title="Jenny & AI oversight">
      <StateCard
        kind="empty"
        title="Jenny oversight not connected"
        detail="Automations, approvals, failures, cover flags and provider status need platform-admin endpoints."
      />
    </AdminShell>
  );
}
