# Frontend → backend gaps

What B+ screens need that Arena BE doesn't provide yet. Until a row is built, the screen keeps
the answer on the device (or uses labelled preview fixtures) and says so. This file is the
backend plan (FE-BPLUS-BUILD §6). One row per gap; newest phase last.

| # | Screen (phase) | What's needed | Fields | Today |
|---|---|---|---|---|
| 1 | Onboarding — Why are you here? (P1) | Store the person's reasons for joining | `PUT /profile/me/intents` `{ intents: ("activities"\|"meet"\|"ask"\|"offer"\|"job"\|"hire"\|"projects"\|"explore")[] }` | Local draft only; Feed reads it on this device |
| 2 | Onboarding — Local life / Identity (P1) | Personal interests (distinct from skills) | `PUT /profile/me/interests` `{ interests: string[] }` (≤30 chars each) | Local draft only |
| 3 | Onboarding — Your identity (P1) | Profile photo upload | `POST /profile/me/photo` multipart → `{ photoUrl }`; `DELETE` to remove | Downscaled 256px copy on device only |
| 4 | Onboarding — Your identity (P1) | Partial profile update: display name, title, intro without also requiring industry/experience/rate (today `PUT /profile/me/details` requires all of them) | `PATCH /profile/me` `{ name?, title?, bio? (≤160) }` | Local draft only |
| 5 | Onboarding — Your identity (P1) | Availability | `PATCH /profile/me` `{ availability: ("weekdays"\|"weekends"\|"evenings")[] }` | Local draft only |
| 6 | Sign up / Sign in (P1) | Google sign-in on the preview: backend support exists (`POST /auth/google`); the frontend needs `NEXT_PUBLIC_GOOGLE_CLIENT_ID` set in the preview environment | config, not an endpoint | Button and "or" divider hidden until set |
| 7 | Approved & ready (P3) | Remind me before an activity (push/email) | `POST /posts/{id}/reminder` `{ minutesBefore: 60 }`; `DELETE` to cancel | Not shown; "Add to calendar" (.ics) covers it on-device |
| 8 | Discover & filter (P3) | Price on activities, for the "Free" chip | `Post.priceInr?: number` (0 = free) on create + responses | "Free" chip not shown |
| 9 | Activity room (P3) | Photos in room messages | `POST /rooms/{id}/attachments` multipart → `{ url }`; `RoomMessage.mediaUrls?` | Text only; no image button |
| 10 | Activity details (P3) | Host verification badge ("Verified neighbour") | `Post.authorVerificationLevel` | Shows "Joined N activities on Arena" only |
| 11 | Mark as completed (P4) | Both people confirm an outcome | `POST /posts/{id}/outcome/confirm` → `{ confirmedBy: userId[] }`; `Post.outcomeConfirmations` | Owner closes (`PUT /posts/{id}/status`); sheet states who confirmed |
| 12 | Need page (P4) | A short message with an offer of help | `POST /posts/{id}/joins` `{ message?: string (≤280) }`; `PostJoinRequest.message` | "Offered to help · time" |
| 13 | Offer details (P4) | Offerer's shared interests and recent outcomes | `GET /profile/{id}` + `interests[]`, `recentOutcomes[{postId,title,closedAt}]` | Skills and bio only |
| 14 | Need page / room (P4) | Edit or pause a need; edit pinned details | `PATCH /posts/{id}` `{ title?, body?, startsAt?, endsAt?, exactMeetingPoint? }`; `status: "paused"` | Share / Close only; pinned details read-only |
| 15 | Report a problem (P5) | Evidence with a report | `POST …/report` multipart or `{ reason, evidenceUrls?: string[] }` | Reason + optional text only |
| 16 | Notifications (P5) | Category and actions per notification | `AppNotification.category: "activity"\|"need"\|"job"\|"message"\|"safety"`; `POST /notifications/{id}/snooze`, `/dismiss` | Filters derived from type/link; View + Mark read only |
| 17 | Search (P5) | People and skills search; distance filter | `GET /search?type=people\|skills&near=lat,lng&radiusKm=5` | Activities / needs / jobs / projects; no radius |
| 18 | Settings (P5) | Profile visibility and notification preferences | `PUT /profile/me/visibility` `{ profile: "nearby"\|"everyone"\|"hidden" }`; `GET/PUT /notifications/preferences` | Rows not shown |
| 19 | Career setup (P6) | Career fields with per-field visibility | `PUT /profile/me/career` `{ currentCompany, status: "employed"\|"notice"\|"between"\|"student"\|"freelancer", noticePeriod, lastWorkingDay, experienceMonths, roleFamily, skills: [{name, proficiency, years}], sapModules[], certifications[], currentCtc{fixed,variable}, expectedCtc{min,max}, negotiable, desiredRoles[≤3], workModes[], relocate, shift, companySizes[], links[], education{degree,institution,year}, languages[] }` + `visibility` per field: `"only_me"\|"employers_i_apply"\|"public"` | Kept on device; only title/experience/skills/locations/resume/consent saved |
| 20 | Apply (P6) | Screening questions, cover note, CTC sharing on apply | `GET /jobs/{id}/questions` → `[{id,type:"text"\|"yesno"\|"number"\|"choice",label,options?}]`; `POST /applications` `{ jobId, answers:[{questionId,value}], coverNote?, includeCtc: boolean }` | Consent + shared-fields checklist only |
| 21 | Tracker (P6) | Hired stage; offer accept/decline; interview slot pick | `ApplicationStage` + `"hired"`; `POST /applications/{id}/offer/accept\|decline`; slots via existing interviews API | 4 stages + Not selected |
| 22 | Jobs (P6) | Save a job; must-haves vs nice-to-haves; verified company flag | `POST/DELETE /jobs/{id}/save`; `Job.mustHaves[]`, `Job.niceToHaves[]`, `Job.companyVerified` | No save; one skills list |
| 23 | Host an activity (P6b) | Structured activity details, host questions, waitlist, repeat, min size, link-only | `Post.activity: { category, subtype, level, cost: {type:"free"\|"shared", perPersonInr?, note?}, typeAnswers: {…}, bring[], accessibility, indoor, minSize, waitlist, repeat: "once"\|"weekly", womenOnly, hostQuestions: string[≤3], reach: "nearby"\|"link" }`; join `POST /posts/{id}/joins` `{ answers: string[], note? }`; `PostJoinRequest.answers`, `.waitlistPosition`; decide `{ note? }` | Public answers in post text; the rest not sent |
| 24 | Cover by Jenny (P6b, PROPOSED) | AI cover image | `POST /api/agent/gateway/v2/cover-image` `{ kind, category, subtype, answers, placeType, timeOfDay, seed }` → `{ imageUrl, blurhash, aiGenerated: true }`; limits 3/activity, 10/person/day; pHash de-dupe; safe-content check | Flag off; procedural card stored via media upload |
| 25 | Activity after-care (P6b) | Joiner attendance confirm/dispute (72 h), private feedback, reminders | `POST /posts/{id}/attendance/confirm` `{ attended: boolean, dispute?: string }`; `POST /posts/{id}/feedback` `{ joinAgain: boolean, note? }` (private); reminders see #7 | Host check-in only |
| 26 | Projects (P6c) | Collaborative projects: roles, applications with a note, team room with milestones, completion with contributors | `POST /projects` `{ title, goal, category, where: "local"\|"remote"\|"both", weeks, coverUrl, roles: [{title, count, skills[], hoursPerWeek}] }`; `POST /projects/{id}/applications` `{ roleId, note }`; accept/decline; `GET/POST /projects/{id}/milestones` `{ title, done }`; `POST /projects/{id}/complete` `{ outcome, contributorIds[] }` | Paid projects via marketplace; collaborative = device draft |
| 27 | Needs & offers (P6c) | Show-within radius; structured need/offer answers; offer availability & limits | `Post.radiusKm`; `Post.needDetails: { category, urgency, helpType, answers{} }`; `Post.offer: { days[], limit, proofUrl }` | Answers in post text; no radius |

Saved for real today (no gap): sign up, sign in, 2FA code, forgot/reset password, area
(`PUT /profile/me/location` with `consent: "city"`) and current location (`consent: "precise"`,
stored coarsened by the backend).
