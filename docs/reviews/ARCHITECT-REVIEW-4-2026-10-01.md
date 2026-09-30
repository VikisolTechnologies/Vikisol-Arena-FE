# Architect review 4: 1 Oct 2026

**Scope:** the 32 re-shot screens (`docs/reviews/shots/review4/`).
**Result:** all 10 fixes from review 3 are verified. **All 32 screens are Approved.**

**The frontend is approved:** every Built screen is now Approved. The 9 not-started screens are still blocked on backend gaps.

## Verified
- The public profile `/people/[id]` is rebuilt in B+ with no score.
- Intake deep links work, and every shared-route screen now has its own specimen: activity manage, check-in and cancel; intake; preview; the six career steps; post-need; approved-ready.
- `biz-interviews` no longer overflows.
- The business preview is one coherent GreenLeaf world (43 of 50 credits everywhere).
- Hired appears in the pipeline.
- The session-expired sheet sits above the tab bar.
- No gap numbers appear in the UI.
- The autopilot flag is gone from Admin.
- Verification badges read Pending.
- Interview slot times are rounded.

## Small follow-ups (non-blocking, preview data only)
1. **Activity times in the specimens are computed from "now".** "Sunrise Run" shows 1:00–2:00 AM and check-in 1:30 AM. Keep each fixture's own clock time (a run at 6:30 AM) and move only the date relative to today.
2. **`interview-hire`:** Lakshmi is Hired, but the card still says "Waiting for Lakshmi to pick a time". Once a candidate is Hired, hide pending slots and show the outcome instead.
3. **Shots script:** accept the cookie bar before capturing, so specimens aren't covered.

## Next phase: connect to the real backend (architect will issue)
- Frontend screens move from preview fixtures to real API calls, screen by screen, against the backend branches (PR-P0 → #2 → #3) running locally first.
- Nothing is merged to `main` until the architect has reviewed each PR and the founder has approved it.
