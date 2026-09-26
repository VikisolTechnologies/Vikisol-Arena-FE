# Arena VNext progress

Another agent can resume from this file alone. Updated 2026-09-26, after the preview build.

## Phase

Step 2 cleanup is on `main` at `5a1b52d`. `https://arena.vikisol.in/version` returns that commit.

Step 3 blueprint and mockups are in `docs/ARENA-VNEXT-BLUEPRINT.md` and `docs/design/vnext.html`. The running UI uses near-black and orange. Ivory is comparison-only in the mockup file.

Step 4 is the code in `src/components/vnext/` on `feature/arena-vnext`. It is not merged.

Step 5 and 6 are the local suite, the unmerged pull request, and `docs/ARENA-VNEXT-REPORT.md`.

## Cleanup suite

One worker, local cleanup server: 236 passed, 4 skipped, 2 failed. The failures were cold mobile FCP (landing 3780ms, `/home` 4248ms) while a second Next build was running. The same spec alone: 7 passed in 37s, both budgets held at 2.5s. That is why `main` was updated. The budget was not changed to make it pass.

## Do not

- Merge `feature/arena-vnext` until the founder approves the preview.
- Change Jenny's write-body shapes. The lock is `feature/arena-jenny-contract`.
- Change company-admin 2FA. The finding is `docs/SECURITY-FINDINGS.md`.
- Touch Vikisol One.
- Commit `mvnw` mode changes, `.env.test`, or Playwright auth JSON.
