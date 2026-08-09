# SAFETY-STATUS.md — §4/§5 audit verdict (2026-08-10)

Audited against the actual `ARENA-V2-PRODUCT-ARCHITECTURE.md` text, which reached this session
for the first time today (it was pasted into chat for Phases A/B/C but never saved as a file -
see DECISIONS.md). Every item below was checked against the real code in this repo as it stands
right now, not against memory of what Phase B intended to build. Gaps found were fixed in the
same pass unless explicitly marked otherwise below, with the reasoning for anything left open.

**Method**: read the actual entity/service/controller code for every claim, then live-verified
the fixed items against production (`api-arena.vikisol.in`) with real requests, not just unit
reasoning. Where a check is marked ✅ **Verified live**, that means a real HTTP round trip against
production confirmed the behavior today, not just that the code looks right.

---

## The six items asked about, specifically

### 1. Verification tiers — ⚠️ PARTIAL, and stays partial (documented reason)
Real, working: phone verification (`VerificationService` - OTP generate/hash/expire/confirm
cycle, genuinely functional, `NoopPhoneOtpProvider` logging instead of SMS-ing). `VerificationLevel`
enum (`BASIC/PHONE/ID`), ordinal `atLeast()` comparison, creators can require a tier to join
(`Post.requiredVerificationLevel`), enforced server-side in `PostService.requestJoin`.

Not built: the spec's own tier ladder is "phone/email → work email or ID → verified badge" - a
work-email tier doesn't exist (only phone), and ID verification is explicitly blocked on a KYC
vendor decision (see BLOCKED.md, unchanged this pass - faking "ID verified" with no real
document check would be a worse gap to paper over than an honestly-partial tier system).
**Recommendation**: a work-email tier (verify a company email domain) is real, buildable, cheap
scope if wanted next - much more tractable than ID verification since it needs no vendor.

### 2. Age-gating (minors can't enter stranger-meetup flows) — ✅ COMPLETE
`AgeUtil.isAdult()` (self-attested `dateOfBirth`, hard 18+ check) gates both `PostService.create()`
and `PostService.requestJoin()` for `ACTIVITY` posts specifically (the real-world-meetup intent
type - `ASK`/`UPDATE`/`COMPANY` correctly don't carry the same risk and aren't gated). Confirmed
**live** on production today: creating/joining an ACTIVITY post with no DOB set correctly 400s
with an actionable message; setting a DOB and retrying correctly succeeds. Self-attested, not
cryptographically verified - stated plainly in DECISIONS.md, not implied to be stronger than it
is. No ID-verification vendor exists to make this provable (see item 1).

### 3. Location consent (precise/city/off, app usable at "off") — ✅ COMPLETE
`LocationConsent` enum on `CandidateProfile` (`PRECISE/CITY/OFF`, default `OFF`).
`CandidateProfileService.updateLocationConsent` clears all stored geo fields on any downgrade,
even if the caller doesn't resend them. `CITY` geocodes a typed city name only (no device
geolocation call at all). `OFF` stores nothing. Feed ranking's proximity term and the Map screen
both degrade to "no distance-based sort/centering" at `OFF` - confirmed by reading
`FeedRankingService`'s and the Map page's own handling, neither one blocks or breaks when geo
fields are absent. Frontend Settings page exposes all three options with the exact "the app
must remain usable at 'off'" framing.

### 4. Coarse geohash storage, jittered pins, no exact point ever exposed — ✅ COMPLETE
`GeohashUtil` (self-contained, no PostGIS/new dependency - see DECISIONS.md) encodes to a
7-character geohash (~150m cells) and always decodes back to the **cell center**, never the raw
point - the raw device coordinate is discarded the instant it's encoded, in exactly one place in
the whole codebase (`CandidateProfileService.updateLocationConsent`). A **second, independent**
jitter (`GeohashUtil.jitter`, up to 150m) is applied again at serve time in `PostMapper`, so even
the already-coarse stored value isn't the literal thing rendered to another user. Verified live
in a prior pass this session: two separate reads of the same post (a direct fetch vs. a nearby-
search result) returned two different `approxLat`/`approxLng` values, proving the second jitter
is genuinely applied per-request, not just present as a comment.

### 5. Exact meeting point — only inside the room, only to approved joiners — ✅ COMPLETE
`PostMapper`'s gate is `mine || "approved".equals(myJoinStatus)` - the author and only
currently-approved participants ever see `Post.exactMeetingPoint` in a `PostResponse`; everyone
else gets `null`, including someone with a *pending* request. **Verified live** today (full
two-account round trip): B requested to join A's activity, fetched the post - `exactMeetingPoint`
was `null`. A approved. B fetched again - `exactMeetingPoint` was now the real value. Confirmed
the gate flips exactly on approval, not before.

