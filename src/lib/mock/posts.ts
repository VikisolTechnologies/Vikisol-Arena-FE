import type { Post, PostJoinRequest } from "@/lib/types";
import { CURRENT_CANDIDATE_ID, getCandidateById, MOCK_CANDIDATES } from "@/lib/mock/candidates";

/**
 * The preview world (mock mode only): what a neighbour in Gachibowli would see on a normal week.
 * Real places as geography, fictional people, photos credited in public/fixtures/CREDITS.md.
 * Every item is labelled "Preview data" on screen (isDemo is true for all of mock mode).
 */

function authorFor(candidateId: string) {
  const c = getCandidateById(candidateId);
  return { authorUserId: candidateId, authorName: c?.name ?? "Someone", authorEmoji: c?.avatarEmoji ?? "🧑🏽" };
}

/** An ISO time `days` from today at hh:mm India time (so "Today · 6:30 AM" stays true). */
function ist(days: number, hh: number, mm = 0) {
  const now = new Date(Date.now() + 5.5 * 3600_000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days, hh, mm) - 5.5 * 3600_000).toISOString();
}
const ago = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();
const photo = (name: string) => `/fixtures/photos/${name}.webp`;

// Places (approximate public points; ~km from central Gachibowli in comments).
const PLACES = {
  stadium: { locationText: "Gachibowli Stadium", approxLat: 17.4468, approxLng: 78.3486 }, // 0.7
  malkam: { locationText: "Malkam Cheruvu", approxLat: 17.4318, approxLng: 78.3372 }, // 1.5
  gachibowli: { locationText: "Gachibowli", approxLat: 17.4412, approxLng: 78.3522 }, // 0.4
  gopanpally: { locationText: "Gopanpally", approxLat: 17.4495, approxLng: 78.3215 }, // 3.1
  kondapur: { locationText: "Kondapur", approxLat: 17.4635, approxLng: 78.3571 }, // 2.7
  nanakramguda: { locationText: "Nanakramguda", approxLat: 17.4166, approxLng: 78.3413 }, // 2.7
  durgam: { locationText: "Durgam Cheruvu", approxLat: 17.4309, approxLng: 78.3876 }, // 4.3
  banjara: { locationText: "Banjara Hills", approxLat: 17.4156, approxLng: 78.4347 }, // 9.5 — outside Nearby
  bandra: { locationText: "Bandra, Mumbai", approxLat: 19.0596, approxLng: 72.8295 }, // other city
};

const base = {
  audience: "global" as const,
  status: "open" as const,
  joinable: true,
  commentCount: 0,
  reactionCount: 0,
  myReacted: false,
  authorJoinCount: 6,
  authorAccountAgeDays: 210,
  demoContent: false,
};
const who = (i: number) => authorFor(MOCK_CANDIDATES[i].id);

