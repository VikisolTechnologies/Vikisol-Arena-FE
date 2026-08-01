import type { ConsentSettings, Industry, OpenTo, Session } from "@/lib/types";

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
