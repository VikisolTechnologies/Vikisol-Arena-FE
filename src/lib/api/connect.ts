import { apiFetch } from "./httpClient";

/**
 * MARATHON-FE-2 Step B item 4. Reaching out to someone found through talent search sends a
 * connect request they accept or decline; messaging them opens only once accepted (or once they
 * apply) — `ConnectController`/`ConnectService`/`MessagingPolicy` (backend), FE-API-GAPS row 34.
 * This had no frontend code at all before Step B.
 */
export type ConnectRequestStatus = "pending" | "accepted" | "declined";

export interface ConnectView {
  id: string;
  companyId: string;
  companyName: string;
  companyEmoji?: string;
  companyVerified: boolean;
  jobId?: string;
  jobTitle?: string;
  note: string;
  status: ConnectRequestStatus;
  createdAt: string;
  conversationId?: string;
}

/** Employer side: send a connect request to a talent-search candidate. */
export async function sendConnectRequest(candidateId: string, note: string, jobId?: string): Promise<ConnectView | undefined> {
  return apiFetch<ConnectView>(`/enterprise/talent/${candidateId}/connect`, { method: "POST", body: { jobId, note } });
}

/** Candidate side: every request sent to them, newest first. A bare array (PageLimits.ok), not
 * a PagedResponse - its paging state travels in X-Total-Count/X-Has-More headers instead, which
 * this call site doesn't need yet. */
export async function getMyConnectRequests(page = 0, size = 20): Promise<ConnectView[]> {
  return apiFetch<ConnectView[]>("/connect-requests", { query: { page, size } });
}

export async function acceptConnectRequest(id: string): Promise<ConnectView | undefined> {
  return apiFetch<ConnectView>(`/connect-requests/${id}/accept`, { method: "POST" });
}

export async function declineConnectRequest(id: string): Promise<ConnectView | undefined> {
  return apiFetch<ConnectView>(`/connect-requests/${id}/decline`, { method: "POST" });
}
