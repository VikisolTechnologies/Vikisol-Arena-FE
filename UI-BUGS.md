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

## Desktop pass (talent role) — clean

Reviewed `/home`, `/identity`, `/discover`, `/map`, `/work`, `/notifications`,
`/agent` at 1440×900 as `demo.talent@vikisol.dev`. No new defects — the
ForceGraph fix (U1) holds on desktop too (Python/Node.js/Engineering/
Kubernetes/AWS nodes all legible), `/map`'s empty state is honest
("See what's nearby... turn on location") rather than fabricated activity,
consistent with the brief's own rule, and `/work`'s hub card layout is clean.
Zero network errors captured across this set.

One very minor thing noticed, not filed as a defect: the agent chat history
for this demo account contains what look like repeated/duplicate exchanges
from earlier QA runs (same "Show me some jobs available on Arena" message
appearing twice in view). Not a rendering bug — the chat is correctly
displaying real message history, it's just noisier test history, same family
as F4/U2 but far lower stakes since it's scrollback, not something a demo
walkthrough leads with. Not touched.

## Not yet covered

Not yet individually reviewed: the enterprise-role screens on desktop, the
rest of the route list beyond what's listed above, and the specific things
this file is supposed to track in depth — consistent spacing/type scale/
radii across every screen, missing avatars/media where the design system
makes them mandatory, gold used as body text, two components doing the same
job with different looks, and a proper WCAG AA contrast pass. That's the
direct continuation of this phase, not abandoned — flagging honestly rather
than padding this file with screens not actually looked at closely.
