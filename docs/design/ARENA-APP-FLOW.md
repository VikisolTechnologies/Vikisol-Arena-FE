# Arena: end-to-end application flow

**Architect, 29 Sep 2026. Founder-approved direction.** This is the authority on flow, intake, the three apps and Jenny covers, and it sits alongside `docs/missions/FE-BPLUS-BUILD.md`.
- **The boards decide how screens look. This file decides what the app does and asks.**
- Where the boards have no screen, design one in the same B+ language: same tokens, components and motion. Mark it "No board — designed in B+" on `/dev/progress`.

**Scope change (founder, 29 Sep):** the business (`/enterprise/*`) and admin (`/admin/*`) apps are now in scope and get rebuilt in the B+ look.
- Keep their existing API calls, auth, 2FA and session logic unchanged.
- Keep the existing URLs.
- Delete old UI when it's replaced.

---

## 0. Three apps, one product, one account

| App | Who | Where | Form |
|---|---|---|---|
| **Arena** | Everyone | `/`, `/home`, `/discover`, `/work`, `/identity`, … | Mobile-first (B+ boards) |
| **Arena for Business** | Companies, recruiters, hiring managers | `/enterprise/*` (URLs kept; the brand reads "Arena for Business") | Desktop dashboard + the mobile recruiter screens from the board |
| **Arena Admin** | Vikisol staff only | `/admin/*` | Desktop-first; platform admin role; 2FA always |

- **One sign-in for all three.**
- **Switching:** a person with a business seat sees "Switch to Business" in You → Settings and in the Create sheet ("Post a Job"), as the board shows.
- **Admin is never linked from the people app.**

## 1. Entry (everyone)

1. **Guest:**
   - can browse Feed and Discover read-only, seeing approximate areas only;
   - any action (Join, Offer, Message, Post) opens a sign-in sheet;
   - after sign-in the person returns to that action with their draft kept.
2. **Sign up** → email verification.
   - Use the existing flow if there is one; otherwise log it in FE-API-GAPS and show a "check your email" screen designed in B+.
3. **Onboarding (built):**
   - Why are you here → Local life → Your identity → All set;
   - after Identity, branch into the setups for the intents chosen. Each setup is skippable and can be resumed later from You:
     - Find activities / Meet people: done in Local life;
     - Ask for help: a one-line "What do you need?" that leads to a pre-filled Post a need;
     - Offer a skill: Offer setup (§4);
     - Find work: Career setup (§6), with "Later" allowed;
     - Hire or recruit: Business setup (§8);
     - Start a project: Project create (§7);
     - Explore first: Feed.
   - The "Recommended next steps" on All set reflect the intents chosen.
4. **Account screens (still missing):**
   - session-expired sheet (keeps the draft);
   - edit profile, notification preferences, blocked accounts;
   - download my data, delete account (confirm screen + clear consequences);
   - help & safety centre.

## 2. The intake engine: asking carefully, the same way everywhere

**Principles:**
- **Ask the minimum needed to publish.** Offer "Add more details" for depth.
- **Every question shows a small "why":** e.g. "Helps players know what to bring".
- **Every private field shows a lock and who can see it:** Public / After approval / Only employers I apply to / Only me.
- **Jenny can pre-fill from one sentence** ("Cricket this Sunday 7am at Gachibowli, 12 players, tennis ball").
  - Fields she filled are marked "Jenny filled — check" until the person touches them.
  - Nothing publishes without the person's tap.
- **Drafts autosave.** Back never loses answers.
- **At most 4 questions per step.** Progress dots on top; a review screen at the end.

**Build it once:** `src/lib/intake/`
- A TypeScript schema per category/subtype:
  - `fields[]`, each with a `type`, `label`, `why`, `required`, `visibility`, `showIf` and `default`;
  - types: single/multi chips, text, long text, number, stepper, money range (₹ LPA or ₹/person), date, time, repeat, area, exact point, toggle, photo, file, skill level, proficiency.
- One `IntakeForm` renderer, with steps, validation after blur, review and edit-from-review.
- **Adding a new activity type means adding a schema, not a screen.**

