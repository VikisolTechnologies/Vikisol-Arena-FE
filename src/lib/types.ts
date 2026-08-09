// Shared type contract for the whole app. Every src/lib/api/* function resolves these
// shapes from mock data today; a real backend swap later just replaces the function
// bodies; call sites and these types don't change.

// "enterprise" retired in favor of explicit roles (see DECISIONS.md) - recruiter/company_admin
// share the existing enterprise workspace, company_admin additionally gets /enterprise/admin,
// hiring_manager gets a lite "my interviews" view, platform_admin gets /admin (no tenant).
export type Role = "talent" | "recruiter" | "company_admin" | "hiring_manager" | "platform_admin";

export type OpenTo = "full-time" | "contract" | "projects";

export type Industry = "Engineering" | "Design" | "Sales" | "Healthcare" | "Logistics";

export type EmploymentType = "Full Time" | "Contract" | "Internship";

export interface Skill {
  name: string;
  verified?: boolean;
}

export interface ConsentSettings {
  autoApply: boolean;
  searchableByEnterprises: boolean;
}

export type AutonomyLevel = "manual" | "supervised" | "autopilot";

export interface CandidateProfile {
  id: string;
  name: string;
  avatarEmoji: string;
  title: string;
  industry: Industry;
  location: string;
  remote: boolean;
  skills: Skill[];
  experienceYears: number;
  rateFloor: number; // LPA for full-time, ₹/hr for contract, ignored for projects
  openTo: OpenTo[];
  careerHealth: number; // 0-100, composite score shown on the dashboard
  consent: ConsentSettings;
  autonomy: AutonomyLevel;
  bio?: string;
  resumeFileName?: string;
  resumeUploadedAt?: string;
  /** Real-mode only — the actual uploaded CV file's URL, served by arena-api. Absent in mock mode. */
  cvUrl?: string;
  // ARENA-V2-PRODUCT-ARCHITECTURE.md §5 (Phase B). approxLat/approxLng are already a
  // geohash-derived approximation, never the raw device coordinate - see DECISIONS.md.
  locationConsent?: LocationConsent;
  homeCity?: string;
  approxLat?: number;
  approxLng?: number;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  companyEmoji: string;
  industry: Industry;
  location: string;
  remote: boolean;
  employmentType: EmploymentType;
  salaryMin: number;
  salaryMax: number;
  skills: string[];
  description: string;
  postedDaysAgo: number;
  matchPercentage: number;
}

export type ActivityEventType =
  | "scanned"
  | "applied"
  | "match_found"
  | "interview_proposed"
  | "interview_confirmed"
  | "message";

export interface AgentActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  description: string;
  timestamp: string; // ISO
  relatedJobId?: string;
  rationale?: string;
  undoable?: boolean;
}

export type ApplicationStage =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected";

// One record, two views: `jobId` when sourced from the open market (candidate discovered/
// applied via Discover, Agent, or a direct job link), `postingId` when sourced from an
// enterprise's own JobPosting. Exactly one of the two is set. Candidate screens filter by
// `candidateId === "me"`; enterprise screens filter by `postingId` — same store, no more
// parallel Applicant/Application models drifting out of sync with each other.
export interface Application {
  id: string;
  candidateId: string;
  jobId?: string;
  postingId?: string;
  stage: ApplicationStage;
  appliedAt: string;
  updatedAt: string;
}

export interface InterviewSlotOption {
  id: string;
  start: string; // ISO
  durationMinutes: number;
}

export type InterviewRecommendation = "advance" | "hold" | "reject";

export interface InterviewFeedback {
  rating: number; // 1-5
  strengths: string;
  concerns: string;
  recommendation: InterviewRecommendation;
  submittedAt: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  proposedSlots: InterviewSlotOption[];
  confirmedSlotId?: string;
  status: "proposed" | "confirmed" | "completed" | "cancelled";
  // Plain link field today (mock) - the join screen renders it as-is; swapping in a real
  // WebRTC/Daily.co/Zoom embed later only touches MeetingEmbed's rendering, not this contract.
  meetingLink?: string;
  notes?: string;
  feedback?: InterviewFeedback;
}

export interface Deliverable {
  note: string;
  submittedAt: string;
}

export interface Milestone {
  id: string;
  label: string;
  amount: number; // this tranche's share of the awarded bid
  done: boolean; // true once the deliverable is accepted
  deliverable?: Deliverable;
}

export interface ProjectRating {
  fromRole: "poster" | "bidder";
  rating: number; // 1-5
  comment: string;
  submittedAt: string;
}

