I understand Arena end to end. The approved product has three connected experiences:

- **Arena:** neighbours, activities, needs, offers, projects and careers.
- **Arena for Business:** companies, recruiters and hiring managers.
- **Arena Admin:** Vikisol operations, verification, moderation and AI oversight.
- **Jenny:** the assistant across all three. The user speaks, Jenny prepares, the user reviews, and the user approves.

Current branch status: **86 screens built, 109 Playwright checks passing**. The largest unfinished areas are **P8 Jenny**, **P10 Admin**, project collaboration, activity aftercare, and several backend-dependent actions.

Use three test accounts where required: a normal person, a recruiter/company admin and a platform admin. Some journeys also need a second normal-person account.

# Arena Founder Manual Test Script

## Journey 1 — Sign up and complete personalised onboarding

**Purpose:** Confirm that a new person enters Arena without receiving a fake profession, location or interest.

1. Open Arena on a phone while signed out.
   - The Welcome screen should use the approved B+ design.
   - The page should show **Join Arena**, **Sign in** and **Continue as guest**.
   - There should be no horizontal scrolling or clipped content.

2. Tap **Continue as guest**.
   - Feed and Discover should open in read-only mode.
   - Only approximate areas should appear.
   - Exact addresses and private meeting points must remain hidden.

3. Open an activity and tap **Request to join**.
   - Arena should ask the guest to sign in.
   - The activity and attempted action should be remembered.

4. Choose **Create account**.
   - Enter a name, email and password of at least eight characters.
   - Accept the Terms and Privacy Policy.
   - Validation should explain missing or invalid information beside the relevant field.

5. Submit the account.
   - If email verification is available, Arena should show a clear “Check your email” state.
   - If it is unavailable, the application must explain that honestly instead of pretending verification succeeded.

6. Complete **Why are you here?**
   - Select more than one intent, for example:
     - Find activities
     - Meet useful people
     - Find work
   - Multiple selections should remain selected.
   - Selecting work must not automatically publish a career profile.

7. Complete **Set up your local life**.
   - Select an approximate area and several interests.
   - Location text should explain how it will be used.
   - Precise location must not be publicly displayed.

8. Complete **Your identity**.
   - Enter a display name, optional title, short introduction and availability.
   - Photo upload should remain optional.
   - Nothing should default to “Frontend Engineer from Bengaluru” or any other invented identity.

9. Review **You’re all set**.
   - Recommended actions should reflect the selected intentions.
   - A person who chose work should see career setup as an option.
   - A person who chose activities should see Discover or Join an activity.

10. Enter Arena.
    - The saved name, area, interests and availability should appear correctly.
    - Returning later should not restart completed onboarding.
    - The original activity action should resume where supported.

**Pass when:** The profile reflects only information the person supplied, chosen intentions influence next steps, and private information stays private.

**Current limitation:** Some onboarding fields are stored only on the device because backend gaps 1–5 remain open.

---

## Journey 2 — Discover, join and attend an activity

**Purpose:** Test the complete participant journey from discovery to a recorded outcome.

1. Open **Discover**.
   - Activity, people, needs and project filters should be understandable.
   - Time and category filters should change the visible results.
   - Map mode should use approximate locations and display the privacy message.

2. Search for an activity such as badminton, running or cricket.
   - Results should match the selected activity and area.
   - The app must not invent a distance when coordinates are unavailable.
   - No fake match percentage should appear.

3. Open an activity.
   - Verify title, description, date, time, approximate area, level, capacity, cost and host information.
   - The exact meeting point must remain hidden before approval.

4. Tap **Request to join**.
   - If the host added questions, the participant should answer them.
   - An optional note should be allowed.
   - The action must not instantly claim approval.

5. Submit the request.
   - A request-sent screen should show:
     - Request sent
     - Host will review
     - What happens after approval
   - The participant should be able to cancel the request.

6. As the host, approve the request.
   - The participant should receive an approval state or notification.
   - The exact meeting point should now be visible.
   - The participant should gain access to the private activity room.

