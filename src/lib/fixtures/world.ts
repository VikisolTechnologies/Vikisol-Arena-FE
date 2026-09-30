/**
 * The preview world — one source of truth for every preview (mock-mode) screen.
 *
 * One neighbourhood (Gachibowli / Gopanapally, Hyderabad) and the 13 people who live in it.
 * Everything else follows from who they are: what they host, ask for and offer (mock/posts.ts),
 * the jobs near them and who applied (below), their chats and notifications. Architect review
 * 29 Sep, A1: "every screen reads from it; recruiter-side candidates must plausibly fit the job".
 *
 * Fictional names and companies; places are real geography only. Photos are free-licence and
 * credited in public/fixtures/CREDITS.md — the people pictured are not these names. Nothing here
 * is read in real ("api") mode.
 */

import type { AppNotification, CandidateProfile, Conversation, Industry, Job, OpenTo, ThreadMessage } from "@/lib/types";

export const NEIGHBOURHOOD = "Gachibowli / Gopanapally";

export interface WorldPerson {
  key: string;
  /** Candidate id in the mock API (cand-1 … cand-13). */
  id: string;
  name: string;
  photo: string;
  area: string;
  title: string;
  industry: Industry;
  experienceYears: number;
  skills: string[];
  interests: string[];
  bio: string;
  openTo: OpenTo[];
}

const P = (key: string, name: string, area: string, title: string, industry: Industry, experienceYears: number, skills: string[], interests: string[], bio: string, openTo: OpenTo[] = ["full-time"]): Omit<WorldPerson, "id"> => ({
  key, name, photo: `/fixtures/people/${key}.webp`, area, title, industry, experienceYears, skills, interests, bio, openTo,
});

export const PEOPLE: WorldPerson[] = [
  P("priya", "Priya Sharma", "Gachibowli", "Product Designer", "Design", 6, ["Figma", "UX Research", "Design Systems", "Prototyping"], ["Running", "Badminton", "Volunteering", "Food"], "Designer by day, runner at sunrise. Happy to help with anything visual."),
  P("rohit", "Rohit Varma", "Gachibowli", "Frontend Developer", "Engineering", 5, ["React", "TypeScript", "Accessibility", "Next.js"], ["Running", "Cricket"], "Runs the Saturday lake 5K. Builds web apps the rest of the week."),
  P("ananya", "Ananya Rao", "Kondapur", "Photographer", "Design", 4, ["Photography", "Photo editing", "Branding"], ["Photography", "Badminton", "Gardening"], "Portraits and events. I'll happily shoot your community day."),
  P("arjun", "Arjun Nair", "Nanakramguda", "Community Associate", "Sales", 2, ["Community outreach", "Event coordination", "Volunteer management", "Telugu"], ["Volunteering", "Environment", "DIY"], "Organises the Malkam Cheruvu clean-ups. Available weekends; handy with tools."),
  P("meera", "Meera Iyer", "Gachibowli", "Maths Teacher", "Sales", 5, ["Teaching", "Event coordination", "Parent outreach", "Telugu"], ["Tutoring", "Reading", "Running"], "Teaches Class 8–10 maths and runs the school's weekend events."),
  P("ravi", "Ravi Kumar", "Gopanapally", "Logistics Coordinator", "Logistics", 3, ["Event logistics", "Vendor coordination", "Inventory Planning", "Telugu"], ["Cricket", "Cooking"], "Moves things for a living, so ask me about moving day. Free most weekends."),
  P("kavya", "Kavya Reddy", "Kondapur", "UX Researcher", "Design", 4, ["UX Research", "Interviewing", "Survey design"], ["Walking", "Books", "Pottery"], "Researcher, walker, reader. Often in Mumbai for work."),
  P("kabir", "Kabir Das", "Kondapur", "Data Engineer", "Engineering", 6, ["Python", "SQL", "Data pipelines"], ["Cricket", "Cycling"], "Sunday cricket captain. Data pipelines during the week."),
  P("lakshmi", "Lakshmi Devi", "Gachibowli", "Home Chef", "Sales", 1, ["South Indian cooking", "Catering", "Community outreach", "Telugu"], ["Food", "Gardening"], "Cooks for the whole lane on Sundays. Runs a small tiffin service."),
  P("sameer", "Sameer Joshi", "Gachibowli", "Account Manager", "Sales", 7, ["Account Management", "B2B Sales", "CRM"], ["Books", "Tutoring"], "Book club regular. Looking out for my nephew's Class 10 exams."),
  P("sunita", "Sunita Menon", "Kondapur", "Event Planner", "Sales", 5, ["Event coordination", "Vendor coordination", "Community outreach", "Telugu", "Hindi"], ["Pottery", "Environment", "Art"], "Plans weddings and community days. Weekend availability is my whole job."),
  P("venkat", "Venkat Rao", "Nanakramguda", "Retired Engineer", "Engineering", 32, ["Gardening", "Mentoring", "Civil engineering", "Telugu"], ["Gardening", "Volunteering"], "Retired after 32 years in civil engineering. Grows too many tomatoes; happy to share.", ["projects"]),
  P("divya", "Divya Nair", "Gachibowli", "Clinical Coordinator", "Healthcare", 3, ["Patient coordination", "Scheduling", "Health camps", "Telugu"], ["Volunteering", "Running"], "Coordinates clinics by day and free health camps on weekends."),
].map((p, i) => ({ ...p, id: `cand-${i + 1}` }));

