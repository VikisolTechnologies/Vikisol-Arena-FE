import type { Application, CandidateProfile, Job, Conversation, Post, PostJoinRequest, PublicCandidateProfile, RoomMember, RoomMessage, ThreadMessage } from "@/lib/types";
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
  mediaUrls: ["/fixtures/photos/sunrise-run.webp"],
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
  mediaUrls: ["/fixtures/photos/sofa.webp"],
  mine: true,
  ...timeWindow("This weekend", new Date(BASE - 3 * 86_400_000)),
  createdAt: inHours(-3),
};

const offer = (id: string, userName: string, hoursAgo: number, status: PostJoinRequest["status"] = "pending"): PostJoinRequest => ({
  id, postId: SPECIMEN_NEED.id, userId: `u-${id}`, userName, userEmoji: userName[0], status, createdAt: inHours(-hoursAgo),
});
export const SPECIMEN_OFFERS: PostJoinRequest[] = [offer("o1", "Rohit Varma", 1), offer("o2", "Ananya Reddy", 2), offer("o3", "Arjun Mehta", 2.5)];

export const SPECIMEN_OFFERER: PublicCandidateProfile = {
  id: "u-o1", name: "Rohit Varma", avatarEmoji: "r", title: "Works at a product company", industry: "Engineering" as PublicCandidateProfile["industry"],
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
    needMsg("n1", false, "Rohit Varma", "Hi Priya! Looking forward to this. I'll confirm 30 mins before I start.", 12),
    needMsg("n2", true, "Priya Sharma", "Great, thanks! I'll be at the lobby. The sofa is in the living room.", 9),
  ],
  members: [
    { userId: "me", name: "Priya Sharma", emoji: "p", role: "admin" },
    { userId: "u-o1", name: "Rohit Varma", emoji: "r", role: "member" },
  ],
};

/* ── P5: a direct conversation about a community post ── */
export const SPECIMEN_GARDEN: Post = {
  ...SPECIMEN_ACTIVITY,
  id: "specimen-garden",
  authorUserId: "u-ananya",
  authorName: "Ananya Rao",
  title: "Community Garden Setup",
  body: "Let's make our neighborhood greener together.",
  locationText: "Gachibowli (public park)",
  mediaUrls: ["/fixtures/photos/garden.webp"],
  startsAt: inHours(3.5),
  endsAt: inHours(5.5),
};
const tm = (id: string, fromMe: boolean, content: string, minsAgo: number): ThreadMessage => ({ id, conversationId: "specimen-conv", fromMe, content, timestamp: at(minsAgo) });
export const SPECIMEN_CONVERSATION = {
  conversation: {
    id: "specimen-conv", participantId: "u-ananya", participantName: "Ananya Rao", participantEmoji: "a",
    lastMessageAt: at(3), unread: false, postId: "specimen-garden",
  } satisfies Conversation,
  messages: [
    tm("t1", false, "Hey! Are you still joining this Saturday?", 45),
    tm("t2", true, "Yes! I'll be there. See you at 9.", 40),
    tm("t3", false, "Great! Here's the meeting link for a quick call tomorrow if needed.", 30),
    tm("t4", false, "Meeting link: https://meet.example.com/garden-plan", 29),
  ],
  post: SPECIMEN_GARDEN,
};

/* ── P6: a job, the candidate, an application ── */
export const SPECIMEN_JOB: Job = {
  id: "specimen-job", title: "Product Designer", company: "GreenLeaf Labs", companyEmoji: "g", industry: "Design",
  location: "Gachibowli", remote: false, employmentType: "Full Time", salaryMin: 14, salaryMax: 22,
  skills: ["Figma", "UX research", "Prototyping", "Design systems", "Illustration"],
  description: "We're building products that make sustainable living easier for Indian cities. Join our design team to shape products that create real-world impact.\n\nYou'll own end-to-end flows, run lightweight research with residents and work closely with engineering.",
  postedDaysAgo: 2, matchPercentage: 0,
};
export const SPECIMEN_CANDIDATE = {
  id: "me", name: "Priya Sharma", avatarEmoji: "p", title: "Product Designer", industry: "Design", location: "Hyderabad", remote: false,
  skills: [{ name: "Figma" }, { name: "UX research" }, { name: "Prototyping" }, { name: "Motion" }], experienceYears: 4, rateFloor: 12,
  openTo: ["full-time"], careerHealth: 0, consent: { autoApply: false, searchableByEnterprises: true }, autonomy: "manual",
  homeCity: "Gachibowli", resumeFileName: "Priya_Sharma_Resume.pdf", cameForJob: true,
} as CandidateProfile;
export const SPECIMEN_APPLICATION: Application = {
  id: "specimen-app", candidateId: "me", jobId: "specimen-job", stage: "screening", appliedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(), updatedAt: new Date(Date.now() - 86_400_000).toISOString(),
};

/* Host's own activity (manage, check in, cancel). Each keeps the fixture's own clock time (a 6:30 AM
 * run); only the date moves, relative to today. "Starting soon" uses a fixed clock (`now`) 45 min
 * before the start so the window shows whatever time it is. */
const DAY = 86_400_000;
const clockOnDay = (days: number) => new Date(Math.floor(Date.now() / DAY) * DAY + days * DAY + (BASE % DAY)).toISOString();
const req = (id: string, userName: string, status: PostJoinRequest["status"], outcome?: PostJoinRequest["outcome"]): PostJoinRequest => ({
  id, postId: "specimen-host-activity", userId: `u-${id}`, userName, userEmoji: userName[0], status, createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(), outcome,
});
export const SPECIMEN_HOST_REQUESTS: PostJoinRequest[] = [
  req("r1", "Meera Iyer", "pending"),
  req("r2", "Kabir Das", "pending"),
  req("r3", "Rohit Varma", "approved"),
  req("r4", "Divya Nair", "approved"),
];
const hostBase: Post = { ...SPECIMEN_ACTIVITY, id: "specimen-host-activity", authorName: "Priya Sharma", mine: true, spotsFilled: 2, roomId: "specimen-room" };
/** Two days out: the request queue and Cancel. */
export const SPECIMEN_HOST_UPCOMING: Post = { ...hostBase, startsAt: clockOnDay(2), endsAt: new Date(Date.parse(clockOnDay(2)) + 3600_000).toISOString() };
/** Starting within the hour: "Starting soon" and Check people in. */
export const SPECIMEN_HOST_SOON_NOW = BASE - 45 * 60_000;
export const SPECIMEN_HOST_SOON: Post = { ...hostBase, startsAt: inHours(0), endsAt: inHours(1), exactMeetingPoint: "Durgam Lake – East Gate" };
/** Three days from today (YYYY-MM-DD) for the activity preview specimen. */
export const SPECIMEN_PREVIEW_DATE = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