7. Open the activity room.
   - Chat, Details and People should work.
   - The approved meeting point should be pinned.
   - Unapproved people must not be able to access the room.

8. Add the activity to the phone calendar.
   - The correct title, date, time and approved meeting location should be used.
   - The application should not claim a server reminder was created if only a calendar file was generated.

9. Before the activity, test **Leave activity**.
   - Arena should explain that leaving releases the spot.
   - If confirmed, the person should disappear from the approved participant list.

10. Repeat without leaving and complete the activity.
    - The host should check in attendees.
    - The participant should later confirm or dispute attendance.
    - Private feedback should ask “Would you join again?” without public star ratings.
    - A completed outcome should appear on the relevant profiles.

**Pass when:** Private location access follows approval, room membership is controlled and the completion outcome is truthful.

**Current limitation:** Participant attendance confirmation, disputes and private feedback require backend gap 25. Waitlist data requires gap 23.

---

## Journey 3 — Host a cricket activity with a Jenny cover

**Purpose:** Verify the detailed host intake, safe location handling and cover-generation fallback.

1. Tap the centre **+** button.
   - The Create sheet should show Need, Offer, Activity, Project, Job and Ask Jenny.

2. Choose **Create an Activity**.
   - Search for or select Sports → Cricket.
   - A natural-language Jenny option should eventually accept something like:
     “Tennis-ball cricket this Sunday at 7 AM in Gachibowli for 12 players.”

3. Complete cricket details.
   - Enter title and description.
   - Select skill level, minimum and maximum group size and waitlist preference.
   - Choose Free or shared cost.
   - Confirm all participants are 18+.

4. Complete cricket-specific questions.
   - Select Box, Tennis-ball, Leather-ball or Nets.
   - Enter overs and players per side.
   - Select available equipment.
   - Enter ground-booking information if applicable.

5. Complete time and location.
   - Choose the date, start and end times.
   - Set the public approximate area.
   - Add the exact meeting point separately.
   - Confirm that the UI says the exact point is revealed only after approval.

6. Configure joining.
   - Choose open joining or approval required.
   - Add up to three host questions.
   - Select Nearby or Link-only visibility.

7. Open the cover step.
   - Arena should display a unique procedural cricket cover when AI generation is unavailable.
   - The cover should vary when a different activity or variation is created.
   - It should never contain a fake identifiable person, brand or address.

8. If Jenny image generation is enabled:
   - The page should say “Jenny is painting your cover.”
   - A successful image should be labelled **AI-generated**.
   - **Try another** should allow no more than three attempts.
   - Failure should fall back honestly to the procedural cover.

9. Review the complete activity.
   - Information should be grouped clearly.
   - Jenny-filled information should be visibly marked until the host edits it.
   - Nothing should publish automatically.

10. Tap **Publish**.
    - A confirmation should appear with sharing options.
    - The activity should appear in Feed, Discover and the host’s Work area.

11. Test host management.
    - Review a join request and its answers.
    - Approve or decline with an optional note.
    - Test the Starting soon, check-in and cancellation screens.
    - Cancelling must require a reason.

**Pass when:** Cricket receives the right questions, private and public locations stay separate, the cover is unique, and publishing requires the host’s final tap.

**Current limitation:** Real Jenny image generation is behind `NEXT_PUBLIC_JENNY_COVERS` and backend gap 24. The procedural cover is the expected safe fallback.

---

## Journey 4 — Post a need, accept help and complete the outcome

**Purpose:** Confirm that a local request becomes a private coordination flow and completed outcome.

1. Tap **+ → Post a Need**.
   - Select a category such as Moving & heavy lifting.

2. Complete the category questions.
   - Enter the items, floors, lift availability, distance, helpers required and vehicle requirement.
   - Every question should explain why Arena needs it.

3. Set urgency and help terms.
   - Choose Today, This week or Flexible.
   - Choose Free, Skill exchange or I’ll cover costs.
   - No in-app payment should be implied.

