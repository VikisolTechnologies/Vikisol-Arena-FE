# Decisions

Choices made without the founder in the room. Newest first.

## 26 Sep 2026 — A service token missing its scope returns 403

Recorded on backend `main` at `ab6dcc6`. Jenny's five write bodies are unchanged. A verified service token that lacks the scope for a mapped write now gets 403, and the filter stops. A token for a company admin, even with `arena.createPost`, is also 403 on `POST /posts` because that endpoint is talent-only. Reads stay on the normal rules so Jenny's GET tools keep working.

## 26 Sep 2026 — Company-admin 2FA was never required

`AuthService` asks for a code only when the role is `COMPANY_ADMIN` or `PLATFORM_ADMIN` and `totpEnabled` is already true. The column defaults to false. The demo company admin is seeded that way. Setup and verify endpoints exist. Enrollment was not turned on, because that would lock current admins out of the session the tests use.

Recommendation: stop at the setup step, and do not issue a normal session, until those two roles finish enrollment. Do that in its own change, with the demo accounts enrolled first.

## 26 Sep 2026 — VNext choices already built on `feature/arena-vnext`

- Navigation is Feed, Discover, Map, Work, and You, plus a Create sheet. Discuss and Inbox stay reachable from the records they already open. They are not a fifth and sixth tab.
- Sessions stay ACTIVITY posts. Waitlist, maybe, recurrence, cost, and co-host stay behind the `sessions-extended` flag and are not shown.
- Pulse is the count of items in the feed response. Zero says "Arena is quiet right now."
- A project needs a minimum, a maximum, and a duration in weeks, typed by the person. The sheet does not invent a budget.
- The public landing keeps the dark brand. The nav says People, Projects, and Companies. The people section shows the real open-to-work count, or a sentence with no number when that count is missing.
- The preview stays behind Vercel SSO. It is not production.
