# Shared changes needed for Arena Admin (P10)

The P10 mission may only edit `src/app/admin/**`, `src/components/admin/**`, and admin e2e tests.
These shared files should be updated by the architect or a follow-up pass:

| File | Why |
|---|---|
| `src/components/app/PlatformAdminShell.tsx` | Still owns the old 6-item nav. Admin pages now use `src/components/admin/AdminShell.tsx` with the full §9 nav. Consider deprecating `PlatformAdminShell` or re-exporting `AdminShell` from there so command palette / docs stay aligned. |
| `src/components/command-palette/CommandPalette.tsx` | `PLATFORM_ADMIN_NAV` lists only tenants, moderation, analytics, flags — missing verification, content, disputes, Jenny, audit, team. |
| `tests/utils/routes.ts` | `PLATFORM_ADMIN_ROUTES` should include the new `/admin/*` routes for route-sweep. |
| `src/lib/api/platformAdmin.ts` | New admin actions (verification, user suspend, content takedown, disputes, Jenny oversight, platform audit) need real endpoints — see `docs/FE-API-GAPS.md` #42–51. |

No changes required to `DashShell`, `PlatformAdminShell` gate logic, or auth — admin reuses them as-is.