4. Set the approximate area and visibility radius.
   - The public post should not reveal a home address.
   - Photos should be optional.

5. Preview and publish.
   - Required missing information should be identified.
   - The draft should survive back navigation.
   - Publishing should require an explicit tap.

6. Using a second person account, open the need and offer help.
   - The helper should see the need details and approximate area.
   - A short message should be available when the backend supports it.

7. Return to the owner account.
   - Open the list of offers.
   - Review the helper’s visible profile and offer information.
   - Private or unrelated profile fields must not appear.

8. Accept one helper.
   - A private coordination room should open.
   - The accepted person should gain room access.
   - Other people who offered help should not enter that room.

9. Use the room.
   - Confirm pinned plan details.
   - Exchange messages and a meeting link.
   - Report and safety controls should remain available.

10. Mark the need as completed.
    - Arena should ask whether the need was resolved.
    - The other person’s confirmation state should be shown honestly.
    - Optional outcome photos or a private note may be added where supported.

11. Check both profiles and Work.
    - The completed need should leave Active and appear under Completed.
    - A truthful outcome should appear on both profiles only after the required confirmation.

**Pass when:** Public details remain approximate, one helper is deliberately selected, coordination is private and completion is recorded accurately.

**Current limitation:** Two-sided outcome confirmation needs backend gap 11. Offer messages, editing and pausing need gaps 12, 14 and 39.

---

## Journey 5 — Offer a skill and help someone

**Purpose:** Test the reverse journey where a person offers help before receiving a request.

1. Tap **+ → Make an Offer**.
   - Choose a category such as Tech help, tutoring or bicycle repair.

2. Describe the offer.
   - State exactly what the person can help with.
   - Select available days and times.
   - Set the approximate radius.

3. Choose the terms.
   - Select Free or Skill exchange.
   - Set a reasonable limit, such as two requests per week.
   - Add an optional portfolio or proof link.

4. Review and publish.
   - Public fields and private fields should be distinguished.
   - The offer should not expose an exact address.
   - Publishing should require confirmation.

5. Using a second account, open the offer and request help.
   - The requester should explain the need.
   - The offer owner should receive the request.

6. Open **Work → My offers**.
   - The offer should show incoming requests.
   - The owner should be able to inspect the requester’s permitted information.

7. Accept one request.
   - A private coordination room should open for those two people.
   - Declined or pending requesters should not receive room access.

8. Coordinate and complete.
   - Agree on time and place.
   - Mark the outcome complete.
   - Confirm that the offer’s weekly limit and completed count are presented honestly.

**Pass when:** An offer produces relevant requests, acceptance controls private coordination and the outcome belongs to both participants.

**Current limitation:** Structured offer availability, limits and radius depend on backend gap 27 and may currently be held on the device or encoded in post text.

---

## Journey 6 — Start a collaborative project and form a team

**Purpose:** Test a larger collaboration requiring roles and ongoing work.

1. Tap **+ → Start a Project**.
   - Choose collaborative rather than paid marketplace work.

2. Enter project details.
   - Add title, goal, category, local/remote/both and expected duration.
   - Select or generate a cover.

3. Add roles.
   - Add at least two roles, such as:
     - One designer
     - Two developers
   - Add skills and expected weekly time for each role.

4. Review and publish.
   - The complete project and roles should be visible.
   - Publishing should require an explicit confirmation.

5. Using another account, open the project.
   - Select a role.
   - Apply with a short note.

6. As the owner, review applicants.
   - Accept or decline each applicant.
   - Accepted people should join the project team.

7. Open the team room.
   - Plan should show milestones.
   - Chat should support coordination.
   - Files should support safe links or attachments where available.

8. Complete a milestone.
   - Everyone should see the updated milestone state.

9. Complete the project.
   - Select contributors.
   - Add an outcome.
   - The completed project should appear on contributor profiles.

**Pass when:** Roles drive applications, accepted people gain team access and completion credits the correct contributors.