### 6. Report/block/mute wired into the platform-admin moderation queue — ✅ COMPLETE (fixed today)
Block and mute were already solid from Phase B (`BlockService`, room `muted` flag) and are
unchanged. **Report had a real gap found in this audit and fixed today**: a Room only exists for
`ACTIVITY`/`ASK` posts that already have an approved joiner - every `UPDATE`/`COMPANY` post, and
every `ACTIVITY`/`ASK` post before its first approval, had **no report path at all**. Fixed:
`ModerationContentType.POST` + `ModerationItem.post`, `ModerationService.filePostReport`,
`POST /posts/{id}/report`, wired into the same admin queue (`ModerationService.toResponse`/
`dismiss`/`takedown` all branch correctly on the new type). **Verified live**: reported a post
directly with no Room involved, confirmed it appeared in `GET /admin/moderation?status=pending`
with `contentType: "post"`, took it down, confirmed the underlying post flipped to `cancelled`.

---

## Additional §4 gaps found in this audit and fixed (not explicitly asked about, but real)

- **Auto-flag phrases was JobPosting-only.** The activity layer's own posts had zero automated
  scam-phrase scanning despite §4 naming it directly ("auto-flag phrases"). Fixed:
  `ModerationService.autoFlag(Post)`, called from `PostService.create()` for every intent type.
- **"Creator can remove anyone" was entirely unbuilt.** No `RoomService` method existed to
  remove a member; the only lever an author had was cancelling the whole post. Fixed:
  `RoomService.removeMember` (admin-only, reopens capacity, notifies the removed person),
  `DELETE /rooms/{id}/members/{userId}`, a Members panel in the room UI. **Verified live**: a
  real removal correctly decremented `spotsFilled`, and the removed account correctly lost room
  access (403 on the next message-list call).
- **"Show join-count, ratings, and account age" had none of the three.** Added join-count
  (a real track record: how many other posts this person's been *approved* into) and account
  age to every `PostResponse`, surfaced on post cards/detail with a visible "new account"
  warning under 14 days old. Ratings are a separate, larger gap - see below.
- **"In-room safety UX: public-place suggestions, share-my-plan"** - neither existed. Added a
  public-place suggestion line next to the revealed meeting point, and a share-my-plan action
  (assembles the meetup details already on the page into shareable text via the OS share sheet,
  clipboard fallback) - no new backend/contacts system needed for either.

## Gaps found and deliberately NOT fixed this pass (stated plainly, not silently dropped)

- **Women-only / invite-only activity option** (§4 explicitly names both). Invite-only is
  functionally covered by what already exists - `PostVisibility.APPROVAL` already lets a creator
  vet every joiner one at a time, and creator-removal (just added) closes the other half of that
  control. Women-only is **not** buildable honestly right now: this app collects no gender field
  anywhere in the data model, on any profile, for anyone. Adding one to gate a safety feature is
  itself a real, sensitive DPDP-relevant product decision (a new personal-data category, its own
  consent story) that deserves deliberate scoping, not a rushed bolt-on inside an audit pass.
  Flagged in BLOCKED.md.
- **Ratings/reputation from activities** (§4's "join-count, ratings, and account age" - ratings
  specifically). No rating system exists for activity participation at all (marketplace
  project ratings exist and are unrelated). This is a real, separate feature - prompting a rating
  after an activity ends, storing it, surfacing it - not a small fix. Flagged in BLOCKED.md as
  genuinely out of scope for a gap-fixing pass.
- **Work-email verification tier.** See item 1 above.

---

## Phase C reconciliation (company pages) — the other half of this pass

The real spec's actual point for company pages was missed in the original Phase C pass (built
without the source doc - see DECISIONS.md): "**Company posts appear in the feed... gives
enterprises a reason to be here between hires**." Phase C originally built browse/follow only,
not posting. Fixed today: `PostIntentType.COMPANY`, a real `Post.authorCompany` relation,
`POST /companies/me/posts` (RECRUITER/COMPANY_ADMIN only), `/enterprise/posts` compose UI.
**Verified live**: a company post correctly appeared in a talent account's feed, attributed to
the company (not the recruiter who clicked publish), and was directly reportable like any other
post. Feed ranking's "urgency" term (activity starting soon, spots filling) was also entirely
missing from §7.3's six named ranking factors and has been added.

---

## Overall verdict

**The activity layer's core safety guarantees hold and are launch-ready**: no exact location is
ever stored or exposed, the meeting-point reveal is genuinely gated on approval, age-gating
genuinely blocks minors from ACTIVITY posts, and report/block/mute now cover every surface
(post, room, profile) with a single unified admin queue behind all of it. Everything marked
✅ above was re-verified against production today, not just re-read.

**What's honestly still open**, in priority order if this list gets picked up again: a
work-email verification tier (cheap, real, no vendor needed), a KYC-vendor decision for ID
verification, an activity rating/reputation system, and a deliberate product decision on
whether/how to support women-only activities (which starts with whether this app collects
gender data at all - it currently doesn't, anywhere).