## 3. Activities: host and join, end to end

### Host (+ → Create an Activity)
**A1 What kind?**
- Search on top, plus "Or just tell Jenny".
- Category grid → subtypes:
  - **Sports:** Cricket, Badminton, Football, Volleyball, Basketball, Tennis, Table tennis, Pickleball, Swimming
  - **Fitness:** Running, Walking, Cycling, Yoga, Gym buddy
  - **Outdoors:** Trekking, Hiking, Camping, Birdwatching, Photo walk
  - **Learning:** Workshop, Study group, Language exchange, Book club, Tech meetup
  - **Arts & culture:** Music jam, Pottery, Painting, Dance, Theatre
  - **Games:** Board games, Chess, Quiz night
  - **Food:** Potluck, Cook together, Food walk
  - **Community:** Clean-up, Tree planting, Volunteering, Donation drive
  - **Other:** free text; Jenny suggests the nearest type.

**A2 Details.** Every activity asks these common questions:
- title (Jenny suggests one);
- short description;
- skill level (Beginner / Intermediate / Advanced / All levels);
- group size (min–max) + waitlist on/off;
- cost: Free, or Shared cost ₹/person with a note. **No payments in the app.**
- what to bring; accessibility notes;
- an "All joiners are 18+" confirmation (launch rule).

Type-specific questions (examples; write the rest in the same spirit):
- **Cricket:**
  - format: Box / Tennis-ball / Leather-ball / Nets;
  - overs (6/10/20/custom); players per side;
  - equipment provided (bat, ball, stumps, pads, gloves);
  - ground booked? (name).
- **Badminton:** singles/doubles; courts booked (count); shuttle: feather or nylon; spare rackets?
- **Football:** 5 / 7 / 11-a-side; turf booked?; studs allowed?
- **Running:** distance (3/5/10/21 km); pace groups; route type (lake / road / trail); water point?
- **Trekking:**
  - difficulty (easy / moderate / hard) with a plain description;
  - distance and elevation; duration;
  - transport (meet at the trailhead / carpool from…);
  - fitness note; gear list;
  - emergency contact, which is **required, visible only to the host after approval, and deleted after the trek**;
  - a weather check reminder.
- **Cycling:** road/MTB; distance; pace; helmet required (on by default).
- **Yoga:** style; mats provided?; indoor/outdoor.
- **Workshop / learning:** topic, level, materials, seats, online or in person (+ link after approval).
- **Board games / quiz:** games or theme; team size.
- **Food / potluck:**
  - diet (veg / non-veg / vegan / Jain);
  - allergens note;
  - bring-a-dish toggle.
- **Clean-up / volunteering:** partner group (optional); supplies provided?; what volunteers do.

**A3 When & where:**
- date, start and end; repeat (one-off / weekly);
- **area** (public, approximate) + **exact meeting point**, revealed only after approval;
- indoor/outdoor; map pin.

**A4 Who can join:**
- open, or approval required;
- up to 3 **host questions** for joiners (e.g. "How many overs have you played?");
- a women-only **label**: a host label plus approval required. **There is no gender field.**
- visibility: Nearby / Link only.

**A5 Cover by Jenny** (§5).

**A6 Preview & publish** → **A7 Published:**
- check draw; share link; WhatsApp share; "Invite with a reason".

**A8 Manage activity (host):**
- **A9 Requests:** approve/decline with an optional note; the joiner's answers to the host questions are shown.
- The waitlist auto-promotes when a spot frees up.
- **A10 Edit:** people who joined are notified of what changed.
- **A11 Cancel:** a reason is required; everyone is notified.
- Room link.
- **Day of:**
  - "Starting soon" card;
  - **A12 Check-in** (host marks who came);
  - after the end, **A13 Attendance confirm** with a 72h dispute window; attendance stays private.
- **A14 Private feedback:** "Would you join again?" + an optional note. **No public star ratings.**
- **Outcome** appears on both profiles.