export const MOCK_POSTS: Post[] = [
  {
    ...base, id: "post-run", ...who(1), intentType: "activity",
    title: "Sunrise Run at Durgam Lake", body: "A friendly 5K to kickstart the weekend. All levels welcome.",
    ...PLACES.durgam, visibility: "public", capacity: 25, spotsFilled: 15, startsAt: ist(1, 6, 30), endsAt: ist(1, 7, 30),
    tags: ["running", "fitness"], mediaUrls: [photo("sunrise-run")], createdAt: ago(3), commentCount: 4, reactionCount: 11,
  },
  {
    ...base, id: "post-1", ...authorFor(CURRENT_CANDIDATE_ID), intentType: "activity", mine: true, roomId: "room-1",
    title: "Badminton doubles tonight", body: "Court booked 6–7:30 pm. Need 2 more for doubles — intermediate level.",
    ...PLACES.stadium, visibility: "approval", capacity: 4, spotsFilled: 2, startsAt: ist(0, 18), endsAt: ist(0, 19, 30),
    tags: ["badminton", "sports"], mediaUrls: [photo("badminton")], createdAt: ago(2), commentCount: 2, reactionCount: 4,
  },
  {
    ...base, id: "post-sofa", ...who(5), intentType: "ask", visibility: "approval", myJoinStatus: "approved", roomId: "room-sofa",
    title: "Help move a sofa", body: "Two people for 20 minutes to carry a 3-seater down one floor. Chai and snacks on me.",
    ...PLACES.gopanpally, spotsFilled: 0, startsAt: ist(1, 17), tags: ["moving"], mediaUrls: [photo("sofa")], createdAt: ago(5), commentCount: 3,
  },
  {
    ...base, id: "post-maths", ...who(4), intentType: "ask", visibility: "approval", myJoinStatus: "approved",
    title: "Math mentor for Class 10", body: "Looking for someone to help my nephew with algebra, two evenings this week.",
    ...PLACES.gachibowli, spotsFilled: 0, startsAt: ist(3, 18), tags: ["tutoring", "learning"], mediaUrls: [], createdAt: ago(8), commentCount: 2,
  },
  {
    ...base, id: "post-meals", ...who(8), intentType: "offer", visibility: "approval",
    title: "Home-cooked meals this weekend", body: "Cooking a big South Indian lunch on Sunday — four plates to share with neighbours.",
    ...PLACES.gachibowli, capacity: 4, spotsFilled: 2, startsAt: ist(2, 13), tags: ["food"], mediaUrls: [photo("meals")], createdAt: ago(6), commentCount: 1, reactionCount: 7,
  },
  {
    ...base, id: "post-pottery", ...who(10), intentType: "activity", visibility: "approval", myJoinStatus: "pending",
    title: "Pottery for beginners", body: "A relaxed two-hour wheel session. Clay and aprons provided; wear old clothes.",
    ...PLACES.kondapur, capacity: 8, spotsFilled: 5, startsAt: ist(2, 11), endsAt: ist(2, 13), tags: ["pottery", "art"], mediaUrls: [photo("pottery")], createdAt: ago(20), commentCount: 3, reactionCount: 6,
  },
  {
    ...base, id: "post-cleanup", ...who(3), intentType: "activity", visibility: "public",
    title: "Lake clean-up at Malkam Cheruvu", body: "Gloves and bags provided. Meet at the east gate; we'll finish by 9.",
    ...PLACES.malkam, capacity: 40, spotsFilled: 18, startsAt: ist(3, 7), endsAt: ist(3, 9), tags: ["volunteering", "environment"], mediaUrls: [photo("cleanup")], createdAt: ago(26), commentCount: 5, reactionCount: 14,
  },
  {
    ...base, id: "post-garden", ...who(11), intentType: "offer", visibility: "approval",
    title: "Help starting a kitchen garden", body: "Retired, happy to spend a morning helping you set up balcony or terrace beds.",
    ...PLACES.nanakramguda, capacity: 3, spotsFilled: 1, tags: ["gardening"], mediaUrls: [photo("garden")], createdAt: ago(30), reactionCount: 5,
  },
  {
    ...base, id: "post-cricket", ...who(7), intentType: "activity", visibility: "public",
    title: "Sunday tennis-ball cricket", body: "Friendly game at the open ground. Two teams of eight; bring water.",
    ...PLACES.nanakramguda, capacity: 16, spotsFilled: 9, startsAt: ist(4, 7), tags: ["cricket", "sports"], mediaUrls: [photo("cricket")], createdAt: ago(40), commentCount: 2,
  },
  {
    ...base, id: "post-ladder", ...who(12), intentType: "ask", visibility: "approval",
    title: "Borrow a ladder for Saturday", body: "Need a 6-ft ladder for an hour to fix a light. Will return the same day.",
    ...PLACES.kondapur, spotsFilled: 0, startsAt: ist(2, 10), tags: ["borrow"], mediaUrls: [], createdAt: ago(12), commentCount: 1,
  },
  {
    ...base, id: "post-me-ask", ...authorFor(CURRENT_CANDIDATE_ID), intentType: "ask", visibility: "approval", mine: true,
    title: "Recommend a good cycle repair shop?", body: "My gears slip on climbs. Anyone near Gachibowli you'd trust?",
    ...PLACES.gachibowli, spotsFilled: 0, tags: ["cycling"], mediaUrls: [], createdAt: ago(28), commentCount: 3,
  },
  // Things Priya (the preview person) joined or finished — Work and Profile outcomes.
  {
    ...base, id: "post-cleanup-joined", ...who(10), intentType: "activity", visibility: "public", myJoinStatus: "approved",
    title: "Tree planting at Botanical Garden", body: "Saplings, tools and water provided. Bring a cap.",
    locationText: "Botanical Garden, Kondapur", approxLat: 17.4585, approxLng: 78.3553, capacity: 30, spotsFilled: 21, startsAt: ist(5, 7), endsAt: ist(5, 9),
    tags: ["environment", "volunteering"], mediaUrls: [photo("garden")], createdAt: ago(60), commentCount: 6, reactionCount: 12,
  },
  {
    ...base, id: "post-past-run", ...who(1), intentType: "activity", visibility: "public", myJoinStatus: "approved", status: "closed",
    title: "Saturday 5K, Durgam Lake", body: "Thanks for running with us!",
    ...PLACES.durgam, capacity: 25, spotsFilled: 19, startsAt: ist(-5, 6, 30), endsAt: ist(-5, 7, 30),
    tags: ["running"], mediaUrls: [photo("sunrise-run")], createdAt: ago(200), commentCount: 8, reactionCount: 24,
  },
  {
    ...base, id: "post-me-done", ...authorFor(CURRENT_CANDIDATE_ID), intentType: "ask", visibility: "approval", mine: true, status: "closed",
    title: "Help assembling a bookshelf", body: "Arjun sorted it in 30 minutes. Thank you!",
    ...PLACES.gachibowli, spotsFilled: 1, startsAt: ist(-3, 18), tags: ["diy"], mediaUrls: [], createdAt: ago(100), commentCount: 2, reactionCount: 5,
  },
  // Outside the Nearby radius — they appear under "All" only.
  {
    ...base, id: "post-banjara", ...who(9), intentType: "activity", visibility: "public",
    title: "Evening book club", body: "This month: short stories. Cafe table booked for six.",
    ...PLACES.banjara, capacity: 6, spotsFilled: 3, startsAt: ist(5, 19), tags: ["books"], mediaUrls: [], createdAt: ago(14),
  },
  {
    ...base, id: "post-mumbai", ...who(6), intentType: "activity", visibility: "public",
    title: "Carter Road morning walk", body: "Easy 4 km walk along the promenade, chai after.",
    ...PLACES.bandra, capacity: 12, spotsFilled: 4, startsAt: ist(2, 6, 30), tags: ["walking"], mediaUrls: [], createdAt: ago(9),
  },
  {
    ...base, id: "post-update", ...who(2), intentType: "update", visibility: "public", joinable: false,
    body: "Thank you to everyone who came to last week's clean-up — 42 bags collected!",
    spotsFilled: 0, tags: [], mediaUrls: [], createdAt: ago(48), commentCount: 5, reactionCount: 21,
  },
];

