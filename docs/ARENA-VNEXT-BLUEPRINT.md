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

Those bodies are locked by `JennyArenaWriteBodyContractTest` on the backend branch `feature/arena-jenny-contract`. Do not rename them.

## Pulse and a quiet network

Pulse is the number of items in the feed response, labeled as that. Zero items: “Arena is quiet right now.” No online counter. No seeded activity presented as live.

## Jenny on each surface

Feed: one concrete thing in this feed, or nothing. Discover: one real person or piece of work, or nothing. Map: one nearby activity, or nothing. Work: one real next step in the person’s own applications, or nothing. Create: a draft the person confirms, never a silent publish. Profile: nothing unless a real outcome is worth naming.

## v1 cut

In: the six screens, honest empty states, create for a need and an activity, work from real applications, Jenny slots through the existing agent API.

Out: sessions beyond what an activity post already does, payments, a new agent platform, Vikisol One, a forced 2FA change. Company-admin 2FA is optional today. That is logged in `docs/SECURITY-FINDINGS.md`. Auth is unchanged.