**Current limitation:** Only the first project-creation stages are built. Applications, milestones, team rooms and contributor completion are blocked by backend gap 26. An honest unavailable state is currently acceptable.

---

## Journey 7 — Use Jenny to prepare and approve work

**Purpose:** Verify that Arena feels AI-driven while the person stays in control.

1. Open Jenny from Feed, the header or **+ → Ask Jenny**.
   - Jenny’s availability must reflect the real gateway.
   - If unavailable, show Offline and keep the rest of Arena usable.

2. Ask:
   “Create a beginner cricket activity this Sunday morning in Gachibowli for 12 players.”

3. Review Jenny’s interpretation.
   - Jenny should identify activity type, time, area, level and capacity.
   - Missing information should be requested plainly.
   - Jenny must not publish anything.

4. Continue into the activity intake.
   - Parsed fields should already be filled.
   - Each should show **Jenny filled — check**.
   - Editing a field should remove or settle that marker.

5. Ask Jenny to find a suitable existing activity.
   - Discover should convert the sentence into visible, editable filters.
   - Results should explain why they are shown.
   - No invented match percentage should appear.

6. Ask Jenny to draft a message or post.
   - A preview should show the exact text and intended audience.
   - The screen should explain what data was used.

7. Tap **Approve** only after checking.
   - The approved action should happen once.
   - Closing or declining should send or publish nothing.

8. Open Work.
   - Verify separate sections for:
     - Needs your approval
     - Jenny can handle
     - Waiting on others

9. Review Jenny’s Today and History views.
   - Today should show real scheduled items.
   - History should record what Jenny prepared and what the person approved.
   - Failed actions must appear as failed, not completed.

10. Inspect permissions.
    - There must be no uncontrolled auto-apply, auto-send or auto-publish setting.
    - Jenny may research and prepare, but final external actions require approval.

**Pass when:** Jenny reduces typing, explains its reasoning and never represents the person without consent.

**Current status:** P8 Jenny boards and pre-fill are among the 23 screens still not started on this branch. This journey currently identifies expected gaps rather than demanding a full pass.

---

## Journey 8 — Job seeker setup, application, interview and offer

**Purpose:** Test the opt-in career experience without exposing private career data.

1. Open **You → Career profile**.
   - Social and career profiles should remain visibly separate.
   - Choose Find a job or Explore quietly.

2. Complete career basics.
   - Add title, experience, optional company, employment status and notice period.
   - Current company should be hidden by default.

3. Add skills and stack.
   - Choose a role family.
   - Add skills with proficiency and years.
   - Technical roles should support languages, frameworks, cloud and tools.

4. Add compensation.
   - Add current and expected CTC.
   - Verify current CTC is **Only me** by default.
   - It must not appear on the public social profile.

5. Add preferences.
   - Select desired roles, work mode, preferred locations, relocation and shift preferences.

6. Upload a resume.
   - Arena should accept the supported document formats.
   - Jenny may suggest extracted skills and roles.
   - Every extracted value should require field-by-field confirmation.

7. Review visibility and publish.
   - The preview should show exactly what employers can see.
   - Explore quietly should preserve reduced visibility.
   - Publishing must be explicit.

8. Open Jobs and select a role.
   - Check title, company, location, work mode, compensation, requirements and evidence.
   - There should be no age, gender, religion, caste or marital-status filtering.

9. Tap **Apply**.
   - Review the exact shared-data checklist.
   - Answer screening questions.
   - Choose a resume.
   - Review or edit Jenny’s cover-note draft.
   - Decide whether CTC is included.

10. Submit.
    - The tracker should show Applied and then Under review.
    - The user should be able to withdraw.

11. When invited, choose an interview slot.
    - Add it to the calendar.
    - Only approved meeting information should be shown.

12. Review the offer.
    - Accept or decline deliberately.
    - The tracker should move to Offer and then Hired or Not selected.
    - A profile outcome should be optional.

**Pass when:** Career data is opt-in, application sharing is transparent and every major decision is controlled by the candidate.

