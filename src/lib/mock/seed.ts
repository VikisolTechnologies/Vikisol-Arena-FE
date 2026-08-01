import type { Industry } from "@/lib/types";

// Deterministic PRNG (mulberry32) so mock data is stable across reloads within a session
// instead of reshuffling every refresh — makes screenshots/demos consistent.
export function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rand = mulberry32(42);

export function pick<T>(arr: readonly T[], r: () => number = rand): T {
  return arr[Math.floor(r() * arr.length)];
}

export function pickN<T>(arr: readonly T[], n: number, r: () => number = rand): T[] {
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(r() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

export function intBetween(min: number, max: number, r: () => number = rand) {
  return Math.floor(min + r() * (max - min + 1));
}

export const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditi", "Ananya", "Rohan", "Priya", "Karthik", "Sneha",
  "Arjun", "Meera", "Ishaan", "Kavya", "Rahul", "Divya", "Aman", "Neha",
  "Siddharth", "Pooja", "Vikram", "Riya", "Sanjay", "Anjali", "Rajesh", "Shreya",
  "Nikhil", "Tanvi", "Varun", "Isha", "Karan", "Aisha", "Manoj", "Nisha",
];
export const LAST_NAMES = [
  "Sharma", "Verma", "Reddy", "Iyer", "Nair", "Gupta", "Rao", "Khan",
  "Mehta", "Joshi", "Kumar", "Pillai", "Chatterjee", "Desai", "Kapoor", "Menon",
];

export const LOCATIONS = ["Hyderabad", "Bengaluru", "Mumbai", "Pune", "Chennai", "Remote"];

export const SKILLS_BY_INDUSTRY: Record<Industry, string[]> = {
  Engineering: ["React", "TypeScript", "Node.js", "Java", "Spring Boot", "AWS", "Docker", "Kubernetes", "SQL", "Python", "Go", "System Design"],
  Design: ["Figma", "UI Design", "UX Research", "Design Systems", "Prototyping", "Motion Design", "Branding", "Illustration"],
  Sales: ["B2B Sales", "Lead Generation", "CRM", "Negotiation", "Account Management", "SaaS Sales", "Cold Outreach"],
  Healthcare: ["Patient Care", "Clinical Research", "Nursing", "Diagnostics", "Telemedicine", "Medical Coding", "EHR Systems"],
  Logistics: ["Supply Chain", "Fleet Management", "Warehouse Ops", "Inventory Planning", "Route Optimization", "Procurement"],
};

export const INDUSTRIES = Object.keys(SKILLS_BY_INDUSTRY) as Industry[];

export const TITLES_BY_INDUSTRY: Record<Industry, string[]> = {
  Engineering: ["Software Engineer", "Backend Developer", "Frontend Developer", "DevOps Engineer", "Full Stack Developer", "Data Engineer"],
  Design: ["Product Designer", "UI/UX Designer", "Visual Designer", "Design Lead"],
  Sales: ["Sales Executive", "Account Executive", "Business Development Manager", "Sales Manager"],
  Healthcare: ["Registered Nurse", "Clinical Coordinator", "Healthcare Analyst", "Medical Officer"],
  Logistics: ["Logistics Coordinator", "Supply Chain Analyst", "Warehouse Manager", "Fleet Supervisor"],
};

export const COMPANIES = [
  { name: "Techolution", emoji: "🟢" },
  { name: "Swiggy", emoji: "🟠" },
  { name: "Microsoft", emoji: "🔷" },
  { name: "Innova Solutions", emoji: "🔵" },
  { name: "Paytm", emoji: "🟦" },
  { name: "Zoho", emoji: "🟥" },
  { name: "Freshworks", emoji: "🟩" },
  { name: "Practo", emoji: "🩺" },
  { name: "Delhivery", emoji: "📦" },
  { name: "Razorpay", emoji: "⚡" },
];

export const AVATAR_EMOJIS = ["🧑🏽", "👩🏽", "🧔🏽", "👨🏻", "👩🏻", "👨🏾", "👩🏾", "🧑🏻", "👨🏽", "👩🏼"];

export function fullName(r: () => number = rand) {
  return `${pick(FIRST_NAMES, r)} ${pick(LAST_NAMES, r)}`;
}
