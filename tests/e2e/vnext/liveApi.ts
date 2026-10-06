const API = process.env.ARENA_API_BASE_URL || "https://api-arena.vikisol.in/api/v1";

export type Session = {
  token: string;
  name: string;
  email: string;
  role: string;
};

type Envelope<T> = { success: boolean; message: string | null; data: T };

export async function api<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API}${path}`, { ...init, headers });
  const text = await response.text();
  const body = text ? (JSON.parse(text) as Envelope<T> & { message?: string }) : null;
  if (!response.ok) {
    throw new Error(`${init.method || "GET"} ${path} -> ${response.status} ${body?.message || ""}`.trim());
  }
  return (body?.data ?? null) as T;
}

export async function signUp(name: string, email: string, password: string): Promise<Session> {
  const data = await api<{ token: string; name: string; email: string; role: string }>("/auth/signup", null, {
    method: "POST",
    body: JSON.stringify({ name, email, password, role: "talent" }),
  });
  return { token: data.token, name: data.name, email: data.email, role: data.role };
}

export async function signIn(email: string, password: string): Promise<Session> {
  const data = await api<{ token: string; name: string; email: string; role: string }>("/auth/signin", null, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return { token: data.token, name: data.name, email: data.email, role: data.role };
}

export async function setDateOfBirth(token: string) {
  await api("/verification/date-of-birth", token, {
    method: "PUT",
    body: JSON.stringify({ dateOfBirth: "1992-04-15" }),
  });
}

export async function createActivity(token: string, body: string, startsAt: string) {
  return api<{ id: string; roomId?: string | null }>("/posts", token, {
    method: "POST",
    body: JSON.stringify({
      intentType: "activity",
      title: body.slice(0, 80),
      body,
      audience: "global",
      visibility: "public",
      startsAt,
      tags: [],
      mediaUrls: [],
    }),
  });
}

export async function removePost(token: string, id: string): Promise<"deleted" | "cancelled" | "closed"> {
  try {
    await api(`/posts/${id}`, token, { method: "DELETE" });
    return "deleted";
  } catch (deleteError) {
    try {
      await api(`/posts/${id}/cancel`, token, { method: "PUT" });
      return "cancelled";
    } catch (cancelError) {
      const message = cancelError instanceof Error ? cancelError.message : "";
      if (message.includes("already closed")) return "closed";
      throw deleteError;
    }
  }
}

export async function eraseAccount(token: string) {
  await api("/profile/me", token, { method: "DELETE" });
}
