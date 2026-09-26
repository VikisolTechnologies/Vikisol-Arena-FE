# Arena VNext blueprint

26 September 2026. This is the build we put on a private preview. Production keeps the current screens until that preview is approved.

The live brand is near-black `#09090b` and orange `#ff6b35` / `#ff8a5b`. Mockups in `docs/design/vnext.html` use that as the primary option. An ivory, black, and orange version sits beside each screen so the founder can compare. The preview is built in the near-black option.

## The ten questions

1. **What is Arena?** A living network. Need, response, conversation, outcome, identity, then a new need. Jobs and projects stay, as kinds of need, not as the product.

2. **What is the front door?** Feed. It is whatever is actually happening: needs, activities, projects, jobs, updates. If the list is empty, the screen says Arena is quiet. It does not invent people online.

3. **What is Discover?** Who and what exists, across people, activities, jobs, projects, and companies. It is not a job swipe deck.

4. **What is Map?** What is happening around a place: activities first, then other nearby needs. It is not a map of job pins. The map library loads only after the person opens Map.

5. **Where does Jenny live?** In a slot on each surface, not in a chatbot tab. The slot uses Arena’s existing agent API, which already calls the live JennySol gateway (`/api/agent/gateway/chat` and `/actions/:actionId`). Jenny drafts. The person approves. If the gateway is down, or Jenny has nothing concrete, the slot renders nothing.

6. **What is Work?** What this person is actually in: applications, projects, joins, rooms. It is not a list of 45 open roles.

7. **What is Create?** A sheet: I need something, I can offer something, a project, a job, an activity. Not a “Post job” button. A job is one choice among those.

8. **What is Profile?** The identity that real outcomes leave behind: posts, joins, applications. Not a resume form dressed up as a person.

9. **What is a Session?** An activity post that already has a time, a capacity, a join or approval, a room, a leave, and attendance. We do not invent a second object. Waitlist, maybe, recurrence, cost, and co-hosts are not in the API, so that UI stays off. The flag is `sessions-extended` and it is off.

10. **What is v1, and what waits?** V1 is the six surfaces on the current API. Agent Studio, the store, and Vikisol One stay unbuilt. An agent can later be an offer in the network. This build leaves that door as a comment and a route we do not ship.

## Keep, recompose, redesign, new

| | |
|---|---|
| **Keep** | Posts, rooms, joins, jobs, projects, bids, applications, enterprise console, roles, consent, the dark/orange tokens, the agent API and the five write tools. |
| **Recompose** | Home, Discover, Map, Work, Create, and Profile into the hierarchy above. Discover stops being a swipe of jobs. Work stops being a job list. |
| **Redesign** | Spacing, type, and density on those six screens. Three languages on one brand: Living Companion for Jenny, Talent Atlas for Discover and Map, Studio Ledger for Work. |
| **New** | Pulse as an honest count of what this response actually contains. Jenny slots. The code-split shell. Nothing else. |

## Routes

Candidate: Feed `/home`, Discover `/discover`, Map `/map`, Work `/work`, Create as a sheet, Profile `/identity`. Rooms stay `/rooms`. Enterprise routes stay where they are.

The bottom bar on a phone is Feed, Discover, Map, Work, Profile. Create is a button, at least 44px, not a hover.

## Data and API

No new tables in this preview. Feed is `GET /feed`. Nearby is `GET /posts/nearby`. Search is `GET /search`. Applications are `GET /applications`. Create still posts to the existing post, project, and job endpoints.

Jenny’s five writes stay exactly:

- `POST /posts` with `arena.createPost`
- `POST /posts/{id}/joins` with `arena.joinActivity`
- `POST /marketplace/projects` with `arena.createProject`
- `POST /marketplace/projects/{id}/bids` with `arena.placeBid`
- `POST /applications` with `arena.applyToJob`

Those bodies are locked by `JennyArenaWriteBodyContractTest`. A token that lacks the write scope, and a token for a different user, both get 403 from `JennyArenaWriteScopeContractTest`. That branch is on backend `main` at `ab6dcc6`. The write JSON was not changed.

## The mission's ten questions

These sit on top of the ten above. They are the questions in `docs/ARENA-MISSION.md`.

1. **Why open Arena on a day you are not job hunting?** Because something is happening near you, or something you already started is waiting. A game tonight, a neighbour's ask, a project you bid on, a room that still has a message. The front door is that life, not a list of openings.