export interface Bid {
  id: string;
  projectId: string;
  bidderName: string;
  bidderEmoji: string;
  amount: number;
  matchPercentage: number;
  agentPick?: boolean;
  submittedAt: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  durationWeeks: number;
  skills: string[];
  postedBy: string;
  status: "open" | "awarded" | "closed";
  endsAt: string; // ISO
  bids: Bid[];
  // Only populated once awarded - lets a non-owner (the winning bidder) see and act on their own
  // milestones without needing the poster-only "mine"/MyProject view.
  awardedBidId?: string;
  milestones?: Milestone[];
}

export type ChatRole = "user" | "agent";

export type IntentType = "apply" | "create_job" | "place_bid";

export interface IntentCard {
  id: string;
  type: IntentType;
  summary: string;
  payload: Record<string, string | number>;
  status: "pending" | "approved" | "rejected";
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  intentCard?: IntentCard;
}

export type NotificationType = "agent" | "interview" | "bid" | "system";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface EnterpriseSearchResult {
  candidate: CandidateProfile;
  matchPercentage: number;
  fitBlurb: string;
  availability: string;
}

export interface Session {
  role: Role;
  candidateId?: string;
  name: string;
  email: string;
}

export type CompanySize = "1-10" | "11-50" | "51-200" | "201-1000" | "1000+";

export type TenantStatus = "active" | "suspended";

export interface EnterpriseProfile {
  companyName: string;
  logoEmoji: string;
  industry: Industry;
  size: CompanySize;
  hiringFor: string[];
  plan: "free" | "pro" | "enterprise";
  seatsUsed: number;
  seatsTotal: number;
  unlockCreditsUsed: number;
  unlockCreditsTotal: number;
  status: TenantStatus;
}

export type MembershipStatus = "invited" | "active" | "suspended";

export interface Membership {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  status: MembershipStatus;
  invitedBy?: string;
  joinedAt: string;
}

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  token: string;
  expiresAt: string;
  invitedBy: string;
  status: InvitationStatus;
  createdAt: string;
}

export interface CreditLedgerEntry {
  id: string;
  actorName?: string;
  delta: number;
  reason: string;
  balanceAfter: number;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actorName: string;
  action: string;
  target?: string;
  metadata?: string;
  createdAt: string;
}

export type PostingStatus = "open" | "paused" | "closed";

export interface JobPosting {
  id: string;
  title: string;
  industry: Industry;
  location: string;
  remote: boolean;
  employmentType: EmploymentType;
  salaryMin: number;
  salaryMax: number;
  skills: string[];
  description: string;
  status: PostingStatus;
  createdAt: string;
}

// ---- Platform Admin (PA1-PA7) ----

export interface TenantSummary {
  id: string;
  companyName: string;
  logoEmoji: string;
  plan: "free" | "pro" | "enterprise";
  status: TenantStatus;
  seatsUsed: number;
  seatsTotal: number;
  unlockCreditsUsed: number;
  unlockCreditsTotal: number;
  ownerEmail?: string;
  createdAt: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId?: string;
  tenantName?: string;
  createdAt: string;
}

export type ModerationStatus = "pending" | "dismissed" | "taken_down";

// ARENA-V2-PRODUCT-ARCHITECTURE.md §4 (Phase B): the queue now also carries room reports, not
// just job-posting auto-flags - contentType says which of the two shapes is populated.
// job_posting items have postingId/postingTitle/tenantName; room items have roomId/reporterName
// (postBody is reused for postingTitle's slot server-side so the title column always has
// something readable to show regardless of contentType).
export type ModerationContentType = "job_posting" | "room";

export interface ModerationItem {
  id: string;
  contentType: ModerationContentType;
  postingId?: string;
  postingTitle: string;
  tenantName?: string;
  roomId?: string;
  reporterName?: string;
  reason: string;
  status: ModerationStatus;
  createdAt: string;
}

export interface PlatformAnalytics {
  tenantsTotal: number;
  tenantsSuspended: number;
  tenantsByPlan: Record<string, number>;
  usersTotal: number;
  usersByRole: Record<string, number>;
  postingsTotal: number;
  postingsOpen: number;
  applicationsTotal: number;
  interviewsTotal: number;
  newTenantsLast7d: number;
  newUsersLast7d: number;
}

export interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description?: string;
  enabled: boolean;
}

export interface PlatformDashboard {
  tenantsTotal: number;
  tenantsSuspended: number;
  usersTotal: number;
  moderationPending: number;
  recentActivity: AuditEvent[];
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantEmoji: string;
  context?: string;
  lastMessageAt: string;
  unread: boolean;
}

