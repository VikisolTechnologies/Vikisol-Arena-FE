# Accessibility fixes (WCAG 2.2 AA)

Branch `cloud/a11y-contrast`, 29 Sep 2026.

## How this was measured

- **axe-core** through Playwright, on a local production build in **mock mode**. There was no backend, no production login and no production traffic.
  - Run: `PW_CHROMIUM_PATH=<chromium> npx playwright test -c playwright.mock.config.ts`. The variable is only needed when Playwright's pinned browser is not downloaded.
  - Covered: 23 routes on desktop (Desktop Chrome) and mobile (Pixel 7), 46 page scans plus the shared helper, 48 tests in total.
  - Routes: `/`, `/auth`, `/pricing`, `/privacy`, `/terms`, `/home`, `/identity`, `/discover`, `/settings`, `/feed`, `/map`, `/work`, `/agent`, `/messages`, `/notifications`, `/people`, `/jobs`, `/rooms`, `/marketplace`, `/search`, `/applications`, `/interviews`, `/identity/edit`, `/enterprise/dashboard`.
  - CI runs it on every PR and push to `main` through `.github/workflows/a11y-mock.yml` (the "Accessibility (mock build)" job), with no secrets and no production traffic.
  - This suite is now **strict**: any axe violation fails it, at any severity. The production suite in `tests/e2e/accessibility` still fails only on critical and serious; both use the same `tests/utils/axe-scan.ts`.
- **Computed-contrast sweep.** axe returns "needs review" instead of a verdict for text over stacked or translucent layers, such as the `/discover` swipe-card deck. For those, every visible text node on the same routes was checked in the browser: its colour was composited through each ancestor background and opacity, then compared against 4.5:1, or 3:1 for large text.

## Baseline vs after

| | Critical | Serious | Moderate | Minor |
|---|---|---|---|---|
| Before (desktop + mobile, 23 routes) | 0 | 3 rules, on 3 routes | 3 rules, on 23 routes | 0 |
| After | 0 | 0 | 0 | 0 |

The computed sweep found two real text-contrast failures. Both are fixed below.

## Violations and fixes

### Contrast

| # | Where | Before | After | Fix |
|---|---|---|---|---|
| C1 | Landing step numbers `01` `02` `03` (`OvernightReport`, `TalentUniverse`, `OpenMarket`) | `#5a5a63` on `#09090b`: **2.92:1** (fail) | `#8b8b93`: **5.89:1** | New `--subtle` token and `text-subtle` utility |
| C2 | Meeting placeholder "Video connects here once you join" (`MeetingEmbed`) | white/40 on `#09090b`–`#1a1a1f`: **3.76–3.81:1** (fail) | `text-subtle`: **5.13–5.89:1** | Same token |
| C3 | Landing muted copy (`#8b8b93` literals in `TalentUniverse`, `OpenMarket`) | 5.89:1 (already passed) | 5.89:1 | Moved onto the token, so it can't drift below AA |

About `--subtle` (`src/app/globals.css`):

- It is the dimmest text colour the app may use. It is `#8b8b93`, the grey the landing page already used, so nothing looks different.
- It passes AA on every dark surface in both themes:
  - 5.89:1 on `#09090b`;
  - 5.44:1 on `#141417`;
  - 5.08:1 on `#1b1b1f`;
  - 5.02:1 on `#1c1c20`.

Checked and already passing, so these tokens were left unchanged:

| Pair | Ratio |
|---|---|
| `--foreground` `#f5f5f6` on `#09090b` | 18.26:1 |
| `--muted-foreground` / `--ink-400` `#a1a1aa` on canvas / surface / surface-sunk | 7.76 / 7.17 / 6.70:1 |
| Gold `#ff6b35` as text on canvas / surface | 7.02 / 6.48:1 |
| Champagne `#ff8a5b` as text on canvas / sunk surface | 8.56 / 7.39:1 |
| `--primary-foreground` `#160a05` on gold / champagne (button labels) | 6.86 / 8.37:1 |
| `text-ink` `#1c1c20` on the gold-gradient button | 5.99–7.31:1 |
| Swipe-card secondary text white/60 on `bg-ink` `#1c1c20` | 6.84:1 |
| Inactive tab `foreground/60` on sunk surface | 6.41:1 |

