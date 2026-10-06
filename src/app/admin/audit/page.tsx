"use client";

import { AdminShell, usePlatformAdminGate } from "@/components/admin/AdminShell";
import { StateCard } from "@/components/bplus/Primitives";

export default function PlatformAuditPage() {
  usePlatformAdminGate();

  return (
    <AdminShell title="Audit log">
      <StateCard
        kind="empty"
        title="Platform audit log not connected"
        detail="Every admin action (who, what, when, why) needs GET /admin/audit."
      />
    </AdminShell>
  );
}
