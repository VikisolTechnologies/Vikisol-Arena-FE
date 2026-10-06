import type { Industry } from "@/lib/types";

/** Suggested skills per industry, shown as quick-add chips on the skill picker. */
export const SKILLS_BY_INDUSTRY: Record<Industry, string[]> = {
  Engineering: ["React", "TypeScript", "Node.js", "Java", "Spring Boot", "AWS", "Docker", "Kubernetes", "SQL", "Python", "Go", "System Design"],
  Design: ["Figma", "UI Design", "UX Research", "Design Systems", "Prototyping", "Motion Design", "Branding", "Illustration"],
  Sales: ["B2B Sales", "Lead Generation", "CRM", "Negotiation", "Account Management", "SaaS Sales", "Cold Outreach"],
  Healthcare: ["Patient Care", "Clinical Research", "Nursing", "Diagnostics", "Telemedicine", "Medical Coding", "EHR Systems"],
  Logistics: ["Supply Chain", "Fleet Management", "Warehouse Ops", "Inventory Planning", "Route Optimization", "Procurement"],
};
