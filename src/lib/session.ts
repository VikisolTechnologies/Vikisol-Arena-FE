import type { AutonomyLevel, ConsentSettings, EnterpriseProfile, Industry, OpenTo, Session } from "@/lib/types";

const KEY = "arena_session";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(session: Session) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

const ONBOARDED_KEY = "arena_onboarded";

export function isOnboarded() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDED_KEY) === "true";
}

export function setOnboarded() {
  localStorage.setItem(ONBOARDED_KEY, "true");
}

export interface OnboardingProfile {
  name: string;
  title: string;
  industry: Industry;
  skills: string[];
  experienceYears: number;
  rateFloor: number;
  openTo: OpenTo[];
  consent: ConsentSettings;
  autonomy?: AutonomyLevel;
  resumeFileName?: string;
  resumeUploadedAt?: string;
}

const PROFILE_KEY = "arena_onboarding_profile";

export function saveOnboardingProfile(profile: OnboardingProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getOnboardingProfile(): OnboardingProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as OnboardingProfile) : null;
  } catch {
    return null;
  }
}

const ENTERPRISE_ONBOARDED_KEY = "arena_enterprise_onboarded";
const ENTERPRISE_PROFILE_KEY = "arena_enterprise_profile";

export function isEnterpriseOnboarded() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ENTERPRISE_ONBOARDED_KEY) === "true";
}

export function setEnterpriseOnboarded() {
  localStorage.setItem(ENTERPRISE_ONBOARDED_KEY, "true");
}

export function getEnterpriseProfile(): EnterpriseProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ENTERPRISE_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as EnterpriseProfile) : null;
  } catch {
    return null;
  }
}

export function saveEnterpriseProfile(profile: EnterpriseProfile) {
  localStorage.setItem(ENTERPRISE_PROFILE_KEY, JSON.stringify(profile));
}
