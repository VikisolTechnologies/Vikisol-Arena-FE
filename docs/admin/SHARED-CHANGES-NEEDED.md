# Shared changes needed for Arena Admin (P10)

Done on `feature/arena-admin-bplus`:
1. `PlatformAdminShell` — old 6-item nav retired; file now exports the gate + re-exports `AdminShell`.
2. `CommandPalette.tsx` — `PLATFORM_ADMIN_NAV` updated to the full §9 admin routes.
3. `tests/utils/routes.ts` — `PLATFORM_ADMIN_ROUTES` includes the new `/admin/*` paths.

Still for the backend team (do not change FE API shapes):
| File | Why |
|---|---|
| `src/lib/api/platformAdmin.ts` | New admin actions need real endpoints — see `docs/FE-API-GAPS.md` #48–57 (renumbered on merge into `feature/arena-vnext-mobile-jenny`; was #42–51 on `feature/arena-admin-bplus`). Fixtures stay until then. |