2. **What is in Feed, and how is it ranked?** The items `GET /feed` already returns: activities, asks, updates, projects, and company posts. The order is `FeedRankingService`, which scores the newest 500 posts and does not use distance. The client does not re-rank. A distance-aware rank is a later backend change, not a number we invent on the page.

3. **How do jobs, projects, needs, offers, people, sessions, and activities sit together?** One card. The kind is a label: Need, Offer, Activity, Project, Job, Update, Company. A job is a need a company posted. A project is a need with bids. A session is an activity that already has a time. People are not posts. They show up in Discover and in the room the post opens.

4. **What does Discover do that Feed does not?** Feed is what is happening now. Discover is the directory you search when you already know who or what you want, including people and companies that are not in today's feed.

5. **What does Map do that Discover does not?** Place. The same kinds of posts, limited to what is around the person. The list is the screen. The map canvas loads only here.

6. **How does Jenny appear without a chatbot tab?** A slot on Feed, Discover, Map, Work, Create, and Profile. One real sentence, then the person confirms. The phone bar does not have an Agent tab. `/agent` stays for the full thread.

7. **What does Create do?** A sheet, not a Post Job button.
   - Need: `POST /posts` with intent ask.
   - Offer: `POST /posts` with intent update.
   - Project: minimum, maximum, and weeks, then `POST /marketplace/projects`. No invented budget.
   - Job: only with a company seat, and it links to the existing enterprise posting flow.
   - Activity: `POST /posts` with intent activity.
   - Ask Jenny: a draft in the slot. Nothing publishes until the person confirms.

8. **What is Work beyond applications?** Joins, bids, interviews, and recorded outcomes, as well as applications. This preview lists applications, because that is the list this screen loads. The other records stay on the routes that already own them. The screen does not pretend an application list is the whole of a person's work.

9. **The first 10 seconds.** Logged out: the landing says this is a network, then the guest feed shows real posts or "Arena is quiet right now." Create asks them to sign in. Logged in: their name, the real pulse count, Jenny only when there is a real note, and Create ready.

10. **What needs no new backend, and what does?** No new backend: the shell, the nav, empty copy, the pulse count, guest states, Jenny through the existing agent API, and project fields the API already accepts. Later: a feed rank that includes distance, a map of needs and people, one Work list that unions applications, bids, joins, and outcomes, session waitlist and recurrence, and forced admin 2FA.

## Today's nav, mapped

| Today | Becomes |
|---|---|
| Home | Feed `/home` |
| Nearby | Map `/map` |
| Discuss | Stays `/discuss`. It is not a phone-bar tab. Needs still open from Feed and Create. |
| Work | Work `/work`, outcomes rather than a job board |
| Inbox | Stays `/rooms`. Reached from the post or the activity, not from a sixth tab. |

## Every current screen

| Screen | Decision |
|---|---|
| `/` landing | Redesign the public copy around the network. Keep the dark brand and the real counts. |
| `/home` | Recompose into Feed. |
| `/discover` | Redesign. It stops being a job swipe. |
| `/map` | Recompose. Activities nearby. No job pins. |
| `/discuss` | Keep. Off the primary bar. |
| `/work` | Redesign into the ledger of what this person is in. |
| `/rooms` | Keep. |
| `/identity` | Recompose into Profile. |
| `/agent` | Keep the thread. The new bar does not add a chatbot tab. |
| Enterprise, admin, applications, marketplace, interviews | Keep. |
| Sessions as a new object | New, and not in v1. Flag `sessions-extended` stays off. |

## Pulse and a quiet network

Pulse is the number of items in the feed response, labeled as that. Zero items: “Arena is quiet right now.” No online counter. No seeded activity presented as live.

## Jenny on each surface

Feed: one concrete thing in this feed, or nothing. Discover: one real person or piece of work, or nothing. Map: one nearby activity, or nothing. Work: one real next step in the person’s own applications, or nothing. Create: a draft the person confirms, never a silent publish. Profile: nothing unless a real outcome is worth naming.

## v1 cut

In: the six screens, honest empty states, create for a need and an activity, work from real applications, Jenny slots through the existing agent API.

Out: sessions beyond what an activity post already does, payments, a new agent platform, Vikisol One, a forced 2FA change. Company-admin 2FA is optional today. That is logged in `docs/SECURITY-FINDINGS.md`. Auth is unchanged.
