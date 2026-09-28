import type { Post, PostJoinRequest, PublicCandidateProfile, RoomMember, RoomMessage } from "@/lib/types";
import type { RoomSpecimen } from "@/components/activity/RoomScreen";
import { timeWindow } from "@/lib/data/needs";

/**
 * Fixed, fictional data for /dev/screen/<id> only (the compare pages). Never imported by a
 * product route; /dev is notFound in production and these render only when fixtures are allowed.
 */
// Fixed times (the board's "Oct 12 · 6:30 AM" IST) so server and client render the same text.
const BASE = Date.parse("2026-10-12T01:00:00Z");
const inHours = (h: number) => new Date(BASE + h * 3600_000).toISOString();

export const SPECIMEN_ACTIVITY: Post = {
  id: "specimen-activity",
  authorUserId: "specimen-host",
  authorName: "Ananya Rao",
  authorEmoji: "a",
  intentType: "activity",
  title: "Sunrise Run at Durgam Lake",
  body: "A friendly 5K run around the lake to kickstart the weekend. All paces welcome!",
  locationText: "Durgam Cheruvu, Madhapur",
  audience: "global",
  visibility: "approval",
  capacity: 20,
  spotsFilled: 4,
  status: "open",
  startsAt: inHours(0),
  endsAt: inHours(1),
  tags: ["Fitness", "Beginner friendly"],
  mediaUrls: [],
  joinable: true,
  createdAt: inHours(-30),
  commentCount: 0,
  reactionCount: 0,
  authorJoinCount: 18,
  authorAccountAgeDays: 240,
  demoContent: false,
};

export const SPECIMEN_PENDING: Post = { ...SPECIMEN_ACTIVITY, myJoinStatus: "pending" };

export const SPECIMEN_APPROVED: Post = {
  ...SPECIMEN_ACTIVITY,
  myJoinStatus: "approved",
  exactMeetingPoint: "Durgam Lake – East Gate",
  roomId: "specimen-room",
};

const at = (minsAgo: number) => new Date(BASE - minsAgo * 60_000).toISOString();
const msg = (id: string, fromMe: boolean, senderName: string, content: string, minsAgo: number): RoomMessage => ({
  id, roomId: "specimen-room", senderUserId: fromMe ? "me" : id, senderName, senderEmoji: senderName[0], fromMe, content, createdAt: at(minsAgo),
});
const members: RoomMember[] = [
  { userId: "specimen-host", name: "Ananya Rao", emoji: "a", role: "admin" },
  { userId: "m2", name: "Rohit Varma", emoji: "r", role: "member" },
  { userId: "m3", name: "Meera Iyer", emoji: "m", role: "member" },
  { userId: "me", name: "Priya Sharma", emoji: "p", role: "member" },
];

export const SPECIMEN_ROOM: RoomSpecimen = {
  room: {
    id: "specimen-room", postId: SPECIMEN_ACTIVITY.id, postBody: SPECIMEN_ACTIVITY.body, postIntentType: "activity",
    memberCount: members.length, unread: false, muted: false, postStatus: "open", lastMessageAt: at(2),
  },
  post: SPECIMEN_APPROVED,
  messages: [
    msg("s1", false, "Ananya Rao", "Welcome everyone! We'll meet at the East Gate at 6:00 AM sharp.", 40),
    msg("s2", false, "Rohit Varma", "Excited! Is there parking nearby?", 25),
    msg("s3", false, "Ananya Rao", "Yes, there's free parking near the gate.", 20),
    msg("s4", true, "Priya Sharma", "Great! See you all tomorrow 👋", 2),
  ],
  members,
};

/* ── P4: a need, its offers, the coordination room ── */
export const SPECIMEN_NEED: Post = {
  ...SPECIMEN_ACTIVITY,
  id: "specimen-need",
  authorUserId: "me",
  authorName: "Priya Sharma",
  intentType: "ask",
  title: "Help move a sofa",
  body: "Need 2 people to help move a 3-seater sofa from my apartment to a nearby building (about 1.5 km). Elevator at both places. Should take about 1–2 hours. Thank you!",
  locationText: "Gachibowli",
  capacity: undefined,
  spotsFilled: 0,
  tags: ["Moving & Heavy Lifting"],
  mine: true,
  ...timeWindow("This weekend", new Date(BASE - 3 * 86_400_000)),
  createdAt: inHours(-3),
};

const offer = (id: string, userName: string, hoursAgo: number, status: PostJoinRequest["status"] = "pending"): PostJoinRequest => ({
  id, postId: SPECIMEN_NEED.id, userId: `u-${id}`, userName, userEmoji: userName[0], status, createdAt: inHours(-hoursAgo),
});
export const SPECIMEN_OFFERS: PostJoinRequest[] = [offer("o1", "Rohit Kumar", 1), offer("o2", "Ananya Reddy", 2), offer("o3", "Arjun Mehta", 2.5)];

export const SPECIMEN_OFFERER: PublicCandidateProfile = {
  id: "u-o1", name: "Rohit Kumar", avatarEmoji: "r", title: "Works at a product company", industry: "Engineering" as PublicCandidateProfile["industry"],
  location: "Gachibowli", remote: false, skills: [{ name: "Running" }, { name: "Sustainable living" }, { name: "Community events" }], experienceYears: 6,
  openTo: [], careerHealth: 0, bio: "Kind, reliable and always down to help in the neighborhood.", verificationLevel: "phone", phoneVerified: true,
  homeCity: "Gachibowli", followerCount: 12, followingCount: 9,
};

const needMsg = (id: string, fromMe: boolean, senderName: string, content: string, minsAgo: number): RoomMessage => ({
  id, roomId: "specimen-need-room", senderUserId: fromMe ? "me" : "u-o1", senderName, senderEmoji: senderName[0], fromMe, content, createdAt: at(minsAgo),
});
export const SPECIMEN_NEED_ROOM: RoomSpecimen = {
  room: {
    id: "specimen-need-room", postId: SPECIMEN_NEED.id, postBody: SPECIMEN_NEED.body, postIntentType: "ask",
    memberCount: 2, unread: false, muted: false, postStatus: "open", lastMessageAt: at(1),
  },
  post: { ...SPECIMEN_NEED, exactMeetingPoint: "Priya's apartment, Gachibowli (near My Home Avatar)", roomId: "specimen-need-room", spotsFilled: 1 },
  messages: [
    needMsg("n1", false, "Rohit Kumar", "Hi Priya! Looking forward to this. I'll confirm 30 mins before I start.", 12),
    needMsg("n2", true, "Priya Sharma", "Great, thanks! I'll be at the lobby. The sofa is in the living room.", 9),
  ],
  members: [
    { userId: "me", name: "Priya Sharma", emoji: "p", role: "admin" },
    { userId: "u-o1", name: "Rohit Kumar", emoji: "r", role: "member" },
  ],
};
