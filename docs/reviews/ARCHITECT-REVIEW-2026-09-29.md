# Architect review: live screens vs boards (29 Sep 2026, evening)

**Reviewer:** the architect (independent, not the builder). **Method:** each live screen opened at 390×844 in signed-in preview mode (`/dev/person`, `/dev/business`) and compared with the board images.
**Scope:** P1–P7/P9 and the no-board screens. The known F2 items (map tiles, Discover chips, offer details page, see-outcome tab, search, career tabs, Jobs inside Work, job-details tabs, candidates screen) aren't repeated here.

## New rule: who may mark a screen Done
- `/dev/progress` gets two states: **Built** (the builder says it's finished) and **Approved** (the architect checked it against the board).
- The builder may only set **Built**. Only the architect sets **Approved**.
- The founder's "the app is done" means **every screen Approved**.

---

## A. Systemic gaps (fix once, fixes many screens)

1. **One coherent preview world.** Today's fixtures contradict each other:
   - Priya (a product designer) has "Lakeshore Tech HR — Senior React Developer" and "Tiffin Trail Recruiting — Backend Developer" in her inbox, and her own name appears as a thread in her own inbox.
   - The candidate "Rohit Varma, Frontend Developer, 12 years, Kubernetes" has applied to "Community Program Assistant".

   Write `src/lib/fixtures/world.ts` as one source of truth:
   - one neighbourhood (Gachibowli/Gopanapally), ~12 people with consistent roles, interests and photos;
   - each person's activities, needs, offers, jobs, applications and threads follow from who they are;
   - every screen reads from it. Recruiter-side candidates must plausibly fit the job they applied to.
2. **Photos must match their content.**
   - "Sunrise Run at Durgam Lake" shows a crowded city road marathon with race bibs, on the feed hero and the activity room header. It must show a lake or park at sunrise.
   - Every fixture item gets a photo chosen for its title (lake run → lake/park; tennis-ball cricket → a local ground; sofa → a sofa).
   - Never reuse one photo for a different kind of item.
3. **Missing avatars (grey circles):**
   - "Posted by you" on the Need page;
   - the candidate profile header;
   - Inbox rows 2–3 (activity and need threads have no image at all);
   - the Profile avatar while loading.

   Every person and thread shows a photo, falling back to initials; activity and need threads show their cover or photo.
4. **The "PREVIEW DATA" label is too loud.** An orange pill on every single card clutters the board look. Keep honesty with less noise:
   - one slim bar at the top of any screen showing preview data ("Preview data — sample neighbours and activities");
   - a small muted dot or text on cards only where real and preview content are mixed.
5. **Icon style.** The boards use **solid white glyphs inside larger saturated circles** (about 40–44px) on onboarding tiles, the Create sheet, next steps and settings rows. The build uses thin outline glyphs in smaller circles, so it looks lighter and cheaper. Switch these icon badges to solid/duotone glyphs at the board's size and colours (e.g. Offer a skill = orange-red circle with a solid white star).
6. **Light "paper" screens.** On the career and recruiter boards, most screens are **full cream (light) pages with dark text**, not dark pages holding a cream card:
   - Career: intent, job preferences, privacy preview, job details, my application.
   - Recruiter: create account, company workspace, post a job, manage job, candidates, candidate profile, interview & outcome.

   Build them as full light pages exactly like the boards. The business app on mobile should look like the recruiter board, not a dark shell.
7. **Business app on mobile:**
   - it uses a scrolling pill row (Home / Jobs / Interviews / Tal…, cut off) at the top;
   - the recruiter board shows a **bottom tab bar**;
   - use a bottom bar on mobile (Home · Jobs · (+) Post · Candidates · Company), with the desktop left nav unchanged.
8. **Old branding in page titles.** The browser tab reads "Arena for Enterprise — Talent Universe". Change every business page title to "… · Arena for Business". Search the whole repo for "Talent Universe" and "Enterprise" in user-visible text.
9. **Illustrations.** The board's footer skylines (Sign up / Sign in / Create sheet) are warm, detailed line drawings with trees, houses and a soft glow. The build's are thin, sparse outlines. Redraw them as richer SVGs in the board's style.
10. **Text truncation.** Need-card meta reads "Gopanpally ·…" and "Gachibowli · Fri · 6:0…".
    - Allow two lines for meta on small cards, as the board does ("Gopanapally · Tomorrow").
    - Fix the spelling to **Gopanapally** everywhere.
11. **Speed.** In dev, screens show skeletons for 5–7 seconds before content. Check a production build (`next build && next start`) on a phone: content must appear in under 1.5s on Wi-Fi. If it's slow in production too, profile it (large fixture photos? no `sizes` on images? a waterfall of mock calls?). All fixture photos should be WebP ≤ 150 KB with correct `sizes`.

## B. Screen-by-screen

| Screen | Status | What still differs |
|---|---|---|
| Welcome | Close | The logo is now right. The photo is accepted for now. |
| Sign up | Close | The password hint says "at least 6 characters"; the board says 8. **Use 8** (security), and log a BE gap if the API allows 6. Skyline (A9). The Google button is hidden, which is correct until supported. |
| Sign in | Close | Skyline (A9). |
| Why are you here | Close | Icon style (A5). Titles slightly smaller than the board. The back arrow is missing. |
| Local life | Close | The pin icon is missing on the "Use my current location" row. Area should default to the launch area (Gachibowli / Gopanapally) as on the board. |
| Your identity | Close | Nothing major. |
| All set | Close | Icon style (A5). |
| Feed | Good structure | Hero photo mismatch (A2); label noise (A4); need-card meta truncation (A10); "3 replies" → the board says **"3 offers"** for needs. |
| Discover | Close | People tiles need photos on all fixtures (A3). |
| Work | Good | "See all" links per section as on the board. |
| You (profile) | Good | Outcome thumbnails should be photos (A2), not the orange procedural blob. |
| Jenny home | Known | The orb is a flat beige ball. It needs the board's glowing orange sun with a soft halo (P8). |
| Activity room | Close | Header photo mismatch (A2). |
| Need page | Close | "Posted by you" avatar (A3). The board's actions are **Edit · Pause · Close** (the build has Share · Close); keep Share in the ⋯ menu. |
| Coordination room | Close | The board has a third tab, **Files**. |
| Inbox | Needs work | Missing images (A3); contradicting threads (A1); the board shows a **Jenny** thread with the orb. |
| Career intent | Close | Nothing major. |
| Job details | Known (F2) | Company card should be cream, not white. |
| Choose role | Close | It should be a full light page as on the board (A6). |
| Post a job | Needs work | Should be a full light page (A6), plus the business mobile nav (A7). |
| Candidate profile | Needs work | Full light page (A6); avatar (A3); data coherence (A1). |

## C. Done criteria for this review
- Every item in A and B is fixed, or logged in DECISIONS.md with a reason.
- Then `/dev/compare/all` is re-run and the builder sets those screens to **Built**.
- The architect re-reviews and sets **Approved**.
