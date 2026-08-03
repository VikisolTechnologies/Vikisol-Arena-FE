import type { Role, Session } from "@/lib/types";
import { CURRENT_CANDIDATE_ID, getCandidateById } from "@/lib/mock/candidates";
import { setSession, clearSession, getSession } from "@/lib/session";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch, setToken, clearToken } from "./httpClient";

interface SessionResponse {
  role: string;
  candidateId: string | null;
  name: string;
  email: string;
  token: string;
}

function toSession(res: SessionResponse): Session {
  return {
    role: res.role.toLowerCase() as Role,
    name: res.name,
    email: res.email,
    candidateId: res.candidateId ?? undefined,
  };
}

export async function signIn(email: string, password: string, role: Role): Promise<Session> {
  if (isRealMode()) {
    const res = await apiFetch<SessionResponse>("/auth/signin", { method: "POST", auth: false, body: { email, password } });
    setToken(res.token);
    const session = toSession(res);
    setSession(session);
    return session;
  }
  const name = role === "talent" ? getCandidateById(CURRENT_CANDIDATE_ID)?.name ?? "You" : "Enterprise Admin";
  const session: Session = { role, name, email, candidateId: role === "talent" ? CURRENT_CANDIDATE_ID : undefined };
  setSession(session);
  return delay(session, 600);
}

export async function signUp(name: string, email: string, password: string, role: Role): Promise<Session> {
  if (isRealMode()) {
    const res = await apiFetch<SessionResponse>("/auth/signup", { method: "POST", auth: false, body: { name, email, password, role } });
    setToken(res.token);
    const session = toSession(res);
    setSession(session);
    return session;
  }
  const session: Session = { role, name, email, candidateId: role === "talent" ? CURRENT_CANDIDATE_ID : undefined };
  setSession(session);
  return delay(session, 600);
}

export async function signOut(): Promise<void> {
  if (isRealMode()) {
    clearToken();
    clearSession();
    return;
  }
  clearSession();
  return delay(undefined, 150);
}

export async function getCurrentSession(): Promise<Session | null> {
  return delay(getSession(), 50);
}
