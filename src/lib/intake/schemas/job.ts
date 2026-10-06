import type { Schema } from "@/lib/intake/types";

/** Recruiter board 3 + flow §8 — post a job: clear, inclusive, pay range required. */
export const JOB_SCHEMA: Schema = {
  id: "job",
  title: "Post a job",
  submitLabel: "Publish job",
  steps: [
    {
      id: "role",
      title: "Post a new job",
      lede: "Create a clear, inclusive opportunity.",
      fields: [
        { id: "title", type: "text", label: "Job title", required: true, maxLength: 80, placeholder: "e.g. Community Program Assistant" },
        { id: "about", type: "longtext", label: "About the role", required: true, maxLength: 600, placeholder: "What they'll do and why it matters" },
        { id: "type", type: "chips", label: "Type", options: [{ value: "Full Time", label: "Full time" }, { value: "Contract", label: "Contract" }, { value: "Internship", label: "Internship" }], required: true, default: "Full Time" },
      ],
    },
    {
      id: "needs",
      title: "What it takes",
      lede: "Must-haves are what you'll check. Keep them few and fair.",
      fields: [
        { id: "must", type: "list", label: "Must-haves", required: true, max: 8, itemPlaceholder: "e.g. Good communication" },
        { id: "nice", type: "list", label: "Nice-to-haves", max: 8, itemPlaceholder: "e.g. First aid certificate" },
        { id: "level", type: "select", label: "Experience level", options: ["Entry level (0–2 years)", "Mid level (2–5 years)", "Senior (5+ years)"].map((x) => ({ value: x, label: x })), placeholder: "Choose a level" },
      ],
    },
    {
      id: "where",
      title: "Where, pay and timing",
      fields: [
        { id: "mode", type: "chips", label: "Work mode", options: [{ value: "onsite", label: "On-site" }, { value: "remote", label: "Remote" }], required: true, default: "onsite" },
        { id: "location", type: "area", label: "Location", required: true, placeholder: "Your area" },
        { id: "pay", type: "money", unit: "LPA", range: true, label: "Pay range", required: true, why: "Required — people decide faster when pay is clear." },
        { id: "deadline", type: "date", label: "Application deadline", more: true, why: "Kept on this device until Arena stores deadlines." },
      ],
    },
    {
      id: "questions",
      title: "Application questions",
      lede: "Optional. Kept on this device — candidates are asked once Arena supports it.",
      fields: [{ id: "questions", type: "list", label: "Questions", max: 5, itemPlaceholder: "e.g. Are you available on weekends?" }],
    },
  ],
};