export const ME = PEOPLE[0];

export function person(key: string): WorldPerson {
  const p = PEOPLE.find((x) => x.key === key);
  if (!p) throw new Error(`No preview person "${key}"`);
  return p;
}

/** The world's people as mock-API candidate profiles. */
export function toCandidate(p: WorldPerson, i: number): CandidateProfile {
  return {
    id: p.id,
    name: p.name,
    avatarEmoji: p.name[0],
    title: p.title,
    industry: p.industry,
    location: "Hyderabad",
    homeCity: p.area,
    remote: false,
    skills: p.skills.map((name, k) => ({ name, verified: k < 2 })),
    experienceYears: p.experienceYears,
    rateFloor: 6 + p.experienceYears * 2,
    openTo: p.openTo,
    careerHealth: 62 + ((i * 7) % 30),
    consent: { autoApply: false, searchableByEnterprises: true },
    autonomy: "manual",
    bio: p.bio,
  };
}

/* ── Companies and jobs near the neighbourhood (fictional) ── */

export const COMPANIES = [
  { name: "Lakeshore Tech", emoji: "🟢" },
  { name: "Bluepeak Software", emoji: "🔷" },
  { name: "Meridian Works", emoji: "🔵" },
  { name: "Kestrel Apps", emoji: "🟥" },
  { name: "Tiffin Trail", emoji: "🟠" },
  { name: "Rupeeline", emoji: "🟦" },
  { name: "GreenLeaf Labs", emoji: "🌿" },
  { name: "CareCompass", emoji: "🩺" },
  { name: "Parcel Path", emoji: "📦" },
  { name: "Voltpay", emoji: "⚡" },
];
const co = (name: string) => COMPANIES.find((c) => c.name === name)!;

const job = (id: string, title: string, company: string, industry: Industry, location: string, employmentType: Job["employmentType"], salary: [number, number], skills: string[], description: string, postedDaysAgo: number, matchPercentage: number, remote = false): Job => ({
  id, title, company, companyEmoji: co(company).emoji, industry, location, remote, employmentType, salaryMin: salary[0], salaryMax: salary[1], skills, description, postedDaysAgo, matchPercentage,
});

/** Priya's matches first (a product designer), then roles that fit her neighbours. */
export const JOBS: Job[] = [
  job("job-1", "Product Designer", "Lakeshore Tech", "Design", "Gachibowli, Hyderabad", "Full Time", [18, 26], ["Figma", "Design Systems", "Prototyping", "UX Research"], "Own the design of our booking app end to end, from research to shipped UI, with a small product team.", 3, 92),
  job("job-2", "UX Designer", "Bluepeak Software", "Design", "Kondapur, Hyderabad", "Full Time", [14, 20], ["Figma", "UX Research", "Prototyping"], "Design clear, accessible flows for a payments dashboard used by small shops.", 5, 86, true),
  job("job-3", "Design Systems Designer", "Kestrel Apps", "Design", "Nanakramguda, Hyderabad", "Contract", [20, 28], ["Design Systems", "Figma", "Accessibility"], "A six-month contract to rebuild our component library and its documentation.", 8, 81),
  job("job-4", "Senior Product Designer", "Meridian Works", "Design", "Madhapur, Hyderabad", "Full Time", [26, 34], ["Figma", "UX Research", "Design Systems", "Mentoring"], "Lead design for our logistics tools and mentor two designers.", 11, 74),
  job("job-5", "Frontend Developer", "Tiffin Trail", "Engineering", "Gachibowli, Hyderabad", "Full Time", [16, 24], ["React", "TypeScript", "Accessibility"], "Build the ordering app our home chefs and customers use every day.", 2, 58),
  job("job-6", "Data Engineer", "Rupeeline", "Engineering", "Financial District, Hyderabad", "Full Time", [20, 30], ["Python", "SQL", "Data pipelines"], "Keep our reporting pipelines fast and correct as we grow.", 6, 41),
  job("job-7", "Community Program Assistant", "GreenLeaf Labs", "Sales", "Gachibowli, Hyderabad", "Full Time", [3, 4], ["Event coordination", "Community outreach", "Telugu"], "Help run neighbourhood programs, from sign-ups to the day itself.", 12, 48),
  job("job-8", "Clinic Coordinator", "CareCompass", "Healthcare", "Gachibowli, Hyderabad", "Full Time", [5, 7], ["Patient coordination", "Scheduling"], "Keep our weekend health camps running smoothly.", 4, 35),
  job("job-9", "Logistics Coordinator", "Parcel Path", "Logistics", "Gopanapally, Hyderabad", "Full Time", [5, 8], ["Vendor coordination", "Inventory Planning"], "Plan daily routes and vendor pickups for our west Hyderabad hub.", 7, 33),
  job("job-10", "UX Research Intern", "Voltpay", "Design", "Kondapur, Hyderabad", "Internship", [3, 4], ["UX Research", "Interviewing"], "Three months of interviews and usability tests with shop owners.", 9, 64),
];