export interface ThreadMessage {
  id: string;
  conversationId: string;
  fromMe: boolean;
  content: string;
  timestamp: string;
}

// ---- Phase A: posts / rooms / follows (ARENA-V2-PRODUCT-ARCHITECTURE.md) ----

// Only the three intent types with no pre-existing backing entity - JOB/PROJECT/COMPANY stay on
// their existing tables (Job, Project; company pages don't exist yet). See §"Room becomes" in
// the source doc: ACTIVITY/ASK map to a real Room, UPDATE maps to a comment thread (Phase C,
// not built yet) - an UPDATE post in Phase A is just a feed item with no join/room UI at all.
export type PostIntentType = "activity" | "ask" | "update";

export type PostAudience = "global" | "followers" | "local"; // "local" not selectable yet (needs Phase B geo)
export type PostVisibility = "public" | "approval"; // drives the join/approve flow; ignored for "update"
export type PostStatus = "open" | "full" | "closed" | "cancelled" | "expired";
export type PostJoinStatus = "pending" | "approved" | "declined";

export interface Post {
  id: string;
  authorUserId: string;
  authorName: string;
  authorEmoji: string;
  intentType: PostIntentType;
  body: string;
  locationText?: string;
  audience: PostAudience;
  visibility: PostVisibility;
  capacity?: number;
  spotsFilled: number;
  status: PostStatus;
  startsAt?: string;
  endsAt?: string;
  tags: string[];
  mediaUrls: string[];
  joinable: boolean;
  mine?: boolean;
  /** The viewer's own join request status against this post, if any. */
  myJoinStatus?: PostJoinStatus;
  /** Set once the viewer has an approved join (or is the author) and a Room exists. */
  roomId?: string;
  createdAt: string;
  // ARENA-V2-PRODUCT-ARCHITECTURE.md §4/§5 (Phase B). approxLat/approxLng are already jittered
  // for display server-side (see PostMapper) - never the stored value directly, and a fresh
  // jitter every response (two calls for the same post return slightly different coordinates by
  // design). exactMeetingPoint is only ever non-null when the viewer is the author or an
  // approved room member.
  approxLat?: number;
  approxLng?: number;
  exactMeetingPoint?: string;
  requiredVerificationLevel?: VerificationLevel;
  /** Client-computed only (Haversine against the viewer's own approx position) - never sent by
   * the API, populated by lib/api/posts.ts's getNearby() for map/list display. */
  distanceKm?: number;
}

export interface PostJoinRequest {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userEmoji: string;
  status: PostJoinStatus;
  createdAt: string;
}

export type RoomMemberRole = "admin" | "member";

export interface Room {
  id: string;
  postId: string;
  postBody: string;
  postIntentType: PostIntentType;
  memberCount: number;
  unread: boolean;
  /** Phase B: per-member mute - muted members still see history but don't count toward unread. */
  muted: boolean;
  postStatus: PostStatus;
  lastMessageAt: string;
  lastMessagePreview?: string;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  senderUserId: string;
  senderName: string;
  senderEmoji: string;
  fromMe: boolean;
  content: string;
  createdAt: string;
}

export interface RoomMember {
  userId: string;
  name: string;
  emoji: string;
  role: RoomMemberRole;
}

export interface FollowCounts {
  userId: string;
  followerCount: number;
  followingCount: number;
  viewerFollows?: boolean;
}

export interface FollowerEntry {
  userId: string;
  name: string;
  emoji: string;
  followedAt: string;
}

// ---- Phase B: map/discovery, location consent, verification, safety (ARENA-V2-PRODUCT-ARCHITECTURE.md §4/§5) ----

// Ordinal-comparable, mirrors backend VerificationLevel.atLeast() - "id" is modeled but not
// reachable through any real or manual-review flow yet (see BLOCKED.md).
export type VerificationLevel = "basic" | "phone" | "id";

// "local" audience/"off" location behave the same way: the app stays fully usable, discovery
// (Feed proximity, Map) just degrades to no distance-based centering/sorting.
export type LocationConsent = "precise" | "city" | "off";

export interface VerificationStatus {
  verificationLevel: VerificationLevel;
  phoneVerified: boolean;
  phoneNumber?: string;
  /** True while a requested OTP hasn't been confirmed or has expired unconfirmed. */
  otpPending: boolean;
}

export interface BlockedUser {
  userId: string;
  name: string;
  emoji: string;
  blockedAt: string;
}

