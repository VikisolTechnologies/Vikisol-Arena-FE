/**
 * Profile domain for B+ screens — the existing src/lib/api/profile calls, unchanged shapes.
 * Fields the backend can't store yet are listed in docs/FE-API-GAPS.md.
 */
export { getMyProfile, updateMyLocation, updateMySkills } from "@/lib/api/profile";
export type { CandidateProfile } from "@/lib/types";
