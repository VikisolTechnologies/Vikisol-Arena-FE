# Arena: data timing, onboarding flow and mobile layout review

Date: 2026-09-26. Source: phone screenshots of arena.vikisol.in (build `b505408`, the build
live before the Jenny approval work), plus a read of the current code. Written for the Codex +
Claude pairing, so every item names the file and the likely cause. **Nothing here is fixed yet.**

Each item has a severity:
- **P0** misleads users or is a privacy/consent problem.
- **P1** is visibly broken.
- **P2** is polish.

---

## 1. Dates and times ("data is not getting timed properly")

### 1.1 P0: an activity can be created with a start time in the past, and is born "Expired"
Seen: post "Hivc" shows `ACTIVITY · FRIDAY 9:31 PM` and `EXPIRED`, but the profile says it was
posted **today** (Saturday ~02:00). Nothing stopped its start time from already being in the past.

Causes:
- **The picker accepts past times.** `src/components/create-v3/CreateComposer.tsx:538` uses
  `<input type="datetime-local">` with no `min`, and there's no check before submit.
- **A restored draft can bring back an old time.** Drafts are restored (`initialDraft.startsAt`, line 151/193), so an old draft brings back yesterday's time silently.
- **The server accepts it.** `PostService.java:342` stores any `startsAt` it's given; there's no "must be in the future" check.
- **So it expires almost immediately.** `PostLifecycleScheduler` (STALE_AFTER = 2h) marks it EXPIRED shortly after.

Fix:
- **Server, authoritative:** reject an activity whose `startsAt` is in the past (a small grace of ~5 min is fine) or more than ~90 days out. Also reject `endsAt <= startsAt`. Return a clear 400.
- **Client:**
  - Set `min` to now (rounded to 15 min).
  - Validate before Continue/Post.
  - When restoring a draft whose time has passed, clear the time and say so.
- **Timezone:** `new Date(localValue).toISOString()` uses the phone's zone, which is correct for India. But display must also use the viewer's zone. Confirm "Friday 9:31 PM" and "today" come from the same instant.

### 1.2 P1: expired bidding still shows on Home as "Open for bids · 0h left"
`HomeContent.tsx` keeps projects by `status === "open"` only. A project whose `endsAt` has
passed but whose status the scheduler hasn't flipped yet still shows.

Fix:
- Filter on the server (the `/marketplace/projects` list should exclude `endsAt <= now`).
- Also filter on the client as a guard: `endsAt > now`.

### 1.3 P2: "183h left" is hard to read
`FeedCards.tsx:112` and `work/page.tsx:217` print raw hours. Use one shared formatter:
- "7 days left"
- "23 h left"
- "45 min left"
- "Closing now"
- "Closed"

### 1.4 P2: other copy
- Grammar: "1 sessions" should be "1 session".
- Duplicate distance: "about 239.8 km away" appears twice on the post page.
- Precision: round the distance ("~240 km away").
- Unclear label: "BE THE FIRST" reads like a heading with nothing under it.
- Stale data: job cards say "10d ago" for most seeded jobs. That's a seed-data freshness problem, not a code bug, but it makes Home look abandoned. The demo refresher should cover jobs too, and demo items must stay labelled as demo.

---

## 2. Onboarding flow: casual users are treated as job seekers

### 2.1 P0: a "Just here to explore" user gets Auto-apply and enterprise visibility, both ON
The last onboarding step (`src/app/onboarding/page.tsx`, around lines 470–515) always shows two switches, both defaulting to `true` (lines 71–72):
- **Auto-apply:** "Let your agent apply to 90%+ matches for you"
- **Visible to enterprises:** "Show up in Talent Universe search results"

This happens even when the user picked "Just here to explore" (`cameForJob === false`). Tapping
Enter Arena saves both as consent (`updateMyConsent`, line ~147). So:
- **Consent/privacy:** a casual user is opted in to recruiter search without ever saying they're job hunting. Consent must default to **off** and be a deliberate choice.
- **Honesty:** the backend only *stores* `autoApply` (`CandidateProfileService.java:116`). Nothing auto-applies. Jenny now proposes actions and always needs an Approve tap, so "your agent will apply on your behalf" is untrue for everyone.
- **The animation also misleads:** the chips say "Joined · Badminton tonight", "Bid · ₹62,000 sent". A brand-new user sees made-up activity that looks like theirs.

