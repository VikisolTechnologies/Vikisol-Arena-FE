# Architect review 3: 30 Sep 2026 (night)

**Method:** all 114 Built screens, captured by `scripts/dev/review-shots.mjs` (390×844 full page; admin 1280×800), each compared with its board or the flow doc.
**Correction to review 2:** the "black box" on Smart match was a capture artefact on the architect's side (the browser pane was hidden). The builder was right, and Smart match is approved.

## Approved
**Every Built screen is Approved, except the screen ids named in the fix list below.** Those go back to Built for re-review.
The approved set includes:
- all of onboarding;
- Feed, Discover, Map and Create;
- activities (kind, cover, covers, published, room, you're in, leave);
- needs and offers, the coordination room, mark completed, see outcome;
- inbox, conversation, notifications, search, settings, report, resilient states;
- all of career and the Jenny flows;
- most of the business app;
- most of Admin and most of Account.

## Fix list
1. **Public profile `/people/[id]` (`neighbour-profile`) is the OLD pre-B+ design.**
   - It has the old header and old bottom bar (Home / Nearby / Discuss / Work / Inbox), old tags, and it shows an **"Arena Score 69"** to other people. Showing a score breaks the no-score rule.
   - Rebuild `/people/[id]` in B+, porting the design Cursor built for `/neighbour/[id]`:
     - cover and photo, name, area, intro, interests, outcomes;
     - Follow / Message / Report;
     - it respects the person's visibility (hidden or unknown → "This profile isn't available");
     - no scores of any kind.
2. **Activity intake deep links render a BLANK page.**
   - `/activities/new?step=details` and `?step=preview` show an empty cream screen.
   - Opening a later step directly must either show that step with the draft, or go back to step 1 (What kind?).
   - **Specimens:** several screens share one route, so they were never actually shown. Each needs its own specimen, via `/dev/screen/<id>` or `?step=`:
     - `activity-intake`, `activity-preview`;
     - `activity-manage`, `activity-checkin`, `activity-cancel` (all showed Activity details);
     - `career-status`, `career-skills`, `career-pay`, `career-prefs`, `career-proof`, `career-review` (all showed step 1);
     - `post-need` (showed need-kind);
     - `approved-ready` (showed the same screen as `activity-leave`).
3. **`biz-interviews` overflows horizontally.** The page is 435 px wide at a 390 px viewport. Fix the overflow and add an overflow check for every business route.
4. **Business preview data contradicts itself** (review-1 A1, business side):
   - unlock credits read 23 of 25 (Overview), 9 (Home) and 9 of 10 (Billing), while the Pro plan says 50;
   - Overview shows 0 jobs posted and 0 candidates moved, while the job has 8 applicants and moves;
   - GreenLeaf's Messages include "Lakeshore Tech — Product Designer", another company's thread;
   - Company profile industry is "Sales" for a sustainability products company;
   - the Overview "Team activity" table cuts off its last column on mobile.

   One coherent business world in the fixtures, please.
5. **`biz-pipeline` says "Hired isn't a stage in Arena yet — use Offer",** while Manage job already shows a Hired column and backend PR #3 adds the `hired` stage. Remove the note and support Hired in the pipeline (board + list).
6. **Session expired sheet:** the "Stay here" button overlaps the bottom tab bar. The sheet and its scrim must sit above the tab bar, with both buttons fully visible.
7. **No gap numbers in the UI.** Account Share shows "(gap #60)", and Admin Overview, Content and Moderation show "(gap #42/#45/#50)". Keep the honest sentence, and drop the gap numbers from anything a person can see.
8. **Admin Feature flags lists "Agent autopilot mode — fully autonomous (no per-action approval)".** That contradicts the core rule that Jenny prepares and the person approves. Remove it from the UI, and ask the backend to delete that flag.
9. **Admin verification:** pending companies carry a "Paused" badge. It should read "Pending".
10. **Minor data realism:**
    - interview slots at odd times like 11:25: round them to :00 or :30;
    - `apply-track` "Applied on 9 Oct 2026" is in the future: use dates relative to today.

## After the fixes
- Regenerate the review shots for the fixed ids only.
- Say "ready for review 4". The architect then approves the rest.
