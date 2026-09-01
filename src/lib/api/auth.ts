import type { Role, Session } from "@/lib/types";
import { CURRENT_CANDIDATE_ID, getCandidateById } from "@/lib/mock/candidates";
import { getSession, setSession, clearSession, setOnboarded, setEnterpriseOnboarded } from "@/lib/session";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch, setToken, clearToken } from "./httpClient";
import { getMyProfile } from "./profile";
import { getMyEnterpriseProfile } from "./enterprise";

interface SessionResponse {
  role: string | null;
  candidateId: string | null;
  name: string | null;
  email: string | null;
  token: string | null;
  mfaRequired: boolean;
  mfaPendingToken: string | null;
}

function toSession(res: SessionResponse): Session {
  return {
    role: (res.role as string).toLowerCase() as Role,
    name: res.name as string,
    email: res.email as string,
    candidateId: res.candidateId ?? undefined,
  };
}

// A password check can succeed but still not be enough to sign in - see DECISIONS.md's 2FA flow.
// The auth page branches on `status` to show either a redirect (immediate) or a code-entry step.
export type SignInResult =
  | { status: "success"; session: Session }
  | { status: "mfa_required"; pendingToken: string };

/** Real mode's "onboarded" flag is purely local (localStorage), same as mock mode, but real
 * accounts can already be fully set up server-side on first login in this browser (any seeded
 * demo account, or a returning user on a new device) - so a fresh sign-in has to infer it from
 * the fetched profile's actual completeness instead of defaulting to "not onboarded" and
 * bouncing an already-set-up account into the wizard every time. Sign-up skips this: a brand
 * new account never has anything to infer from. */
async function syncOnboardedFromProfile(role: Role) {
  try {
    if (role === "talent") {
      const profile = await getMyProfile();
      if (profile.skills.length > 0) setOnboarded();
    } else if (role === "company_admin" || role === "recruiter") {
      const profile = await getMyEnterpriseProfile();
      if (profile?.companyName) setEnterpriseOnboarded();
    }
    // hiring_manager has no company profile to manage (its /admin dashboard isn't behind the
    // enterprise-onboarding gate) and platform_admin has no tenant at all - nothing to sync.
  } catch {
    // Leave onboarded state as-is - the relevant page's own guard will route correctly either way.
  }
}

export async function signIn(email: string, password: string, role: Role): Promise<SignInResult> {
  if (isRealMode()) {
    const res = await apiFetch<SessionResponse>("/auth/signin", { method: "POST", auth: false, body: { email, password } });
    if (res.mfaRequired) {
      return { status: "mfa_required", pendingToken: res.mfaPendingToken as string };
    }
    setToken(res.token as string);
    const session = toSession(res);
    setSession(session);
    await syncOnboardedFromProfile(session.role);
    return { status: "success", session };
  }
  // Mock mode has no 2FA concept - every seeded demo account in real mode starts without it
  // enabled too (enrollment is opt-in, see DECISIONS.md), so this branch is unreachable there.
  const session: Session = { role, name: mockNameFor(role), email, candidateId: role === "talent" ? CURRENT_CANDIDATE_ID : undefined };
  setSession(session);
  return { status: "success", session: await delay(session, 600) };
}

// Second step of the 2FA flow (see DECISIONS.md) - only reachable after signIn() returned
// "mfa_required". auth:false because the caller doesn't have a real session yet - the
// pendingToken (not a Bearer access token) is what proves who they are at this step.
export async function verifyMfa(pendingToken: string, code: string): Promise<Session> {
  const res = await apiFetch<SessionResponse>("/auth/2fa/verify", { method: "POST", auth: false, body: { pendingToken, code } });
  setToken(res.token as string);
  const session = toSession(res);
  setSession(session);
  await syncOnboardedFromProfile(session.role);
  return session;
}

function mockNameFor(role: Role): string {
  switch (role) {
    case "talent": return getCandidateById(CURRENT_CANDIDATE_ID)?.name ?? "You";
    case "company_admin": return "Enterprise Admin";
    case "recruiter": return "Priyanka Rao";
    case "hiring_manager": return "Karthik Iyer";
    case "platform_admin": return "Vikisol Platform Admin";
  }
}

