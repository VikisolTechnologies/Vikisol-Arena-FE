# UI-BUGS.md

ARENA-FIX-EVERYTHING.md Phase 1B. Screenshots taken live against
`arena.vikisol.in` at 390×844 (iPhone width) during the Phase 1 defect census
— desktop-width screenshots and the rest of the route list are the next slice
of this pass, not done yet (see "Not yet covered" at the bottom).

## Fixed this pass

### U1 — `/identity`'s skills graph, invisible on the ivory theme
Covered in full in `FUNC-BUGS.md` (F1) — a functional/visual bug at once
(the component rendered, but nothing on it was legible). Fixed, verified live.
Logged here too since it's exactly the "screen still carrying old dark
styling" class of defect this file is meant to track — in this case, not the
whole screen, but one component's internals that never got the memo about the
theme migration around it.

## Open

### U2 — Leftover QA content leading the demo feed and flooding notifications (fixed)
Same finding as `FUNC-BUGS.md` F4. Fully cleaned up — see that entry for the
full account. Verified live: `/home` and `/notifications` both show only
genuine demo content now.

### U3 — `/identity` graph: peripheral nodes clip the card edge on mobile
Follow-up from the U1/F1 fix, not a regression — the graph is now legible,
but on a 390px viewport a couple of the outer nodes (e.g. the `5 yrs exp`
meta-node) sit close enough to the card's rounded border to visually clip.
Screenshot: the post-fix verification capture taken directly against
production this session (not saved into the repo — regenerate by signing in
as `demo.talent@vikisol.dev` and opening `/identity` at mobile width).
Candidate fix (not applied — keeping the graph-color batch to one concern):
clamp each node's distance from center against half the canvas's own measured
width/height inside the spring simulation in `ForceGraph.tsx`, rather than
using a fixed `restLen`/repel radius that assumes a wider (desktop) canvas.

## Not yet covered

This pass reviewed a handful of representative screens (`/home`, `/identity`,
`/discover`, plus the two mis-routed enterprise screens under F2) closely
enough to call out real defects, out of the full 50-route × 5-role × 2-width
matrix the brief asks for. Not yet individually reviewed for the specific
things this file is supposed to track: consistent spacing/type scale/radii
across every screen, missing avatars/media where the design system makes them
mandatory, gold used as body text, two components doing the same job with
different looks, and a proper WCAG AA contrast pass on `/home`, `/identity`
(beyond the graph itself), and `/discover` specifically. That's the direct
continuation of this phase, not abandoned — flagging honestly rather than
padding this file with screens I didn't actually look at closely.
