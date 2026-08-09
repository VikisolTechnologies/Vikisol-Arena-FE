import type { Company, CompanySize } from "@/lib/types";
import { COMPANIES, INDUSTRIES, pick } from "./seed";
import { MOCK_JOBS } from "./jobs";

const SIZES: CompanySize[] = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

function buildCompany(id: string, name: string, emoji: string): Company {
  return {
    id,
    name,
    emoji,
    industry: pick(INDUSTRIES),
    size: pick(SIZES),
    openJobCount: MOCK_JOBS.filter((j) => j.company === name).length,
    followerCount: 0,
  };
}

export const MOCK_COMPANIES: Company[] = COMPANIES.map((c, i) => buildCompany(`company-${i + 1}`, c.name, c.emoji));

export function getCompanyById(id: string) {
  return MOCK_COMPANIES.find((c) => c.id === id);
}