### Joiner (P3 is built; add the missing screens)
1. Details → Request to join.
2. **Answer the host questions** + an optional note.
3. Sent → Approved → Room.
4. Reminders at 24h and 2h.
5. **A16 Leave**, before the start, frees the spot.
6. **A15 Waitlist** state: "You're #2 — we'll tell you".
7. After the activity: confirm attendance or dispute → feedback → outcome.

## 4. Needs & offers (P4 built; add the intake)

**Need categories** (schema per category):
- **Moving & heavy lifting:** items; floors and lift at both ends; distance; helpers needed; vehicle needed?; date window.
- **Tutoring / mentoring:** subject; level/grade; online or in person; how often.
- **Repairs & fixes:** item (bike, appliance, furniture, electronics); what's wrong; photos; tools available.
- **Tech help:** device; problem.
- **Also:** pet care, plant care, errands, **borrow an item** (item, how long), rides/carpool (with a safety note), advice / career guidance, event help, other.
- **All needs:**
  - urgency (today / this week / flexible);
  - help type (free / skill exchange / I'll cover costs);
  - how far to show it (radius);
  - photos optional.

**Offer flow (missing): O1–O3.**
- Offer fields:
  - category; what exactly;
  - availability (days/times); radius;
  - free / exchange;
  - limits (e.g. at most 2 a week);
  - optional proof (portfolio link).
- Screens: O2 is the offer page; O3 lists the requests on my offer.
- Accept → coordination room → both confirm → outcome.

## 5. Jenny covers: a unique picture for every activity, with no upload needed

**Goal:** the host never has to upload anything. Every activity, project or community gets **its own** cover, and no two creations show the same image.
- A cricket match gets, say, a white ball on floodlit turf.
- The next cricket match gets a different picture.

**Screen (A5):**
1. A shimmer card with the Jenny orb pulsing: "Jenny is painting your cover…".
2. The image dissolves in (300ms), labelled **"Cover by Jenny · AI-generated"**.
3. Actions:
   - **Use this**;
   - **Try another** (up to 3 per activity; crossfade);
   - **Upload my own**;
   - **Plain colour card**.

**How the picture is made (JennySol builds this later; the frontend builds the UI and fallback now):**
- **The prompt is built from:**
  - category, subtype and key answers (format, ball type, indoor/outdoor);
  - the kind of place (lake, stadium, park, trail: never an address);
  - time of day (morning light / evening floodlights) and season;
  - a random seed;
  - a fixed house style: "warm golden-hour editorial photograph, Hyderabad feel, no text, no logos, no identifiable faces; people only as distant silhouettes".
- **Uniqueness:**
  - the seed is built from the activity id plus a random value;
  - a perceptual hash of every cover is stored; if a new image is too close to an existing one, regenerate.
- **Safety:** no real faces, text or brands; a safe-content check before showing.
- **Storage:** stored once in object storage as WebP, 1280×720 plus a 1:1 crop, with a blurhash placeholder.
- **Cost control:**
  - generated **once at creation**, never per view;
  - 3 tries per activity, 10 per person per day.
- **Fallback when AI is unavailable (e.g. Gemini credit):**
  - instantly show a **procedural cover**: a generated art card in the category colour, with a large category illustration and a subtle pattern, seeded by the activity id, so it's still unique and free;
  - honest line: "Jenny couldn't paint right now — here's a card. Try again later."
- **Proposed contract (log in FE-API-GAPS; the JennySol contract marks it PROPOSED):**
  - `POST /api/agent/gateway/v2/cover-image` with `{kind, category, subtype, answers, placeType, timeOfDay, seed}`;
  - returns `{imageUrl, blurhash, aiGenerated: true}`.
  - Arena BE saves `coverUrl` on the activity.
- **The frontend now:**
  - build the full A5 UI and the **procedural cover generator** (real, unique, free), used everywhere a cover is missing;
  - the AI path sits behind `NEXT_PUBLIC_JENNY_COVERS`, off by default.
- **Also used for:** projects, communities, and activity cards in Feed and Discover.
- **Not used for:**
  - needs, where people's own photos matter;
  - job posts, which use company colour cards. Never AI photos of fake offices.

## 6. Career (job seekers): P6 board + depth

Career is **opt-in and separate** from the social profile. Nothing is shared until the person chooses.

1. **Intent** (board): Find a job / Explore quietly / Offer my skills (freelance). "Hire locally" goes to Business setup.
2. **Basics:**
   - current title; total experience (years + months);
   - current company (**hidden by default**);
   - status (employed / serving notice / between jobs / student / freelancer);
   - notice period (immediate / 15 / 30 / 60 / 90 days); last working day if serving notice.
3. **Skills & stack:**
   - role family: Engineering, Design, Product, Data, SAP, Sales, Marketing, Operations, Finance, HR, Support, Other;
   - skills as chips, each with **proficiency** (Learning / Working / Strong / Expert) and years;
   - for tech: languages, frameworks, cloud, tools; **SAP modules** when the family is SAP; certifications.
4. **Compensation:**
   - current CTC (₹ LPA; fixed + variable optional); expected CTC (range); negotiable toggle;
   - **Only me by default.** It's shared with an employer only when the person applies and ticks "include my CTC".
5. **Preferences:**
   - up to 3 desired roles;
   - work mode (on-site / hybrid / remote); preferred locations;
   - open to relocate; shift preference; company size (optional).
6. **Resume & proof:**
   - upload a PDF/DOC (optional);
   - Jenny reads it: "Jenny found 6 skills and 3 roles — confirm each". The person confirms field by field; **nothing is auto-published**.
   - portfolio / GitHub / LinkedIn links; education (highest degree, institution, year); languages.
7. **Visibility preview** (board) → publish.

**Apply:**
1. Job details → **Apply sheet**, showing:
   - exactly what will be shared (a checklist);
   - the recruiter's **screening questions** (text / yes-no / number / choice);
   - resume (latest by default);
   - cover note: Jenny can draft it, the person edits;
   - a consent tick.
2. Submitted.
3. **Tracker:** Applied → Under review → Interview → Offer → Hired / Not selected, with Withdraw available at any time.
4. **Interview:** pick a slot, add to calendar.
5. **Offer:** view, accept or decline. No payments.
6. The outcome goes on the profile only if the person chooses.

**Honesty:** no match percentages. Show evidence, e.g. "Your must-haves: 4 of 5 shown".

## 7. Projects (missing)

- **PR1 Start a project:** title, goal, category, local or remote, duration, cover (Jenny).
- **PR2 Roles needed:** e.g. 2 designers and 1 developer, each with skills and weekly time.
- **PR3 Project page.**
- **PR4 Applicants:** requests with a note → accept / decline.
- **PR5 Team room:** Plan with a milestone checklist, Chat, Files (links).
- **PR6 Complete:** outcome, with contributors on each profile.

## 8. Arena for Business (companies & recruiters): `/enterprise/*`

**Setup:**
- **B1 Choose role** (board).
- **B2 Company workspace:**
  - legal name, website;
  - **work email on the company domain → verification code**;
  - size, industry, HQ city; GSTIN/CIN optional (checked by admin); logo.
  - The status is **"Verification pending"** until an admin approves. Jobs can be drafted but not published.
- **B3 Team:** invite by email with roles Owner / Recruiter / Hiring manager / Interviewer; seats.

**Dashboard:** a desktop left nav, plus the board's mobile screens on phones.
- **Home:**
  - today's interviews, new applicants, open roles;
  - tasks ("4 candidates waiting more than 3 days");
  - verification banner.
- **Jobs:**
  - Draft / Published / Paused / Closed;
  - **Post a job** (board form) with:
    - a **screening-question builder**;
    - a **pay range, required** (transparency);
    - a deadline;
    - the protected-attributes notice.
  - Job page with funnel counts.
- **Pipeline:**
  - Kanban with the stages New / Reviewing / Interview / Offer / Hired / Not selected. Drag with a lift animation; column counts animate.
  - List view with filters on **evidence only**: skills, experience, notice, location.
  - **Never** filters on age, gender, religion, caste or marital status.
- **Candidate profile:**
  - consented information only; must-have evidence (shown / partial / not shown);
  - answers; resume viewer;
  - team-private notes; activity and audit trail.
- **Interviews:** schedule (slots, interviewers, mode, meeting link); my interviews; structured feedback per must-have (no single overall score).
- **Messages:** only with people who applied or accepted a connect request.
- **Talent search:**
  - shows only people whose career visibility is **open**;
  - reaching out sends a **connect request** the person can accept.
- **Company page:** public: about, open roles, verified badge.
- **Settings:**
  - team & roles; audit log;
  - consent & data retention (candidate data deleted 12 months after a role closes);
  - billing & plan (display only).
- **Close the loop:** "Not selected" always sends a kind, templated message; Hire creates an outcome.

Reuse the existing `/enterprise` routes and their API calls: dashboard, postings, talent, interviews, messages, onboarding, and the admin pages team / company / billing / consent / audit.

## 9. Arena Admin (Vikisol staff): `/admin/*`

Platform-admin role and 2FA are always enforced by the existing logic. Desktop-first.
- **Overview:**
  - launch metrics: sign-ups; onboarding completed; activities created / joined / completed; needs resolved; jobs and applications; D1 and D7 return; reports;
  - honest "No data yet" states.
- **Verification queue:** companies: domain check, website, GSTIN/CIN → approve / reject with a reason.
- **Moderation:**
  - a reports queue with context (content, person, activity, job);
  - actions: dismiss, warn, remove content, suspend, ban;
  - a 24h timer, matching the board promise; notes.
- **Users:** search; profile view (no passwords, ever); suspend / restore; force sign-out; data export / delete requests.
- **Companies (tenants):** plan, seats, status.
- **Content:** browse activities, needs and jobs, with takedown; a categories and activity-types list.
- **Disputes:** attendance (72h) and outcome disputes.
- **Jenny & AI oversight:**
  - automations, approvals, failures;
  - generated covers (flag / remove);
  - provider status (honest);
  - AI action log.
- **Feature flags** (existing).
- **Audit log:** every admin action, with who, what, when and why.
- **Admin team:** 2FA required; launch areas list.

Reuse the existing `/admin`, `analytics`, `flags`, `moderation`, `tenants` and `users` routes.

## 10. Jenny across the app (P8 boards)

The P8 boards, plus **Jenny pre-fill** for every intake (§2). The pattern is always the same:
1. The person says it.
2. Jenny drafts it.
3. The person checks it.
4. The person approves.

Jenny never publishes, applies or sends on her own.

## 11. Motion & transitions (everywhere, including the dashboards)
- **Navigation:**
  - mobile push/pop: 24px slide + fade, 200ms;
  - tab switch: crossfade;
  - sheets: spring (from `src/lib/motion.ts`).
- **Intake:**
  - direction-aware step slide; dots or progress fill;
  - chips spring on select;
  - "Jenny filled" fields glow once.
- **Covers:** shimmer + orb pulse → 300ms dissolve; "Try another" crossfade.
- **Dashboards:**
  - numbers count up once; charts draw in over 400ms;
  - Kanban lift (scale 1.02 + shadow) and drop spring;
  - row hover; skeletons.
- **Success:** check draw + small burst; share sheet rises.
- **Rules:**
  - transform and opacity only;
  - `prefers-reduced-motion` means fades or instant;
  - 60fps on a mid-range Android.

## 12. Build order (after the current P6)
1. **Fix typecheck** (see the prompt), then finish **P6 Career** from the board plus §6 depth.
2. **P6b:** the intake engine (§2) + the full activity flow (§3) + procedural covers and the Jenny cover UI (§5).
3. **P6c:** need intake + the offer flow (§4) + projects (§7).
4. **P7:** the recruiter mobile board, then **P9 Arena for Business** dashboard (§8).
5. **P8:** the Jenny boards + Jenny pre-fill (§10).
6. **P10:** Arena Admin (§9).
7. **P11:** remaining account and people screens (§1.4, other people's profiles, share profile).

For every new screen:
- add it to `src/lib/dev/screens.json`;
- specimens go in `/dev/screen/<id>`;
- missing endpoints go into `docs/FE-API-GAPS.md` with exact fields. **No backend work in this mission.**
