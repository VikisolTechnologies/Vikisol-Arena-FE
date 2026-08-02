// Shared type contract for the whole app. Every src/lib/api/* function resolves these
// shapes from mock data today; a real backend swap later just replaces the function
// bodies; call sites and these types don't change.

export type Role = "talent" | "enterprise";

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

export interface Interview {
  id: string;
  applicationId: string;
  proposedSlots: InterviewSlotOption[];
  confirmedSlotId?: string;
  status: "proposed" | "confirmed" | "completed" | "cancelled";
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

