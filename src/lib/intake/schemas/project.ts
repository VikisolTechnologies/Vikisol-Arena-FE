import type { Option, Schema } from "@/lib/intake/types";

/** ARENA-APP-FLOW §7 PR1–PR2 — start a project and say who you need. */
const o = (...xs: string[]): Option[] => xs.map((x) => ({ value: x.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label: x }));

export const PROJECT_SCHEMA: Schema = {
  id: "project",
  title: "Start a project",
  submitLabel: "Publish project",
  steps: [
    {
      id: "basics",
      title: "Start a project",
      lede: "Collaborate for a bigger impact.",
      fields: [
        { id: "title", type: "text", label: "Project name", required: true, maxLength: 80, placeholder: "e.g. Lake clean-up map" },
        { id: "goal", type: "longtext", label: "The goal", required: true, maxLength: 600, placeholder: "What will be different when it's done?" },
        { id: "category", type: "chips", label: "Category", options: o("Community", "Environment", "Education", "Tech", "Design", "Arts", "Other"), required: true },
        { id: "where", type: "chips", label: "Where", options: o("Local", "Remote", "Both"), default: "local" },
      ],
    },
    {
      id: "roles",
      title: "Who do you need?",
      lede: "Roles, the skills that help, and the time it takes.",
      fields: [
        { id: "roles", type: "list", label: "Roles", required: true, max: 6, itemPlaceholder: "e.g. 2 designers", why: "People apply to a role." },
        { id: "skills", type: "list", label: "Helpful skills", max: 12, itemPlaceholder: "e.g. Figma" },
        { id: "hours", type: "stepper", label: "Time per week", min: 1, max: 40, default: 4, unit: "h" },
        { id: "weeks", type: "stepper", label: "Duration", min: 1, max: 52, default: 6, unit: "weeks" },
      ],
    },
    {
      id: "kind",
      title: "Paid or collaborative?",
      fields: [
        { id: "paid", type: "chips", label: "Type", options: [{ value: "collab", label: "Collaborative (unpaid)" }, { value: "paid", label: "Paid — freelancers bid" }], required: true, default: "collab", why: "No payments happen inside Arena; paid projects agree terms directly." },
        { id: "budget", type: "money", unit: "₹", range: true, label: "Budget", required: true, showIf: (v) => v.paid === "paid" },
      ],
    },
  ],
};