export const MOCK_POST_JOIN_REQUESTS: PostJoinRequest[] = [
  {
    id: "join-1", postId: "post-1", userId: MOCK_CANDIDATES[5].id, userName: MOCK_CANDIDATES[5].name, userEmoji: MOCK_CANDIDATES[5].avatarEmoji,
    status: "approved", createdAt: ago(1.5),
  },
  {
    id: "join-3", postId: "post-1", userId: MOCK_CANDIDATES[2].id, userName: MOCK_CANDIDATES[2].name, userEmoji: MOCK_CANDIDATES[2].avatarEmoji,
    status: "pending", createdAt: ago(0.8),
  },
  {
    id: "join-2", postId: "post-pottery", userId: CURRENT_CANDIDATE_ID, userName: getCandidateById(CURRENT_CANDIDATE_ID)?.name ?? "You",
    userEmoji: getCandidateById(CURRENT_CANDIDATE_ID)?.avatarEmoji ?? "🧑🏽", status: "pending", createdAt: ago(19),
  },
  {
    id: "join-5", postId: "post-me-done", userId: MOCK_CANDIDATES[3].id, userName: MOCK_CANDIDATES[3].name, userEmoji: MOCK_CANDIDATES[3].avatarEmoji,
    status: "approved", outcome: "attended", createdAt: ago(98),
  },
  {
    id: "join-4", postId: "post-sofa", userId: MOCK_CANDIDATES[7].id, userName: MOCK_CANDIDATES[7].name, userEmoji: MOCK_CANDIDATES[7].avatarEmoji,
    status: "pending", createdAt: ago(3),
  },
];

/** Preview mode: a room's post photo (rooms don't carry media in the API). */
export function previewMediaForPost(postId: string) {
  return MOCK_POSTS.find((p) => p.id === postId)?.mediaUrls[0];
}