**Gold as body text:** gold and champagne text appears only in short labels, prices, eyebrows and single-line links, never in paragraphs. Every use passes 4.5:1 anyway, so no change was needed.

### Serious

| # | Rule | Where | Fix |
|---|---|---|---|
| S1 | `aria-prohibited-attr` | `/agent`: the agent status dot (`AgentOrbAvatar`) put `aria-label` on a plain `<span>` / `<div>`, where screen readers ignore it | Added `role="img"`, so "Agent is idle" is announced |
| S2 | `scrollable-region-focusable` | `/applications` (and `/interviews`, which redirects there): the horizontally scrolling pipeline couldn't be reached by keyboard. The same kanban on `/enterprise/postings/[id]` had the same bug | Made it a named, focusable region: `role="region"`, `aria-label`, `tabIndex={0}` and a focus-visible ring |

### Moderate

| # | Rule | Where | Fix |
|---|---|---|---|
| M1 | `region` | Every page with the cookie banner | `CookieConsentBanner` is a named region ("Cookie notice") |
| M2 | `region` | Every page with a command dialog: its visually hidden title and description rendered on the page even while the dialog was closed | `CommandDialog` puts the header inside `DialogContent`, as upstream shadcn does |
| M3 | `region` | Every AppShell page: the floating Jenny orb link sat outside any landmark | `PersistentOrb` is wrapped in `<nav aria-label="Agent">` |
| M4 | `landmark-one-main` + `region` | `/`, `/auth`, `/pricing`, `/privacy`, `/terms`, 404 | Page content is wrapped in `<main>`; the marketing `Nav` stays outside it |
| M5 | `page-has-heading-one` | `/home`, `/identity`, `/map`, `/rooms` (and `/messages`, `/feed/[id]`) | AppShell renders a visually hidden `<h1>` named after the current section when a page passes no `title` |
| M6 | `page-has-heading-one` | `/auth` | Visually hidden `<h1>Sign in to Arena</h1>` |

No screen was redesigned, and nothing visible changed except the two dim labels in C1 and C2, which are now slightly lighter.

## Test results after the fixes

- **Mock-mode a11y suite (strict):** 48/48 pass.
- **`tests/local` (`playwright.local.config.ts`):** 4/4 pass.
- **`tests/e2e`, the full suite, on desktop-chromium and mobile-chromium:**
  - How it was run: against the local mock build, with sessions seeded into storage and placeholder credentials.
  - Result: **130 passed, 28 failed**.
  - `main` at `bc99199`, run the same way, fails **the same 28 tests**. None are caused by this branch. They fail because this is mock mode with no real backend or production data:
    - they expect the real seeded demo account's data, such as "Aarav Sharma" and existing applications;
    - they expect a real wrong-password error;
    - external images are blocked by the sandbox proxy (`ERR_CERT_AUTHORITY_INVALID`);
    - the platform-admin pages call `localhost:8081`.
  - `mobile-webkit` was not run, because WebKit is not installed in this environment.
  - The suite as designed runs against production with real demo credentials. It was deliberately not run that way here.

## Not fixed / out of scope

- Axe can't check contrast for text over photos, the 3D orb or gradient fills. By hand:
  - gradient buttons: 6.86–8.37:1;
  - gradient headings: 7.02–8.56:1;
  - the swipe-card title over its 40%-opacity photo: worst case above 4.5:1.

  These still need a visual check in the preview.
- Not scanned: hover, focus, disabled and error states, open dialogs and sheets, and the admin, company-admin and hiring-manager routes beyond `/enterprise/dashboard`.
- `npm run lint` has one error in `src/components/app/PlatformAdminShell.tsx` (`react-hooks/set-state-in-effect`). It is already on `main` and this branch doesn't touch that file.
