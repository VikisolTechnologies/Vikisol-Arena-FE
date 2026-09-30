/**
 * Production stand-in for the preview world (src/lib/fixtures/world.ts). next.config.ts aliases
 * the real module to this one when NEXT_PUBLIC_ARENA_DATA="api", so no fictional person, job,
 * chat or photo path ships in a production bundle (performance pass + FE-BPLUS-BUILD §6).
 * Typed against the real module so the two can't drift.
 */
import type * as Real from "@/lib/fixtures/world";

export type WorldPerson = Real.WorldPerson;
export const NEIGHBOURHOOD = "" as typeof Real.NEIGHBOURHOOD;
export const PEOPLE: typeof Real.PEOPLE = [];
const NOBODY: WorldPerson = { key: "", id: "", name: "", photo: "", area: "", title: "", industry: "Design", experienceYears: 0, skills: [], interests: [], bio: "", openTo: [] };
export const ME: typeof Real.ME = NOBODY;
export const person: typeof Real.person = () => NOBODY;
export const toCandidate: typeof Real.toCandidate = (p) => ({ id: p.id, name: p.name, avatarEmoji: "", title: "", industry: p.industry, location: "", remote: false, skills: [], experienceYears: 0, rateFloor: 0, openTo: [], careerHealth: 0, consent: { autoApply: false, searchableByEnterprises: false }, autonomy: "manual" });
export const COMPANIES: typeof Real.COMPANIES = [];
export const JOBS: typeof Real.JOBS = [];
export const BUSINESS: typeof Real.BUSINESS = { recruiter: { name: "", email: "" }, company: { companyName: "", logoEmoji: "", industry: "Design", size: "11-50", hiringFor: [] }, job: { id: "", title: "", must: [], experience: "" }, applicants: [] as unknown as typeof Real.BUSINESS.applicants };
export const MY_APPLICATIONS: typeof Real.MY_APPLICATIONS = [];
export const CONVERSATIONS: typeof Real.CONVERSATIONS = [];
export const MESSAGES: typeof Real.MESSAGES = [];
export const NOTIFICATIONS: typeof Real.NOTIFICATIONS = [];
