"use client";

import { AdminShell, usePlatformAdminGate } from "@/components/admin/AdminShell";
import { StateCard } from "@/components/bplus/Primitives";

export default function AdminContentPage() {
  usePlatformAdminGate();

  return (
    <AdminShell title="Content">
      <StateCard
        kind="empty"
        title="Content browse not connected"
        detail="Activities, needs and jobs takedown need a platform-admin content API."
      />
    </AdminShell>
  );
}