Fix, ordered as one flow:
1. **Intent decides the path.** `explore` → name → interests (sports, meetups, study, communities) → optional area → done. No job questions, no consent switches, no "agent" framing. `job` → the existing job steps.
2. **Consent defaults off for everyone.** Show "Visible to enterprises" only on the job path, off by default, with a one-line "what recruiters see". Keep it editable in Settings.
3. **Remove Auto-apply from onboarding** until it exists as an approval-based feature. Replace it with a true line: "Jenny can suggest jobs and activities. Nothing is applied or joined without your approval."
4. **Retitle the finale** from "Your agent is waking up" to e.g. "You're in, {name}", and remove the fake activity chips (or clearly show them as examples).
5. **Title/industry must not block explorers.** The `title` step requires an industry and `handleFinish` falls back to "Engineering"/"Arena member". Explorers shouldn't get a fake job title shown on their profile.
6. **Migration question for existing users** who were opted in by default: reset `searchableByEnterprises` to false for users with `cameForJob = false`? This is a product/legal call. **Needs the founder's decision.**

### 2.2 P1: Home still says "Ask Jenny anything — coming soon" in production
Already fixed in the uncommitted Jenny work (the Home bar now links to `/agent`). It goes live
with the Arena-FE deploy. The nav label "Jenny" vs "Home" is changed in the same work.

---

## 3. Mobile: alignment, and "take the full screen, hide the browser"

### 3.1 Can the browser bar be hidden?
Short answer: **only when Arena is installed to the home screen**, not in a normal Safari/Chrome tab. iOS and Android don't let a website hide the address bar or bottom toolbar. What we *can* do:

1. **Make Arena an installable app (PWA)** so "Add to Home Screen" opens it full screen, with no browser bar. Today there is **no web manifest** (`public/` has none, `src/app/` has no `manifest.ts`) and no iOS web-app metadata. Add:
   - `src/app/manifest.ts` with:
     - `display: "standalone"`
     - `start_url: "/home"`
     - `background_color`/`theme_color` matching the dark theme
     - 192/512 icons plus a maskable icon
   - `apple-touch-icon` (180px).
   - In `layout.tsx` metadata:
     - `appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Arena" }`
   - A `viewport` export with:
     - `viewportFit: "cover"`
     - `themeColor`
2. **Invite users to install.** Show a small one-time prompt: Android's `beforeinstallprompt`, or an iOS "Share → Add to Home Screen" hint. Never show it on the first screen.
3. **Inside a normal browser tab, fill the space properly.** Use `100dvh` (not `100vh`) for full-height layouts, and `env(safe-area-inset-*)` padding at the top and bottom. Then nothing sits under the browser's own bars and nothing is cut off.

### 3.2 P1: the floating orb hides behind the bottom nav
Every screenshot shows a half-cut orange circle at the bottom right.

Cause: `src/components/orb/PersistentOrb.tsx:79` is `fixed bottom-6 z-30`, but the mobile bottom nav (`AppShell.tsx:323`) is taller than 24px and drawn on top.

Fix: on mobile, lift it above the nav:
`bottom: calc(<nav height> + 12px + env(safe-area-inset-bottom))`.
Alternatively, hide the orb on mobile, since the Jenny bar on Home and the nav already lead to Jenny.

### 3.3 P2: the build stamp overlaps the nav
`src/components/BuildStamp.tsx` renders the commit hash `b505408` fixed at the bottom right, over the Inbox label. Show it only in Settings/About, or only for admins.

### 3.4 Check on real phone sizes after the fixes
Check these sizes:
- 375×667 (iPhone SE)
- 390×844 (iPhone 14/15)
- 412×915 (Android)

Check these screens: Home, a post page, `/agent`, onboarding, and a room.

Look for:
- no horizontal scroll
- the orb not overlapping the nav
- the cookie banner not covering the nav buttons
- safe-area padding in standalone mode

Add a Playwright mobile screenshot check for Home and a post page.

---

## 4. Suggested split between Codex and Claude
| Area | Owner | Needs |
|---|---|---|
| 1.1 server-side past-time rejection plus a test | Codex (Arena-BE) | None |
| 1.1–1.3 composer `min`/validation, draft restore, time-left formatter, expired bidding filter | Claude (Arena-FE) | 1.1 server check merged first |
| 2.1 onboarding split, consent defaults, copy | Claude (Arena-FE) plus Codex review | Founder decision on 2.1 step 6 |
| 3.1 PWA manifest, viewport, safe areas | Claude (Arena-FE) | App icons (can be generated from the current logo) |
| 3.2–3.3 orb and build stamp | Claude (Arena-FE) | None |
| Review and QA of all of it on phones | Codex #2 | Deployed preview |

## 5. Open decisions for the founder
1. Existing users opted into enterprise search by default: reset them, or ask them next login?
2. Should Auto-apply ever exist, or is "Jenny suggests, you approve" the permanent model?
3. PWA install prompt: show it after the first meaningful action (e.g. first join), or only from Settings?
