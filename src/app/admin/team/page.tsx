"use client";

import { AdminShell, usePlatformAdminGate } from "@/components/admin/AdminShell";
import { StateCard } from "@/components/bplus/Primitives";

export default function AdminTeamPage() {
  usePlatformAdminGate();

  return (
    <AdminShell title="Admin team">
      <StateCard
        kind="empty"
        title="Admin team API not connected"
        detail="2FA status and launch-area assignments need GET /admin/team."
      />
    </AdminShell>
  );
}
