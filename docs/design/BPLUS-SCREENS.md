# Arena B+ screen spec

Source of truth for every phase of `docs/missions/FE-BPLUS-BUILD.md`. Written from the attached
board PNGs (Concept A, Concept B, Concept B+, Onboarding B+, Discover & Join B+, Need→Outcome B+,
Career B+, Recruiter B+, Messages & Trust B+, VNext Jenny AI layer, VNext Jenny automates
outcome). **Concept A and Concept B are superseded and not spec'd below** — only B+ and the two
VNext-Jenny flow boards (restyled into B+) are in scope. Corrections from the mission's §2 are
already applied in every entry (bottom bar, no real brands, no match %, Jenny = orb, etc.) — where
a board's literal text/image conflicts with a correction, the correction wins and is noted.

Conventions used below:
- **Route**: proposed path under `src/app` — reuse an existing route if `src/app` already has one
  (checked against the current tree; noted where it does), otherwise this is the new route to
  create.
- **Layout**: top → bottom, one bullet per region.
- **Strings**: exact copy from the board, except where §2 requires a change (marked *[corrected]*).
- **Data**: which `src/lib/data/` domain interface this screen reads/writes.
- Global: bottom bar is **Feed · Discover · (+) · Work · You** on every talent-facing screen
  (correction #1) — not repeated per screen below. Map has no bottom-bar icon; it's reached as
  Discover's map mode (`/discover?view=map` or similar — decide exact param in P2/P3).

---

## Board: B+ core (Concept B+, restyled — "Living Local Companion")

### 1. Feed — `/home` (existing route)
- **Layout**: header (avatar, area selector "Gachibowli ▾", bell) → greeting card ("Good morning, Sameer" / "Around you today", warm photo background) → horizontal "People near you" row (See all) → "Activities" row → "Skills" row → "Projects" row → "Community pulse" activity ticker → Jenny suggestion card (orb icon, not photo — correction #2).
- **Strings**: "Good morning, {name}" (time-of-day aware) / "Real people. Real things happening nearby." / "Around you today" / section labels as above / "Jenny suggests — A skill share that matches your interests".
- **Components**: AreaSelector, GreetingHero (photo bg), PersonTile, ActivityTile, SkillTile, ProjectTile, JennyCard (orb).
- **States**: loading (skeleton hero + tiles), empty (no nearby activity → "Nothing nearby yet — be the first to post"), offline (banner, cached content stays visible per §"resilient states"), error+retry.
- **Data**: `feed`, `profile` (for area/avatar).
- **Motion**: hero Ken Burns is onboarding-only, not here; card list stagger 40ms; Jenny card breathing glow 1.6s.

### 2. Discover (list mode) — `/discover` (existing route)
- **Layout**: search bar → segmented tabs (All · People · Activities · Skills · Projects) → "People near you" grid (See all) → "Popular this week" → "Skills & support" → "Projects" grid.
- **Strings**: "Discover" / "People, activities and ideas near you." / "Search people, activities, skills…".
- **Components**: SegmentedTabs, SearchBar, PersonTile, ActivityTile, SkillChipTile, ProjectTile.
- **States**: loading, empty per tab ("No {tab} nearby yet"), offline, error+retry.
- **Data**: `search`, `feed`.
- **Motion**: tab switch content cross-fade 200ms; grid stagger 40ms (cap 8).

### 3. Map (Discover's map mode) — `/discover` with a view toggle, not a separate bottom-bar tab (correction #1)
- **Layout**: location bar ("Gachibowli / Gopanapally ▾") → segmented tabs (All/People/Activities/Needs/Offers) → map canvas with pins + "You" centre dot + approximate-radius ring → bottom sheet peek: nearest upcoming activity card (photo, title, time, distance, Join).
- **Strings**: "Looking in this area" / "Showing approximate location for your privacy" (must always be present — Arena's exact-location rule) / activity card content as in Discover & Join board #3.
- **Components**: MapCanvas, LocationBar, ActivityPeekCard, RadiusIndicator.
- **States**: loading (map skeleton), empty ("Nothing nearby — try widening your search"), location-denied (map still renders centred on the set area, banner explains why pins may be missing), offline (map tiles may be stale — banner).
- **Data**: `activities`, `needs`, `offers` filtered by approximate area — **never** exact coordinates client-side beyond the person's own location.
- **Motion**: pin drop-in stagger 40ms on load; sheet peek→expand spring 260ms.

### 4. Work — `/work` (existing route)
- **Layout**: header "Work" → segmented tabs (All · Active · Upcoming · Completed) → "Active" section (See all) with need/offer/activity cards showing role ("You're helping" / "You're going") → "Upcoming" section → "Completed" section with a quiet "Small actions, real change" closing line.
- **Strings**: section labels as above; per-card role line e.g. "You're helping", "You're going", "You're mentoring".
- **Components**: SegmentedTabs, WorkItemCard (photo + title + meta + role chip).
- **States**: loading, empty per tab, offline, error+retry.
- **Data**: `activities`, `needs`, `offers`, `applications` (career items surface here too once career is enabled).
- **Motion**: list stagger 40ms; tab content cross-fade 200ms.

### 5. Create — bottom sheet, not a route (opened from the `(+)` tab)
- **Layout**: sheet header "What do you want to make happen?" + close (×) → "A small step can create a big ripple nearby." → six tappable rows: Post a Need, Make an Offer, Create an Activity, Start a Project, Post a Job, Ask Jenny (pink-orange gradient icon per category colours).
- **Strings**: exact row labels/subtitles as on board (see Need→Outcome board #1 for the fuller version of this same sheet).
- **Components**: BottomSheet, CreateOptionRow (icon tile + label + subtitle + chevron).
- **States**: n/a (static menu; each row navigates to its own flow — see Need→Outcome board).
- **Data**: none (pure navigation).
- **Motion**: sheet spring-in 260ms; rows stagger 40ms; the `(+)` FAB rotates 45° while this rises (mission §4).

### 6. Profile ("You") — `/identity` (existing route)
- **Layout**: header (back / Edit) → avatar + name + tagline + location/availability line → bio → interest chips → stat row (Hosted / Joined / Helped / Projects, count up once on mount) → Availability (editable chips) → "Recent outcomes" (See all) → Privacy & visibility (Manage) link.
- **Strings**: "{Name}" / role/interest tagline / "Recent outcomes" / "Privacy & visibility" / "Manage".
- **Components**: ProfileHeader, StatRow (count-up), ChipList, OutcomeRow.
- **States**: own profile (editable) vs viewing someone else's (read-only, no Edit/Manage); loading skeleton; offline (cached).
- **Data**: `profile`.
- **Motion**: stat count-up once per mount, instant under reduced motion.

### 7. Jenny home — reached via Create sheet "Ask Jenny", Feed's Jenny card, or header — not a bottom-bar tab (correction #1)
- **Layout**: header "Jenny" + status pill (Online/Offline, must reflect real gateway reachability — correction #2) + info icon → segmented tabs (For you · Automations · Reminders · History) → chat-style message list starting with a greeting + "Today's plan" card → "Automations you control" (toggles) → "Recent activity" list → composer ("Ask me anything…", mic icon).
- **Strings**: "Hi {name}! Here's your plan for today." / "Today's plan" / "Automations you control" / "Manage" / "Recent activity" / "See all".
- **Components**: JennyOrb (status-aware: online pulses gently per §4, offline is static/desaturated), SegmentedTabs, PlanCard, AutomationToggleRow, ActivityRow, Composer.
- **States**: gateway offline (orb shows Offline, composer disabled with an honest inline message — never a fake "thinking" state), loading, empty (no plan yet → "Nothing scheduled — try asking Jenny something").
- **Data**: `jenny` (fixtures-only this mission — see mission §6/§7 P8).
- **Motion**: orb breathing glow 1.6s idle, same pulse while a request is in flight; reduced motion = static orb.

---

## Board: Entry & progressive onboarding B+

### 1. Welcome — `/onboarding` or `/` for signed-out (check existing `src/app/onboarding`, `src/app/auth`)
- **Layout**: full-bleed warm/golden-hour photo (Ken Burns, 12s loop) → logo → headline "Local people. Real outcomes." → subhead "Meet neighbors, join activities, get help, share skills and make your neighborhood stronger." → primary "Join Arena" → secondary "Sign in" → tertiary "Continue as guest".
- **Components**: KenBurnsHero, ArenaLogo, Button (primary/secondary/ghost).
- **States**: n/a (static entry).
- **Data**: none.
- **Motion**: Ken Burns 12s slow zoom/pan loop, static under reduced motion.

### 2. Sign up — `/auth` (existing route, check sign-up mode)
- **Layout**: back chevron → "Create your account" → "Join a neighborhood of real people doing real things together." → "Continue with Google" *(only if existing auth supports it — correction #10, else hidden behind `NEXT_PUBLIC_AUTH_GOOGLE` and logged in `docs/FE-API-GAPS.md`)* → divider "or" → Full name / Email / Password fields → ToS/Privacy checkbox → "Create account" → "Already have an account? Sign in".
- **Components**: TextField, PasswordField (show/hide), Checkbox, Button, GoogleButton (conditional).
- **States**: validation errors per field, submitting, existing-account error, offline (block submit, honest message).
- **Data**: `auth` — restyle only, keep existing calls/session logic untouched (mission §6).
- **Motion**: field focus 200ms; button press scale 0.97/120ms.

### 3. Sign in — `/auth` (existing route, sign-in mode)
- **Layout**: back chevron → "Welcome back" / "Good to see you again." → Email / Password fields → "Forgot password?" link → "Sign in" → divider "or" → "Continue with Google" *(conditional, as above)* → "Don't have an account? Create account".
- **Components**: same field set as Sign up.
- **States**: invalid credentials, submitting, offline.
- **Data**: `auth`.
- **Motion**: same as Sign up.

### 4. Why are you here? — `/onboarding/intent` (new, or a step within existing `src/app/onboarding`)
- **Layout**: back → step dots (filled 1 of ~5) + "Skip" → "Why are you here?" / "Choose as many as you like. You can change this anytime." → 2-column grid of 6 cards: Find activities, Meet useful people, Ask for help, Offer a skill, Find work, Hire or recruit → "Continue".
- **Components**: StepDots, IntentCard (icon tile + label + subtitle, multi-select toggle), Button.
- **States**: none selected (Continue disabled or defaults to "just exploring"), selected (visual check state).
- **Data**: `profile` (writes onboarding intent).
- **Motion**: step content slides 24px direction-aware; dots fill on advance.

### 5. Set up your local life — `/onboarding/local-life` (new)
- **Layout**: back → step dots + Skip → "Set up your local life" / "Help us show you what's nearby and relevant." → "Your area" dropdown (Gachibowli/Gopanapally) → "Your interests" chip picker (Running, Badminton, Learning, Volunteering, Food, Photography, Community events, Environment, + Add another) → "Location" toggle "Use my current location" with a privacy note ("Your location is private and only used to show relevant local suggestions.") → "Availability" chips (Weekdays/Weekends/Evenings) → "Continue".
- **Components**: StepDots, Dropdown, ChipPicker (multi-select, add-custom), ToggleRow, Button.
- **Data**: `profile`.
- **Motion**: same as step 4; chip select/deselect 200ms.

### 6. Your identity — `/onboarding/identity` (new)
- **Layout**: back → step dots + Skip → "Your identity" / "Help neighbors get to know you. You control what's visible." → avatar upload (optional, initials fallback) → Display name* → Professional title (optional) → Short intro (optional, char counter "0/160") → a "What people can see" preview note (name, photo, intro, interests, approximate area — editable/hideable anytime) → "Continue".
- **Components**: AvatarUpload, TextField, TextArea+CharCounter, InfoNote, Button.
- **States**: name required (blocks Continue), avatar upload progress/error.
- **Data**: `profile`.
- **Motion**: same pattern as prior steps.

### 7. You're all set — `/onboarding/ready` (new)
- **Layout**: step dots (all filled) → success framing: profile summary card (avatar, name, area, "Joined for activities" badge) → "You're all set!" / "Welcome to Arena. Let's make something good happen nearby." → "Recommended next steps" list (Join a nearby activity, Explore people, Post a need) → primary "Go to Arena".
- **Components**: StepDots, ProfileSummaryCard, RecommendationRow, Button.
- **Data**: `profile` (read back what was just set), `feed` (recommendation seeds).
- **Motion**: check/success framing draws in once; confetti burst ≤24 particles (reduced motion: no confetti, static check).

---

## Board: Discover & join an activity B+

### 1. Personalized Feed — `/home`, same route as B+-core Feed #1 (this board is a deep-dive of the same screen + its downstream flow, not a second Feed)
- Same spec as B+ core #1, with the specific card shown here: "Sunrise Run at Durgam Lake" hero card, "A friendly 5K to kickstart the weekend. All levels welcome.", distance "1.2 km away", avatar stack "+12 going", primary "Join activity".

### 2. Discover & Filter — `/discover`, same route as B+-core Discover #2
- Adds explicit filter chips shown on this crop: Today / Weekend / Free / Fitness / Learning / "All filters" — confirms Discover #2's spec should include a filter-chip row between search and tabs.

### 3. Map Results — `/discover` map mode, same route as B+-core Map #3
- Confirms the map spec: pins colour-coded by kind (fitness/learning/community icons), "You (approximate)" centre marker, bottom card peek for the nearest activity.

### 4. Activity Details — `/discover/activities/[id]` or reuse existing activity detail route if present (check `src/app`)
- **Layout**: hero photo (share/overflow icons) → title "Sunrise Run at Durgam Lake" → description → date/time row (+ "Add time" affordance if missing) → location row with map-point + privacy note ("Meeting point shared after you join") + "Family and beginner friendly" → host card (avatar, name, "Verified neighbour" badge *only if data says so — correction #9*, role/bio, Message button) → tag chips (Open to all levels, 20 spots available, Accessible via metro & parking) → primary "Request to join" / secondary "Cancel request" (state-dependent).
- **Components**: HeroImage, InfoRow, HostCard, TagChip, Button.
- **States**: not-requested / request-pending / already-joined / activity full / activity past.
- **Data**: `activities`.
- **Motion**: hero uses the shared layoutId transition from the Feed/Discover card it was opened from.

### 5. Join Request Sent — modal/sheet over Activity Details, not its own route
- **Layout**: paper plane icon (animates in on a curve) → "Join request sent!" / "Your request to join {activity} has been sent to {host}." → status timeline: Request sent (done) → Host will review (pending) → If approved (pending, explains what unlocks) → info card "A safer community — Hosts review requests to keep everyone safe and make sure it's a good fit for the group." → "Cancel request".
- **Components**: AnimatedIcon, StatusTimeline, InfoCard, Button.
- **Data**: `activities` (join-request state).
- **Motion**: paper plane flies in on a curve (mission §4); timeline steps crossfade 300ms as state changes.

### 6. Approved & Ready — same modal pattern, post-approval state
- **Layout**: check-draw icon + confetti (≤24 particles, reduced motion = check only) → "You're in!" / "{Host} has approved your request. Here are the meeting details." → meeting card (pinned: exact point, address, date/time — this is the one point where exact location is revealed, per Arena's participation rules) → photo preview of the room → action list: Add to calendar, Set reminder, Share with group → primary "Open activity room".
- **Components**: SuccessIcon+Confetti, MeetingCard, ActionRow, Button.
- **Data**: `activities`.
- **Motion**: check draws itself once; confetti burst; reduced motion = check only, no confetti.

### 7. Activity Room — `/rooms/[id]` (existing route)
- **Layout**: header (back, title, people count, overflow) → segmented tabs (Chat / Details / People) → **Details** tab: pinned meeting info card, message list preview → **Chat** tab: message thread, composer → **People** tab: member list → bottom action row: Host tools (host only), Report, Leave.
- **Components**: SegmentedTabs, PinnedInfoCard, MessageBubble, Composer, MemberRow.
- **States**: loading, empty chat ("Say hi to the group"), offline (queued-send banner), room closed/past.
- **Data**: `rooms`/`messages`.
- **Motion**: tab switch 200ms cross-fade.

---

## Board: From a local need to a real outcome B+

### 1. Create ("What do you want to make happen?") — the Create bottom sheet, same as B+-core #5, fuller copy confirmed here
- Six rows exactly: Post a Need / Make an Offer / Create an Activity / Start a Project / Post a Job / Ask Jenny, each icon-tile + label + one-line subtitle as on board.

### 2. Post a Need — `/needs/new` (new)
- **Layout**: close (×) → "Post a Need" / "Tell your neighbors what you need." → "What do you need help with?" text field (char counter) → Category picker (Moving & Heavy Lifting, etc.) → "Where" (approximate area, "Visible to nearby people only" note) → "Preferred time" → "Add a photo" (optional) → "Share with" (Nearby people / area scope, "Only people near this area can see your need") → "Preview" → primary "Post Need".
- **Components**: TextField+Counter, CategoryPicker, LocationField, TimeField, PhotoUpload, ScopeSelector, Button.
- **States**: validation (what+category required), submitting, offline (draft saved locally, resilient-states pattern).
- **Data**: `needs`.
- **Motion**: sheet slides up 260ms.

### 3. Need page with offers — `/needs/[id]`
- **Layout**: header (status pill "Open", overflow) → title, distance, flexibility line → description → "Offers of help (N)" list, each row: avatar, name, verified badge *(conditional)*, offer message, time → per-offer actions on the owner's view: Decline / "Accept & Open Chat" → "Recent outcomes" mini-list (social proof, other resolved needs by same neighborhood) → owner-only: Edit / Pause / Close.
- **Components**: StatusPill, OfferRow, Button, OutcomeMiniRow.
- **States**: owner view vs offerer view vs bystander view; no offers yet ("No offers yet — check back soon"); need closed/resolved.
- **Data**: `needs`, `offers`.

### 4. Offer details — modal/sheet over Need page, or `/needs/[id]/offers/[offerId]`
- **Layout**: offerer profile card (avatar, name, "Neighbor · {distance}", role/workplace line) → trust line ("Kind, reliable and always down to help in the neighborhood.") → "Shared interests" chips → "Recent outcomes" (offerer's own history) → the offer message itself → Decline / "Accept & Open Chat".
- **Data**: `offers`, `profile`.

### 5. Private coordination room — `/rooms/[id]` (same Activity Room component, need-specific config)
- **Layout**: header "Private coordination room — Only you and {offerer} can see this chat" → segmented tabs (Plan / Chat / Files) → **Plan** tab: pinned details card (editable: time, location, notes) with "Add meeting link" *(this replaces "Audio session/Join audio room" per correction #6 — same card treatment, "Open link" button instead of a call-join button)* → **Chat**/**Files** tabs as Activity Room.
- **Components**: same as Activity Room + PinnedDetailsCard (editable) + MeetingLinkCard *[corrected from AudioSessionCard]*.
- **Data**: `rooms`, `needs`.

### 6. Mark as completed — modal over the coordination room
- **Layout**: "Mark as completed" / "Did the need get resolved?" → check-draw success animation → "It's done! {Need} has been completed." → "Confirm on your side" prompt (both parties must confirm) → optional photo of the outcome → optional note (visible only to each other) → "Done" → "Something not right? Report this outcome" escape hatch.
- **Components**: SuccessIcon, PhotoUpload(optional), TextArea(optional), Button, ReportLink.
- **Data**: `needs` (completion state, requires both-party confirm — do not mark done from one side alone).
- **Motion**: check draws itself; small confetti.

### 7. See the outcome — on Work (`/work`) and on Profile (`/identity`)
- **Layout on Work**: tabs (My needs / My offers) → per-item card with a "Completed" pill, other party's avatar+name, "Confirm on your side" if still pending, date.
- **Layout on Profile**: "Recent outcomes" list entries exactly as spec'd in B+-core Profile #6.
- **Data**: `needs`, `offers`, `profile`.

---

## Board: Open the career layer B+

### 1. My Profile (career entry point) — `/identity`, extends B+-core Profile #6
- Adds: segmented tabs (For you / About / Impact), "Recent outcomes" list, and an **"Open career profile"** row (icon tile + "Explore opportunities when you're ready.") — this is how a community-only member opts into career without a second signup (Arena's "one progressive identity" rule).

### 2. Career Intent — modal/sheet, `/identity/career/intent` (new)
- **Layout**: close (×) → "What do you want to do with your career on Arena?" / "Choose an option. You can change this anytime." → four rows: Find a job, Explore quietly ("Look around without showing intent"), Offer my skills, Hire locally → "Continue".
- **Components**: IntentOptionRow, Button.
- **Data**: `profile` (career-intent field).

### 3. Career Setup — `/identity/career/setup` (new)
- **Layout**: close → "Set up your job preferences" / "This helps us show you relevant opportunities. You can edit anytime." → Desired role, Key skills (chip add), Experience level (dropdown), Preferred work mode (Any/On-site/Hybrid/Remote — segmented), Preferred locations (chip add), Compensation visibility (dropdown), Notice period (dropdown), Resume upload (optional, "You can also apply without a resume") → "Continue".
- **Components**: TextField, ChipInput, Dropdown, SegmentedTabs, FileUpload, Button.
- **Data**: `profile` (career sub-object).

### 4. Privacy Preview — `/identity/career/privacy` (new)
- **Layout**: close → "Preview your visibility" / "Control what different people see. You decide what to share." → "Your social profile (always visible)" summary card → three collapsible sections: "What employers see (when published)", "What neighbors see (when published)", "What your connections see (when published)" — each lists the exact fields it reveals → "Open to work" toggle ("Not visible yet. Turn on when you're ready to publish.") → primary "Publish career profile".
- **Components**: SummaryCard, CollapsibleSection, FieldList, ToggleRow, Button.
- **Data**: `profile`.

### 5. Work → Jobs — `/work` with a Jobs tab, or `/jobs` (existing route — check `src/app/jobs`)
- **Layout**: header "Work" → tabs (All/Jobs/People/Activities/Needs) → "Jobs near you" (See all) list of JobCard (company monogram logo — **fictional company names only, e.g. GreenLeaf Labs, MapMyLane, CivicReach — correction #3**, title, location/mode, save icon) → "For you" personalized section.
- **Components**: JobCard (with fictional monogram logo component, not a real brand SVG).
- **Data**: `jobs`.

### 6. Job Details — `/jobs/[id]` (existing route)
- **Layout**: back, save, overflow → company (fictional, verified badge *conditional*) → title "Product Designer" → location/mode/type → tabs (About/People/Reviews) → "About the role" description → Must-haves list → Nice-to-haves list → primary "Apply".
- **Components**: CompanyHeader (monogram logo), SegmentedTabs, RequirementList, Button.
- **Data**: `jobs`.

### 7. Apply & Track — application flow + `/applications/[id]` (existing route)
- **Layout (apply)**: application form → confirmation.
- **Layout (tracker)**: header "My application" → job summary card → status timeline: Application submitted → Under review → Interview → Offer → Hired (current step highlighted, future steps greyed) → Withdraw application / View application actions.
- **Components**: StatusTimeline, JobSummaryCard, Button.
- **Data**: `applications`.
- **Motion**: timeline crossfade 300ms + line fill on status change.

---

## Board: Verified recruiter & hiring journey B+

### 1. Choose your role — `/enterprise/onboarding` (existing dir — check routes) or new `/recruiter/onboarding`
- **Layout**: "Create your Arena account" / "What brings you here?" → two large option cards: "Join as a local person" vs "Recruit for a company" (selected state shown) → "Switch anytime" note → "Continue as recruiter".
- **Data**: `auth`/`profile` (role selection).

### 2. Company workspace — `/enterprise/onboarding` company setup step
- **Layout**: "Company workspace" / "Tell us about your organization." → Legal company name, Work email (company domain), Company website, Your role (dropdown) → Verification status card (Verified/pending, "Identity and domain verified on {date}") → "Complete setup".
- **Data**: `recruiter` (company profile).

### 3. Post a job — `/enterprise/postings/new` (existing dir)
- **Layout**: "Post a new job" / "Create a clear, inclusive opportunity." → Job title, About the role (char counter) → Must-haves (chip add) → Nice-to-haves (chip add) → Experience level / Work mode → Location → Compensation / Notice period → **protected-attributes notice**: "We don't allow requests for age, gender, marital status, religion, caste, disability status or other protected attributes. Learn more" (must render as a real, visible notice — this is Arena's no-protected-attribute-targeting rule, not decorative copy) → Share options → Save draft / Preview job.
- **Components**: TextField, ChipInput, Dropdown, ProtectedAttributesNotice (fixed component, not per-form copy), Button.
- **Data**: `jobs` (draft).

### 4. Manage your job — `/enterprise/postings/[id]` (existing dir)
- **Layout**: header (status "Published", overflow) → tabs (Overview/Candidates/Activity) → funnel stat row (New/Reviewing/Interview/Offer/Closed counts) → "Keep it moving" nudge card → Job details summary (Edit) → "Share your job" (Copy link only — no real social-brand icons needed, keep generic) — "Copy link".
- **Data**: `jobs`, `applications`.

### 5. Review candidates — `/enterprise/postings/[id]/candidates`
- **Layout**: header "Candidates" + filter → tab/count row (All/New/Reviewing/Interview/…) → "Must-have evidence" summary card (aggregate) → candidate list rows: avatar, name, stage, evidence chips **("Matches N/6 must-haves" — evidence count only, never a % — correction #4**), tag pills.
- **Data**: `recruiter` (candidate list scoped to this job).

### 6. Candidate profile (evidence) — `/enterprise/postings/[id]/candidates/[candidateId]`
- **Layout**: back → name, "Applied {relative date}" *(correction #8 — never a literal 2024 date)*, "Consented information" badge → "Key information" (location, work mode, availability, compensation range, right-to-work) → "Candidate message" → "Must-have evidence" checklist, each item marked with a source ("Shown: experience", "Not provided") — **no ranking, no score, just evidence + gaps** → recruiter-private notes → Decline / "Move to interview".
- **Components**: EvidenceChecklist (per-item source tag, not a score), NotesField (private), Button.
- **Data**: `recruiter`.

### 7. Interview & outcome — `/enterprise/interviews/[id]` (existing dir)
- **Layout**: "Interview & outcome" / "Move candidates forward with clarity." → key info (based-in, work mode, availability, on-site location) → candidate message → Update status dropdown → Offer & close section (Send offer / Not selected) → Activity & audit trail (timestamped log: "Interview scheduled — by {recruiter}") → **Data retention note**: "Candidate data is retained for 12 months after role closure, then securely deleted." (must be a real, visible statement, not a placeholder).
- **Components**: StatusDropdown, AuditTrailList, DataRetentionNote, Button.
- **Data**: `recruiter`, `applications`.

---

## Board: Messages, trust & everyday controls B+

### 1. Inbox — `/rooms` (existing route)
- **Layout**: header "Inbox" + search → filter tabs (All/Activities/Needs/Jobs/Direct) → conversation list rows: avatar, name/title, last message preview, relative time *(correction #8)*, unread dot.
- **Data**: `rooms`.
- **States**: empty ("No conversations yet"), offline (cached list, banner).

### 2. Conversation — `/rooms/[id]` or `/messages/[id]` (existing routes — reconcile which one is canonical in P0)
- **Layout**: header (avatar, name, distance, overflow) → message thread (system messages e.g. "Here's the meeting link for tomorrow" rendered distinctly from chat bubbles) → **"Meeting link" card** *(replaces Audio session/Join audio room — correction #6: same visual card, "Open link" button, no native call UI)* → attachment previews → composer (audio-note mic icon is fine for voice messages, distinct from "native audio session" which is out of scope) → action bar (Audio icon here = voice message, not a live call — verify against correction #6 before implementing; if ambiguous, ship text+file only and log the gap).
- **Data**: `rooms`/`messages`.

### 3. Notifications — `/notifications` (existing route)
- **Layout**: header "Notifications" + settings gear → filter tabs (All/Activities/Needs/Jobs/Messages) → grouped by "Today"/"Earlier" → NotificationRow (icon, title, relative time, primary+secondary action e.g. View/Snooze, View/Mark read).
- **Data**: `notifications`.

### 4. Search — `/search` (existing route)
- **Layout**: search bar (autofocus) → scope chips (People/Activities/Needs/Jobs/Skills) → location+radius filter row ("Near Gachibowli/Gopanapally", "Within 5 km", "Safe & private") → sort control (**"Most recent" as the default and only meaningful ranking basis — correction #4, no relevance-score sort**) → results list, mixed-type rows.
- **Data**: `search`.

### 5. Settings & Privacy — `/settings` (existing route)
- **Layout**: "Privacy & visibility" section (Profile visibility, Precise location toggle "Use approximate location", Career visibility) → "Account & data" section (Download my data, Delete account, Blocked accounts) → "Notifications" (preferences link).
- **Data**: `profile`, `auth`.

### 6. Report / Block — modal/sheet, reachable from any profile/room overflow menu
- **Layout**: "Report a problem" → radio list of reasons (Inappropriate messages, Harassment or hate speech, Fake profile, Spam, Unsafe behavior, Other) → "Add evidence (optional)" photo upload → "What happens next?" info card (review SLA, block info, escalation) → Cancel / "Submit report".
- **Data**: a `report` action on whatever domain the target belongs to (rooms/profile).

### 7. Resilient states — cross-cutting, not a single route
- **Offline banner**: persistent top banner, "You're offline. This screen will retry when the connection comes back." plus a cached-content note ("Recent (cached)").
- **Empty state**: icon + heading + one-line explanation, never a bare blank screen.
- **Error + retry**: icon + "We couldn't load this content. Please check your connection and try again." + Retry/Try later.
- **Draft saved**: "Your draft is saved — we'll keep it until you're back online."
- Every list/detail screen above must implement all four via one shared `<Status kind="loading|empty|error|offline" />` primitive (P0 component kit) rather than ad hoc per-screen copy.

---

## Board: VNext — Jenny, the active AI layer (flows kept, **restyled into B+** — no dark near-black UI, no Map tab, Jenny is not a 7th bottom-bar icon)

### 1. Feed (Jenny surfaces what matters) — `/home`, layered onto B+-core Feed #1
- Adds: "Jenny noticed — 2 opportunities near you + 1 pending action" card (orb icon) above the normal feed content, and a "Review" CTA on any feed item Jenny has drafted something for (e.g. "Review your draft post — Needs time and capacity").
- **Data**: `jenny`, `feed`.

### 2. Discover (Jenny turns intent into results) — `/discover`, layered onto B+-core Discover #2
- Adds: a search-to-intent state — after a free-text query, a "Jenny understood your request" card shows the parsed, **editable** filter chips (Activity: Badminton, Skill level: Beginner, When: This weekend) plus "Why these results?" link. **No dark background swap** — same cream/graphite B+ theme, just this card inserted above results.
- **Data**: `jenny` (intent parse), `search`.

### 3. Create (Jenny drafts, you approve) — the Create sheet, Ask Jenny option leads here
- **Layout**: "Create" sheet header → voice/text intent input → "Drafted by Jenny — Here's a draft based on your request." → the draft itself as a normal Need/Post card with a "Draft" pill → inline nudge if fields are missing ("Please add a time and confirm capacity before publishing.") → "Edit" / "Preview & approve".
- **Data**: `jenny`, `needs`/relevant domain.
- **Correction applied**: this is functionally identical to Need→Outcome board #2 (Post a Need) plus a Jenny-drafted starting point — reuse that screen's components, don't build a parallel form.

### 4. Smart Match (transparent, human-centered) — a detail sheet reachable from a Jenny-surfaced result
- **Layout**: hero photo → title/date/location → **"Why this matches you?"** section: a checklist of concrete reasons ("You've joined 3 similar cleanups", "Nearby and at a time you're usually free", "Matches your interest in sustainable cities") — **no percentage, no score (correction #4)** → "Additional context" (organizer, interested-count) → "Things to consider" (caveats, e.g. "Exact meeting point shared after you join") → Skip / Edit preferences / "I'm interested".
- **Components**: WhyThisChecklist (reasons only, never a number).
- **Data**: `jenny`.

### 5. Work (Jenny organises, you stay in control) — `/work`, layered onto B+-core Work #4
- Adds three grouped sections within Work: **"Needs your approval"** (Jenny-drafted items awaiting a human decision, each with a "Review" affordance), **"Jenny can handle"** (toggleable automations, e.g. "Add to calendar", with an explicit per-item control, not a silent auto-action), **"Waiting on others"** (sent items pending a reply from someone else).
- **Data**: `jenny`, `activities`/`needs`.

### 6. Approval (clear, explicit consent) — the Approve action sheet, opened from any "Review" affordance above
- **Layout**: orb icon + "Send this message?" → the exact drafted content in a quoted card, with its source line ("— {name} via Arena") → "Recipient / audience" (exact count + expandable list) → "Data used" (explicit field list — name, project/activity details, general area — **"Exact location is not shared"** must be stated when true) → "You can undo this within 10 minutes if needed" **shown only when `reversible: true` on the action — correction #5, hidden by default** → primary "Approve and send" / secondary "Always ask me" / "Cancel".
- **Components**: ApprovalSheet (quoted-content card, audience list, data-used list, conditional undo line), Button.
- **Data**: `jenny` (pending-action approve/reject — same propose→preview→approve→execute→audit model as JennySol's Agent Gateway).
- **Motion**: `navigator.vibrate(10)` on Approve where supported (mission §4).

### 7. Jenny (your active AI layer) — same route/spec as B+-core Jenny home #7
- This board's version is the same screen; confirms the tab set (For you/Automations/Reminders/History), "Today's plan", "Automations you control" with per-item toggles, "Recent activity", composer. No changes beyond B+-core #7's spec.

---

## Board: VNext — Jenny automates the outcome (flows kept, **restyled into B+**) — the job-search automation journey

### 1. Tell Jenny (conversational intent capture) — entry point from Career Intent (Career board #2) via "Ask Jenny", or Jenny home composer
- **Layout**: Jenny chat bubble: "I'm looking for a product design job, but keep it private." → Jenny's reply: "Got it. I can help you find product design opportunities and handle the repetitive work — privately. Shall we set this up?" with three explainer rows (Use your existing profile / You control what's shared / No auto-apply) → "Let's set it up" / "Maybe later".
- **Data**: `jenny`, `profile`.

### 2. Create draft (Jenny drafts using your profile) — `/identity/career/setup` continuation, layered onto Career board #3
- Adds: "I've used your existing profile to create a draft. Please complete the missing details." framing, and a "We still need a few details" section (add-icon rows for Total experience, Work mode, Compensation, Notice period) above the normal Career Setup fields.
- **Data**: `jenny`, `profile`.

### 3. Set privacy (choose what's shared, with whom) — same as Career board #4 (Privacy Preview), Jenny-flow framing
- Adds: segmented "Profile fields / Audience" toggle at the top, and a per-field "People I apply to ▾" dropdown (vs a flat "always visible/private" toggle) — this is a finer-grained control than the plain Career-board version; both should share the same underlying `PrivacyFieldRow` component with a `granular` prop.
- **Data**: `profile`.

### 4. Set automation (tell Jenny how to work for you) — `/identity/career/automation` (new)
- **Layout**: "My job search" → an ordered "Trigger → Then → Then → Then → Never" rule list, each row editable: Trigger (watch for new verified roles matching preferences), Then (shortlist by must-haves), Then (prepare application drafts), Then (remind me about good matches/follow-ups), **Never (submit any application without my approval — this must be the literal, unremovable floor of the automation, not just a default)** → "Edit automation" → "Turn on automation".
- **Components**: AutomationRuleList (editable steps, one fixed non-removable "never auto-apply" row), Button.
- **Data**: `jenny`.

### 5. Review shortlist (Jenny finds and explains) — `/identity/career/shortlist` (new) or a Work sub-tab
- **Layout**: "Today's shortlist" + filter → job cards, each with fictional company + evidence chips ("Matches 8", "Questions 1", "Missing 1" — **counts, never a % — correction #4**) and a "Why this" expandable (2–3 concrete reasons, e.g. "Design systems focus", "Growth stage, cross-functional team").
- **Data**: `jenny`, `jobs`.

### 6. Approve & submit (you review and approve) — `/applications/new` review step, same pattern as the Approval sheet (VNext AI-layer board #6)
- **Layout**: job summary → "Your answers" (Edit) → Resume file → "Message to employer" (Edit) → "Data to be shared" explicit list → Save draft / "Approve & submit" — **never** an auto-submit path.
- **Data**: `jenny`, `applications`.

### 7. Track outcome — `/applications/[id]`, same route/spec as Career board #7 (Apply & Track)
- Confirms the same StatusTimeline component, plus a Jenny chat entry acknowledging the submission and committing to keep tracking — no new UI beyond Career board #7.

---

## Cross-cutting notes for P0

- **Routes already existing** that this spec reuses rather than duplicates: `/home`, `/discover`, `/work`, `/identity`, `/feed/[id]`, `/rooms`, `/rooms/[id]`, `/messages/[id]`, `/notifications`, `/search`, `/settings`, `/jobs`, `/jobs/[id]`, `/applications/[id]`, `/auth`, `/onboarding`, `/enterprise/*`. New routes needed: onboarding steps (`/onboarding/intent`, `/onboarding/local-life`, `/onboarding/identity`, `/onboarding/ready`), `/needs/new`, `/needs/[id]`, career sub-routes under `/identity/career/*`, `/identity/career/shortlist`, `/identity/career/automation`. Confirm every one of these against the real `src/app` tree at the start of P0 — this list is from the boards, not yet cross-checked file-by-file.
- **Shared primitives every screen above depends on** (build once in P0, per mission §7): AppShell w/ bottom bar, BottomSheet, SegmentedTabs, Card (need/offer cream variant + dark variant), PersonTile/ActivityTile/SkillTile/ProjectTile/JobCard, StatusTimeline, ApprovalSheet, WhyThisChecklist, EvidenceChecklist, AutomationToggleRow, JennyOrb, Status (loading/empty/error/offline), StepDots, AvatarUpload, ChipInput/ChipPicker.
- **Fictional company set** (correction #3) — pick a small fixed roster to reuse across Career/Recruiter/Jenny screens rather than inventing new ones per screen: GreenLeaf Labs, MapMyLane, CivicReach, (add 2–3 more as needed), each with a generated monogram logo, never a real logo asset.