**Current limitation:** Career setup is built, but screening questions, CTC sharing, interview slots, offer decisions and Hired require backend gaps 19–22.

---

## Journey 9 — Company setup, post a job and hire or decline

**Purpose:** Test the recruiter/company journey from verification through closing the hiring loop.

1. Sign in with a recruiter or company-admin account.
   - Arena should open the appropriate Business surface.
   - A personal user must not accidentally receive recruiter access.

2. Start company setup.
   - Choose Company admin, Recruiter or Hiring manager.
   - Enter legal name, website, work email, company size, industry and HQ city.
   - GSTIN/CIN and logo should be optional.

3. Verify the work email.
   - A company-domain email should receive a verification code when supported.
   - Until approval, status should say **Verification pending**.
   - Jobs may be drafted but must not be published as verified.

4. Invite team members.
   - Choose appropriate roles.
   - A recruiter must not receive company-owner-only powers.

5. Create a job.
   - Enter title, location, work mode and required pay range.
   - Separate must-haves and nice-to-haves.
   - Add experience, deadline and screening questions.
   - A protected-attributes notice should be visible.

6. Attempt to enter “male candidates only” or an age limit.
   - Arena should reject or flag the requirement.
   - Jenny must refuse to use protected attributes for screening.

7. Review and publish.
   - If the company is not approved, Arena should keep the job as a draft and explain why.
   - After admin verification, publishing should become available.

8. Apply using the job-seeker account.
   - The new application should appear in the recruiter pipeline.

9. Open the candidate profile.
   - Only consented information should appear.
   - Must-have evidence should say Shown, Partial or Not shown.
   - No fabricated overall score or match percentage should appear.

10. Move the candidate through the pipeline.
    - Test New → Reviewing → Interview → Offer.
    - Dragging and the accessible Move menu should produce the same result.
    - Column counts should update.

11. Schedule an interview.
    - Choose interviewers, mode, slots and meeting details.
    - Interviewers should provide feedback per must-have, without one opaque overall score.

12. Test both outcomes.
    - **Hire:** the candidate should move to Hired and receive the correct outcome.
    - **Not selected:** require a kind message and update the tracker.
    - The same candidate must never end in both states.

**Pass when:** Verification gates publication, candidate privacy is respected, evidence drives decisions and every rejection closes the loop respectfully.

**Current limitation:** Business UI is built. Verification, structured job fields, private notes, rejection messages, Hired and evidence require backend gaps 28–33.

---

## Journey 10 — Report, block and protect a conversation

**Purpose:** Verify immediate safety controls and access consequences.

1. Open a person, activity, job or conversation.
   - A Report action should be reachable without searching through settings.

2. Tap **Report**.
   - A report sheet should open.
   - Selecting a reason should be required.
   - Optional explanatory text should be available.

3. Try submitting without a reason.
   - Submission should be blocked with a clear validation message.

4. Select a reason.
   - Review who or what is being reported.
   - Confirm that the report does not expose the reporter to the reported person.

5. Enable **Also block this person**.
   - The consequences should be clear before submission.

6. Submit.
   - A confirmation should appear.
   - The report should not be duplicated by repeated taps.

7. Return to Feed, Discover and Messages.
   - The blocked person’s direct communication should disappear or become unavailable.
   - They should not be able to start a new conversation.
   - Existing safety evidence should remain available to moderators.

8. Open Settings → Blocked accounts.
   - The blocked account should be listed where that account-management screen is implemented.
   - Unblocking should require a deliberate action.

9. Sign in as an admin.
   - The report should appear with context, status and the 24-hour handling expectation.
   - Admin actions should require notes and appear in the audit log.

**Pass when:** Reporting is clear, blocking takes effect immediately and the reported person receives no identifying information about the reporter.

**Current limitation:** Report evidence attachments need backend gap 15. The report-and-block sheet itself is built.

---

## Journey 11 — Privacy, permissions and account controls

**Purpose:** Confirm that a person can understand and change what Arena and Jenny may use.

