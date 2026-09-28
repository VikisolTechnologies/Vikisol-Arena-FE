import type { Post, RoomMember, RoomMessage } from "@/lib/types";
import type { RoomSpecimen } from "@/components/activity/RoomScreen";

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
