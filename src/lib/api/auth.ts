import type { Role, Session } from "@/lib/types";
import { CURRENT_CANDIDATE_ID, getCandidateById } from "@/lib/mock/candidates";
import { setSession, clearSession, getSession } from "@/lib/session";
import { delay } from "./shared";

// Mock auth: any email/password combination succeeds. Real backend swap replaces the
// body of these two functions only — call sites don't change.
export async function signIn(email: string, _password: string, role: Role): Promise<Session> {
  const name = role === "talent" ? getCandidateById(CURRENT_CANDIDATE_ID)?.name ?? "You" : "Enterprise Admin";
  const session: Session = { role, name, email, candidateId: role === "talent" ? CURRENT_CANDIDATE_ID : undefined };
  setSession(session);
  return delay(session, 600);
}

export async function signUp(name: string, email: string, _password: string, role: Role): Promise<Session> {
  const session: Session = { role, name, email, candidateId: role === "talent" ? CURRENT_CANDIDATE_ID : undefined };
  setSession(session);
  return delay(session, 600);
}

export async function signOut(): Promise<void> {
  clearSession();
  return delay(undefined, 150);
}

export async function getCurrentSession(): Promise<Session | null> {
  return delay(getSession(), 50);
}
