"use client";

/** @deprecated Prefer `@/components/admin/AdminShell`. Alias kept so older imports still work;
 * the old 6-item nav is retired — AdminShell owns the full §9 nav. */
export {
  AdminShell as PlatformAdminShell,
  usePlatformAdminGate,
} from "@/components/admin/AdminShell";