export async function signUp(name: string, email: string, password: string, role: Role): Promise<Session> {
  if (isRealMode()) {
    const res = await apiFetch<SessionResponse>("/auth/signup", { method: "POST", auth: false, body: { name, email, password, role } });
    setToken(res.token as string);
    const session = toSession(res);
    setSession(session);
    return session;
  }
  const session: Session = { role, name, email, candidateId: role === "talent" ? CURRENT_CANDIDATE_ID : undefined };
  setSession(session);
  return delay(session, 600);
}

// --- Phone number sign-in (existing, already-verified accounts) ---

export async function requestPhoneSigninOtp(phoneNumber: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>("/auth/phone/signin/request-otp", { method: "POST", auth: false, body: { phoneNumber } });
    return;
  }
  await delay(undefined, 400);
}

export async function verifyPhoneSigninOtp(phoneNumber: string, code: string): Promise<SignInResult> {
  if (isRealMode()) {
    const res = await apiFetch<SessionResponse>("/auth/phone/signin/verify-otp", { method: "POST", auth: false, body: { phoneNumber, code } });
    if (res.mfaRequired) {
      return { status: "mfa_required", pendingToken: res.mfaPendingToken as string };
    }
    setToken(res.token as string);
    const session = toSession(res);
    setSession(session);
    await syncOnboardedFromProfile(session.role);
    return { status: "success", session };
  }
  const session: Session = { role: "talent", name: mockNameFor("talent"), email: "", candidateId: CURRENT_CANDIDATE_ID };
  setSession(session);
  return { status: "success", session: await delay(session, 400) };
}

// --- Phone number signup (brand-new TALENT account) ---

export async function requestPhoneSignupOtp(phoneNumber: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>("/auth/phone/signup/request-otp", { method: "POST", auth: false, body: { phoneNumber } });
    return;
  }
  await delay(undefined, 400);
}

export async function verifyPhoneSignupOtp(phoneNumber: string, code: string, name: string): Promise<Session> {
  if (isRealMode()) {
    const res = await apiFetch<SessionResponse>("/auth/phone/signup/verify-otp", { method: "POST", auth: false, body: { phoneNumber, code, name } });
    setToken(res.token as string);
    const session = toSession(res);
    setSession(session);
    return session;
  }
  const session: Session = { role: "talent", name, email: "", candidateId: CURRENT_CANDIDATE_ID };
  setSession(session);
  return delay(session, 400);
}

// --- Google sign-in/signup (find-or-create) ---

export async function signInWithGoogle(idToken: string): Promise<SignInResult> {
  if (isRealMode()) {
    const res = await apiFetch<SessionResponse>("/auth/google", { method: "POST", auth: false, body: { idToken } });
    if (res.mfaRequired) {
      return { status: "mfa_required", pendingToken: res.mfaPendingToken as string };
    }
    setToken(res.token as string);
    const session = toSession(res);
    setSession(session);
    await syncOnboardedFromProfile(session.role);
    return { status: "success", session };
  }
  const session: Session = { role: "talent", name: mockNameFor("talent"), email: "", candidateId: CURRENT_CANDIDATE_ID };
  setSession(session);
  return { status: "success", session: await delay(session, 400) };
}

// --- Account settings ---

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });
    return;
  }
  await delay(undefined, 400);
}

export async function changeEmail(newEmail: string, currentPassword: string): Promise<Session> {
  if (isRealMode()) {
    const res = await apiFetch<SessionResponse>("/auth/change-email", { method: "POST", body: { newEmail, currentPassword } });
    setToken(res.token as string);
    const session = toSession(res);
    setSession(session);
    return session;
  }
  await delay(undefined, 400);
  const session = getSession();
  if (!session) throw new Error("Not signed in");
  const updated = { ...session, email: newEmail };
  setSession(updated);
  return updated;
}

export async function signOut(): Promise<void> {
  if (isRealMode()) {
    // Was client-discard-only - the access token stayed valid server-side until its natural
    // 15min expiry even after "signing out." POST /auth/signout denylists it immediately and
    // revokes the refresh cookie (see AuthController) - the actual point of building a
    // server-side denylist in the first place.
    await apiFetch<void>("/auth/signout", { method: "POST" }).catch(() => {});
    clearToken();
    clearSession();
    return;
  }
  clearSession();
  return delay(undefined, 150);
}

