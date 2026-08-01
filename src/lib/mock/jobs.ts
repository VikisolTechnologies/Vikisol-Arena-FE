import type { Job } from "@/lib/types";
import {
  rand,
  pick,
  pickN,
  intBetween,
  LOCATIONS,
  SKILLS_BY_INDUSTRY,
  INDUSTRIES,
  TITLES_BY_INDUSTRY,
  COMPANIES,
} from "./seed";

const DESCRIPTIONS_BY_INDUSTRY: Record<string, string> = {
  Engineering: "Own features end-to-end alongside a small, fast-moving product team.",
  Design: "Shape the product experience from research through to shipped UI.",
  Sales: "Own a pipeline of accounts and drive revenue growth quarter over quarter.",
  Healthcare: "Deliver high-quality patient-centered care as part of a modern clinical team.",
  Logistics: "Keep the supply chain moving — planning, tracking, and optimizing at scale.",
};

function buildJob(id: string): Job {
  const industry = pick(INDUSTRIES);
  const company = pick(COMPANIES);
  const salaryMin = intBetween(6, 30);
  return {
    id,
    title: pick(TITLES_BY_INDUSTRY[industry]),
    company: company.name,
    companyEmoji: company.emoji,
    industry,
    location: pick(LOCATIONS),
    remote: rand() < 0.35,
    employmentType: pick(["Full Time", "Contract", "Internship"] as const),
    salaryMin,
    salaryMax: salaryMin + intBetween(4, 16),
    skills: pickN(SKILLS_BY_INDUSTRY[industry], intBetween(3, 5)),
    description: DESCRIPTIONS_BY_INDUSTRY[industry],
    postedDaysAgo: intBetween(0, 14),
    matchPercentage: intBetween(62, 98),
  };
}

export const MOCK_JOBS: Job[] = Array.from({ length: 30 }, (_, i) => buildJob(`job-${i + 1}`));

export function getJobById(id: string) {
  return MOCK_JOBS.find((j) => j.id === id);
}
