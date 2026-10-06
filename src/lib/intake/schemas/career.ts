import type { Option, Schema } from "@/lib/intake/types";

/** ARENA-APP-FLOW §6 — career depth. Opt-in and separate from the social profile. */

export const ROLE_FAMILIES: Option[] = ["Engineering", "Design", "Product", "Data", "SAP", "Sales", "Marketing", "Operations", "Finance", "HR", "Support", "Other"].map((x) => ({ value: x, label: x }));

export const SKILL_SUGGESTIONS: Record<string, string[]> = {
  Engineering: ["TypeScript", "React", "Java", "Spring Boot", "Python", "Node.js", "AWS", "Docker", "Kubernetes", "SQL"],
  Design: ["Figma", "UX research", "Prototyping", "Design systems", "Illustration", "Motion"],
  Product: ["Roadmapping", "User research", "Analytics", "A/B testing", "Jira", "Stakeholder management"],
  Data: ["SQL", "Python", "Power BI", "Tableau", "Machine learning", "Spark"],
  SAP: ["SAP S/4HANA", "ABAP", "Fiori", "SAP BTP", "SAP Basis"],
  Sales: ["B2B sales", "CRM", "Negotiation", "Lead generation", "Account management"],
  Marketing: ["SEO", "Content", "Performance marketing", "Social media", "Brand"],
  Operations: ["Supply chain", "Logistics", "Vendor management", "Process improvement", "Excel"],
  Finance: ["Accounting", "Tally", "GST", "Financial modelling", "Excel"],
  HR: ["Recruiting", "Payroll", "HRMS", "Employee relations", "L&D"],
  Support: ["Customer support", "Zendesk", "Escalations", "Voice process", "Chat support"],
  Other: [],
};

const SAP_MODULES: Option[] = ["FI", "CO", "MM", "SD", "PP", "QM", "PM", "HCM / SuccessFactors", "ABAP", "Basis", "BW / BI", "Ariba", "EWM", "S/4HANA Finance"].map((x) => ({ value: x, label: x }));
const STATUS: Option[] = [
  { value: "employed", label: "Employed" },
  { value: "notice", label: "Serving notice" },
  { value: "between", label: "Between jobs" },
  { value: "student", label: "Student" },
  { value: "freelancer", label: "Freelancer" },
];
export const NOTICE_OPTIONS: Option[] = ["Immediate", "15 days", "30 days", "60 days", "90 days"].map((x) => ({ value: x, label: x }));
const MODES: Option[] = [
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
];
const SHIFTS: Option[] = ["Day", "Night", "Rotational", "Flexible"].map((x) => ({ value: x.toLowerCase(), label: x }));
const SIZES: Option[] = ["1–10", "11–50", "51–200", "201–1000", "1000+"].map((x) => ({ value: x, label: x }));
const DEGREES: Option[] = ["10th", "12th", "Diploma", "Bachelor's", "Master's", "PhD", "Other"].map((x) => ({ value: x, label: x }));

const working = (v: Record<string, unknown>) => v.status === "employed" || v.status === "notice";

export const CAREER_SCHEMA: Schema = {
  id: "career",
  title: "Career profile",
  submitLabel: "Preview visibility",
  steps: [
    {
      id: "basics",
      title: "Set up your job preferences",
      lede: "This helps show you relevant opportunities. You can edit anytime.",
      fields: [
        { id: "title", type: "text", label: "Current or most recent title", required: true, placeholder: "e.g. Product Designer", maxLength: 80, why: "The first thing employers read." },
        { id: "years", type: "stepper", label: "Total experience — years", min: 0, max: 40, default: 0, unit: "yrs" },
        { id: "months", type: "stepper", label: "…and months", min: 0, max: 11, default: 0, unit: "mo" },
        { id: "company", type: "text", label: "Current company", placeholder: "e.g. GreenLeaf Labs", visibility: "employers-i-apply", why: "Hidden by default. Kept on this device until Arena can share it only with employers you apply to.", maxLength: 80 },
      ],
    },
    {
      id: "status",
      title: "Where you are right now",
      fields: [
        { id: "status", type: "chips", label: "Status", options: STATUS, required: true },
        { id: "notice", type: "chips", label: "Notice period", options: NOTICE_OPTIONS, showIf: working, why: "Employers plan start dates around this." },
        { id: "lastDay", type: "date", label: "Last working day", showIf: (v) => v.status === "notice" },
      ],
    },
    {
      id: "skills",
      title: "Skills & stack",
      lede: "Add how well you know each one — evidence beats keywords.",
      fields: [
        { id: "family", type: "select", label: "Role family", options: ROLE_FAMILIES, required: true, placeholder: "Choose your area" },
        { id: "skills", type: "skills", label: "Skills", max: 20, suggestions: (v) => SKILL_SUGGESTIONS[String(v.family ?? "")] ?? [], why: "Proficiency and years, so matching is honest.", placeholder: "Add a skill" },
        { id: "sapModules", type: "multichips", label: "SAP modules", options: SAP_MODULES, showIf: (v) => v.family === "SAP" },
        { id: "certs", type: "list", label: "Certifications", itemPlaceholder: "e.g. AWS Solutions Architect", max: 10, more: true },
      ],
    },
    {
      id: "pay",
      title: "Compensation",
      lede: "Only you see this — it stays on this device. You choose to include it when you apply.",
      fields: [
        { id: "currentCtc", type: "money", unit: "LPA", label: "Current CTC (fixed)", visibility: "only-me", placeholder: "e.g. 12" },
        { id: "variable", type: "money", unit: "LPA", label: "Variable pay", visibility: "only-me", more: true },
        { id: "expected", type: "money", unit: "LPA", range: true, label: "Expected CTC", visibility: "only-me", why: "A range works best." },
        { id: "negotiable", type: "toggle", label: "Negotiable", default: true },
      ],
    },
    {
      id: "prefs",
      title: "What you're looking for",
      fields: [
        { id: "roles", type: "list", label: "Desired roles", max: 3, itemPlaceholder: "e.g. Senior Product Designer", why: "Up to three.", required: true },
        { id: "modes", type: "multichips", label: "Work mode", options: MODES },
        { id: "locations", type: "list", label: "Preferred locations", max: 5, itemPlaceholder: "e.g. Gachibowli" },
        { id: "relocate", type: "toggle", label: "Open to relocate", default: false, more: true },
        { id: "shift", type: "chips", label: "Shift preference", options: SHIFTS, more: true },
        { id: "size", type: "multichips", label: "Company size", options: SIZES, more: true },
      ],
    },
    {
      id: "proof",
      title: "Resume & proof",
      lede: "All optional — you can apply without a resume.",
      fields: [
        { id: "resume", type: "file", label: "Resume", accept: ".pdf,.doc,.docx,application/pdf", placeholder: "Upload resume (PDF, DOC)", hint: "Only employers you apply to see it." },
        { id: "links", type: "list", label: "Portfolio, GitHub or LinkedIn", inputMode: "url", itemPlaceholder: "https://…", max: 5 },
        { id: "degree", type: "select", label: "Highest education", options: DEGREES, placeholder: "Choose one" },
        { id: "institution", type: "text", label: "Institution", maxLength: 100, more: true },
        { id: "gradYear", type: "number", label: "Year", min: 1960, max: 2035, more: true },
        { id: "languages", type: "list", label: "Languages", itemPlaceholder: "e.g. Telugu", max: 8, more: true },
      ],
    },
  ],
};