/* ── Arena for Business: GreenLeaf Labs, a community-programs team in Gachibowli ── */

export const BUSINESS = {
  recruiter: { name: "Alex Rao", email: "alex@greenleaf.example" },
  // GreenLeaf sells sustainable home products and runs neighbourhood refill programs. The industry
  // list is the backend's closed five (Industry.java), so "Sales" is the closest fit (gap #62).
  company: { companyName: "GreenLeaf Labs", logoEmoji: "🌿", industry: "Sales" as Industry, size: "11-50" as const, hiringFor: ["Community"] },
  /** One plan everywhere (Home, Overview, Billing): Pro = 10 seats, 50 unlock credits; 3 people on the team, 7 profiles unlocked. */
  plan: { plan: "pro" as const, seatsUsed: 3, seatsTotal: 10, unlockCreditsUsed: 7, unlockCreditsTotal: 50 },
  job: {
    id: "demo-job",
    title: "Community Program Assistant",
    must: ["Event coordination", "Community outreach", "Telugu", "Weekend availability"],
    experience: "Entry level (0–3 years)",
  },
  /** Neighbours whose work fits community programs, at a believable spread of stages. */
  applicants: [
    { key: "arjun", stage: "interview" },
    { key: "sunita", stage: "offer" },
    { key: "ravi", stage: "screening" },
    { key: "divya", stage: "screening" },
    { key: "meera", stage: "applied" },
    { key: "lakshmi", stage: "hired" },
    { key: "venkat", stage: "applied" },
    { key: "ananya", stage: "rejected" },
  ] as const,
};

/* ── Priya's inbox, applications and notifications ── */

const minsAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const MY_APPLICATIONS = [{ id: "app-priya-1", jobId: "job-1", stage: "screening" as const, appliedDaysAgo: 4 }];

export const CONVERSATIONS: Conversation[] = [
  { id: "conv-1", participantId: "ext-lakeshore", participantName: "Lakeshore Tech", participantEmoji: "🟢", context: "Product Designer", lastMessageAt: minsAgo(20), unread: true },
  { id: "conv-2", participantId: person("rohit").id, participantName: "Rohit Varma", participantEmoji: "R", lastMessageAt: minsAgo(3 * 60), unread: false },
  { id: "conv-3", participantId: person("lakshmi").id, participantName: "Lakshmi Devi", participantEmoji: "L", lastMessageAt: minsAgo(26 * 60), unread: false },
];

export const MESSAGES: ThreadMessage[] = [
  { id: "m-1", conversationId: "conv-1", fromMe: false, content: "Hi Priya, thanks for applying. We liked your booking-flow case study.", timestamp: minsAgo(25) },
  { id: "m-2", conversationId: "conv-1", fromMe: true, content: "Thank you! Happy to walk you through it.", timestamp: minsAgo(22) },
  { id: "m-3", conversationId: "conv-1", fromMe: false, content: "Great. Do you have 20 minutes on Thursday for a first chat?", timestamp: minsAgo(20) },
  { id: "m-4", conversationId: "conv-2", fromMe: false, content: "Coming to the lake run tomorrow? We start at the amphitheatre steps.", timestamp: minsAgo(3 * 60 + 5) },
  { id: "m-5", conversationId: "conv-2", fromMe: true, content: "Yes! I'll bring Meera too.", timestamp: minsAgo(3 * 60) },
  { id: "m-6", conversationId: "conv-3", fromMe: false, content: "Two plates kept aside for you on Sunday. Bring a box for the payasam!", timestamp: minsAgo(26 * 60) },
];

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

export const NOTIFICATIONS: AppNotification[] = [
  { id: "n-1", type: "system", title: "Ananya Rao asked to join Badminton doubles tonight", body: "Approve or decline from your activity.", link: "/feed/post-1", timestamp: hoursAgo(0.8), read: false },
  { id: "n-2", type: "interview", title: "Lakeshore Tech replied about Product Designer", body: "They'd like a first chat on Thursday.", link: "/messages/conv-1", timestamp: hoursAgo(1), read: false },
  { id: "n-3", type: "agent", title: "Jenny found two things for your Saturday", body: "Sunrise Run at Durgam Lake and Pottery for beginners — both within 5 km.", link: "/agent", timestamp: hoursAgo(5), read: false },
  { id: "n-4", type: "system", title: "Ravi accepted your offer to help", body: "Help move a sofa · Tomorrow 5 PM, Gopanapally.", link: "/feed/post-sofa", timestamp: hoursAgo(20), read: true },
  { id: "n-5", type: "system", title: "Your request to join Pottery for beginners was sent", body: "Sunita will reply soon.", link: "/feed/post-pottery", timestamp: hoursAgo(19), read: true },
  { id: "n-6", type: "system", title: "Arjun marked the bookshelf help as done", body: "Say thanks or leave a note on his profile.", link: "/work?tab=completed", timestamp: hoursAgo(98), read: true },
];
