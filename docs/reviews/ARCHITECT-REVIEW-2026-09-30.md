# Architect review 2: 30 Sep 2026 (evening)

**Method:** each screen opened live at 390×844 (people and business) or 1280×800 (admin), in preview mode, and compared with the boards and the flow doc.
**Suite before review:** 130 passed, 2 skipped, 0 failed.

## Approved
These screens match their boards or the flow doc. Set them to **Approved** in `src/lib/dev/screens.json`:

| Area | Screens |
|---|---|
| Jenny | `jenny-discover`, `jenny-create`, `jenny-work`, `approve-action`, `jenny-today`, `set-automation` |
| People app | `inbox`, `work` |
| Business | `candidate-profile` |
| Admin | `admin-overview`, `admin-verification` |

## Earlier review (29 Sep): items confirmed fixed
- **A1 coherent preview world:** the inbox and candidate data now make sense together.
- **A3 avatars:** fixed on the inbox and the candidate profile.
- **A4:** there is now one slim "Preview data" bar.
- **A6:** the candidate profile is a full light page.
- **A7:** the business app has a bottom tab bar on mobile.
- **Inbox:** the Jenny thread is present.

## Fix list (then set these to Built again for re-review)
1. **Feed hero card (`feed`, `jenny-feed`)**
   - The first activity card below "Jenny noticed" shows a blurry fog cover.
   - Preview activities that have a matching fixture photo must show the photo; the procedural cover is the fallback only.
   - The same applies to the Discover result "Beginner-friendly badminton" (`jenny-discover`, `discover`): use the badminton photo.
2. **Smart match (`smart-match`)**
   - The hero image area is empty and black. The board shows the activity photo; use the fixture photo or its cover.
   - The organiser avatar is an empty circle. Show the person's photo, or initials as a fallback.
3. **Shortlist (`shortlist`)**
   - The banner says "Your job search automation is off", while `set-automation` says "Automation ready".
   - Read the same preview state in both places.
4. **Delete account (`account-delete`)**
   - "Delete my account forever" is not disabled while the confirmation box is unticked.
   - It must be disabled (and `aria-disabled`) until the box is ticked. Add a test.
5. **Page titles (A8, still open)**
   - `/admin/*` and `/account/*` show the generic "Arena — needs, people, activities and work nearby".
   - Every page needs its own title: "<Screen> · Arena Admin", "<Screen> · Arena", "<Screen> · Arena for Business" (the candidate profile currently reads just "Candidate profile").
6. **Admin verification**
   - Approving a company whose domain check says "Mismatch — review manually" must require a confirmation step with a written note.
   - The note goes into the audit log.

## Not yet reviewed
Everything else still marked Built. The architect reviews these in the next pass, after the fixes above.
