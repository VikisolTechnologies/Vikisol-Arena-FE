import type { Schema } from "@/lib/intake/types";

/** Recruiter board 2 + flow §8 B2 — the company workspace. */
export const businessSchema = (industries: string[]): Schema => ({
  id: "business",
  title: "Company workspace",
  submitLabel: "Complete setup",
  steps: [
    {
      id: "company",
      title: "Company workspace",
      lede: "Tell us about your organisation.",
      fields: [
        { id: "companyName", type: "text", label: "Legal company name", required: true, maxLength: 100, placeholder: "e.g. GreenPath Design Studio Ltd" },
        { id: "workEmail", type: "text", inputMode: "email", label: "Work email (company domain)", placeholder: "you@company.com", why: "Used to verify your company once verification opens." },
        { id: "website", type: "text", inputMode: "url", label: "Company website", placeholder: "https://…" },
        { id: "yourRole", type: "select", label: "Your role", options: ["Recruiter / Talent acquisition", "HR", "Founder / Owner", "Hiring manager", "Other"].map((x) => ({ value: x, label: x })), placeholder: "Choose your role" },
      ],
    },
    {
      id: "about",
      title: "About the company",
      fields: [
        { id: "industry", type: "select", label: "Industry", options: industries.map((x) => ({ value: x, label: x })), required: true, placeholder: "Choose an industry" },
        { id: "size", type: "chips", label: "Company size", options: ["1-10", "11-50", "51-200", "201-1000", "1000+"].map((x) => ({ value: x, label: x })), required: true, default: "11-50" },
        { id: "hq", type: "text", label: "Head-office city", maxLength: 60, placeholder: "e.g. Hyderabad" },
        { id: "gstin", type: "text", label: "GSTIN or CIN", maxLength: 30, more: true, why: "Optional — checked by Arena's team once verification opens." },
      ],
    },
    {
      id: "hiring",
      title: "What are you hiring for?",
      fields: [{ id: "hiringFor", type: "list", label: "Roles", required: true, max: 12, itemPlaceholder: "e.g. Community Program Assistant", why: "Helps us set up your first job." }],
    },
  ],
});