1. Open **You → Settings and Privacy**.
   - The page should use plain language.
   - Sensitive controls should not be hidden behind vague labels.

2. Open profile visibility.
   - Check Nearby, Everyone and Hidden options where available.
   - Changing visibility should show what other people will see.

3. Inspect location privacy.
   - Public screens should use only an approximate area.
   - Exact activity meeting points should appear only after approval.
   - Home addresses must never be public.

4. Open Career privacy.
   - Confirm social visibility and career visibility are separate.
   - Current company, CTC and notice period should show their audiences.
   - CTC should default to Only me.

5. Open Jenny permissions.
   - The settings should say Jenny prepares and the user approves.
   - There should be no contradictory “Autopilot applies automatically” option.

6. Open notification preferences.
   - Toggle activity, need, job, message and safety notifications where supported.
   - Saved states should remain after closing and reopening Settings.

7. Enable Reduce motion.
   - Sheets, transitions and glowing elements should reduce or stop movement.
   - Navigation must remain understandable.

8. Review blocked accounts.
   - Blocked people should be listed.
   - Unblocking should be possible intentionally.

9. Look for **Download my data**.
   - Arena should explain what will be included.
   - If the function is unavailable, it should say so honestly.

10. Look for **Delete account**.
    - The confirmation screen should explain permanent consequences.
    - This test should stop before final deletion unless using a disposable account.

11. Sign out and back in.
    - Server-saved settings should persist.
    - Device-only settings must be labelled as such.

**Pass when:** Every privacy choice explains its effect, career data remains separately controlled and Jenny has no hidden authority.

**Current limitation:** Server-backed visibility and notification preferences need gap 18. Several account screens are still listed as missing in the flow specification.

---

## Journey 12 — Admin verifies a company and handles platform oversight

**Purpose:** Verify that platform administration is isolated, protected and auditable.

1. Sign in using a platform-admin account.
   - Admin must require 2FA.
   - Admin navigation must not be visible from the public Arena app.

2. Try opening `/admin` before completing 2FA.
   - Access should be denied.
   - No admin data should briefly appear before the denial.

3. Complete 2FA.
   - The Admin overview should open.
   - Metrics with no real data must say **No data yet**, not show invented numbers.

4. Open the company verification queue.
   - A pending company should show work-domain information, website and any submitted GSTIN/CIN.
   - The reviewer should see enough evidence to make a decision.

5. Approve the company.
   - The action should require a deliberate confirmation.
   - The company should become Verified.
   - The Business workspace and public company page should reflect the verified state.
   - The audit log should record who approved it and when.

6. Test rejection with another pending company.
   - A reason should be required.
   - The company should receive a clear rejected state and reason.
   - It must not display a verified badge.

7. Open Moderation.
   - Review a report with the underlying content and context.
   - Test Dismiss, Warn, Remove content or Suspend using a disposable fixture.
   - Destructive actions should require a reason.

8. Open Users.
   - Search for a person.
   - Passwords and secret credentials must never be visible.
   - Suspend, restore, force sign-out and data-request controls should be permission-protected.

9. Open Companies/Tenants.
   - Check company status, plan and seats.
   - Billing should be display-only unless a real payment workflow exists.

10. Open Jenny and AI oversight.
    - Review automation attempts, approvals, failures and generated covers.
    - Provider status must be truthful.
    - Admin should be able to flag or remove an unsafe generated cover.

11. Open Feature flags.
    - Changing a flag should be restricted and audited.
    - Production-only flags should not silently change preview fixtures.

12. Open the admin audit log.
    - Verify each action contains:
      - Actor
      - Action
      - Target
      - Time
      - Reason
    - Ordinary admins must not be able to erase audit history.

**Pass when:** 2FA always protects Admin, verification affects company capabilities, moderation is accountable and every sensitive action is audited.

**Current status:** P10 Admin is still among the 23 not-started screens. Existing admin routes remain, but the complete B+ admin rebuild and verification workflow are not finished.

No code or repository files were changed.