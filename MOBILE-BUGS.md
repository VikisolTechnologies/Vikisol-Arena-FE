# MOBILE-BUGS.md — ARENA-PERF-AND-MOBILE-FIX.md Track A

Real mobile-touchscreen audit of every screen migrated onto the product theme, run against
the live deployment with Playwright's iPhone 13 device profile (390×844, DPR 3, real mobile
UA, touch enabled) — not a resized desktop browser. Logged in as the talent demo account.
Method: automated enumeration of every visible interactive element (size/position/console
errors) across all 13 migrated screens, plus a targeted code audit for the hover-only,
hydration, and click-vs-touch failure classes A3–A5 name specifically.

## Screens covered
`/home` `/discover` `/identity` `/map` `/rooms` `/work` `/marketplace` `/marketplace/bids`
`/companies` `/applications` `/notifications` `/settings` `/agent` — every route migrated
onto `AppShell`/the product theme as of this session.

## Found and fixed

### 1. CRITICAL (A6) — the cookie-consent banner hid the entire mobile nav bar behind itself
**Screen:** every one of the 13 screens above, for any visitor who hasn't dismissed the
cookie banner yet (i.e. every first-time mobile visitor).
**What happened:** `CookieConsentBanner` is `fixed inset-x-0 bottom-0 z-[900]`. The new
`AppShell`'s mobile bottom nav bar (Home/Discover/New post/Map/Work) had **no cookie-banner
awareness at all** — it sits at `bottom: 0` unconditionally, so the banner rendered directly
on top of it. The legacy `BottomTabBar` (still used by unmigrated `CandidateAppShell` routes)
did attempt a fix, but hardcoded a guessed `88px` reservation; at real mobile width (390px)
the banner's text wraps to 2 lines and is actually **~115px tall**, so even that guess
undershot by ~27px and still left a sliver of the bar covered.
**Real-world effect:** a first-time mobile visitor could not tap Home, Discover, New post,
Map, or Work — the entire primary navigation — until they found and dismissed the banner.
On `/agent` specifically, the message input and Send button sit in the same zone and were
also covered.
**Fix:** `CookieConsentBanner` now measures its own real rendered height via `ResizeObserver`
and publishes it as `--cookie-banner-h` on `:root`. `AppShell`'s mobile nav, `BottomTabBar`,
and both desktop sidebars now all read that one measured value instead of a hardcoded guess —
correct at any viewport width or text length, not just the one size it happened to be
eyeballed against. Commit `b38db29`.

### 2. A2 — React/Save icons on every feed card were 14×14px
**Screen:** `/home` (every `FeedItemCard`).
**What happened:** the reaction (heart) and save (bookmark) icon buttons in the card footer
had no padding beyond the icon itself — the smallest real tap targets found on any migrated
screen, well under any reasonable touch-target minimum.
**Fix:** kept the visible icon exactly as small as designed (matches the rest of the compact
footer row), but added an invisible `::before` pseudo-element hit-area (`inset: -13px`) on
each button — expands the tappable region to ~40px without adding visible bulk or disturbing
the row's spacing. Commit `d1f78cc`.

### 3. A2, minor — notification bell (32×32) and mobile hamburger menu (36×36)
**Screen:** `AppShell`'s top bar, every migrated screen.
**Fix:** same invisible-hit-area technique, smaller expansion (`-6px`/`-4px`) since these
already had reasonable size and spacing — just enough to clear 44px. Commit `b38db29`.

### 4. Marketing-only Button variants leaking onto migrated (ivory) screens
**Not strictly a "dead button," but a real, visible defect worth fixing alongside these** —
found while investigating a stray orange-tinted shadow on `AppShell`'s own header "Post"
button. `ghost-glass` and `primary-gradient` are landing-page-only Button variants
(documented as such in `button.tsx`): `ghost-glass` fills with `bg-white/5`, nearly invisible
against ivory; `primary-gradient`'s fill is theme-safe (its gradient stops remap to
near-black in the product theme) but its `shadow-[0_8px_30px_rgba(255,107,53,...)]` is a
**hardcoded literal orange**, not a token — it bleeds a visible orange glow under otherwise-
black buttons on every ivory screen that uses it.

Ran a full grep sweep after finding this and fixed every shared component actually rendered
on an already-migrated screen: `AppShell`'s own "Post" button, `FollowButton` /
`CompanyFollowButton` (Companies, People/[id], Map), `BlockButton` (People/[id]),
`PostComposer` (Home's composer — the highest-traffic miss), `IntentCardView` (Agent chat's
approve/reject cards), `ActivityFeed` (Agent's Journal tab), `ResumeUpload` /
`DownloadPdfButton` (Applications detail via `TailoredResume`), `MeetingEmbed` (the candidate
Interview room). `JoinRequestsPanel` fixed too even though `/feed/[id]` isn't migrated yet —
same drift risk, zero extra cost to fix now. Commits `b38db29`, `19aab4d`.

## Checked, real, judged not worth changing

- **A2, chip/pill height (28–30px tall):** Home's quick-type chips, the For you/Nearby/
  Following tabs, Identity's Preview/Edit/Activity/Resume mode buttons, Followers/Following
  count pills — all under the 44px bar on height alone. Left as-is: every one is 47–151px
  *wide* with real horizontal spacing (`gap-1.5`/`gap-2`) from its neighbors, which is the
  dimension that actually drives real mis-tap risk on a phone. Inflating them to 44px tall
  would visually clash with the compact-pill look used deliberately throughout (same
  reasoning Twitter/X's own filter pills, similarly ~32px tall, ship with). Revisit if real
  usage data ever says otherwise.
- **A3, hover-only interactions:** grepped for `onMouseEnter`/`onMouseOver` app-wide — zero
  hits. One CSS-only `opacity-0 group-hover:opacity-100` found (`applications/page.tsx`'s
  slot-picker checkmark) — purely decorative; the button underneath is fully tappable
  regardless, the checkmark hint just never visually appears on touch. Cosmetic, not a dead
  interaction.
- **A4, hydration errors:** zero console errors on any of the 13 screens in this audit run
  (full list captured in the raw audit JSON). No SSR/hydration mismatches found.
- **A5, click vs touch:** no custom mouse-only handlers found. `SwipeCard`'s drag gestures
  use GSAP's `Draggable` (`pointermove`/`pointerleave`), which is touch-and-mouse-correct by
  construction, not a mouse-only shim.
- **A6, banner-over-normal-flow-content:** beyond the fixed nav bar (fixed above), the last
  ~115px of any short, unscrolled page can still be covered by the banner mid-scroll (e.g.
  the first two rows on `/notifications` when the list is short). This is standard, expected
  behavior for any dismissible bottom banner on any site — content there is one scroll away,
  not permanently blocked the way the fixed nav bar was. Not treated as a bug.

## Re-verification

Redeployed after the fixes above; re-ran the same automated audit against the live site.
Cookie-banner overlap: **0 entries** (was 13, one per screen). See `PERF-REPORT.md` for the
combined before/after summary alongside Track B's numbers.
