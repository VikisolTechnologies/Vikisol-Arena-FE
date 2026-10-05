import { apiFetch } from "./httpClient";
import type { ChatMessage, AgentAction } from "@/lib/types";

// The old /agent page kept its whole conversation in React state, built with buildReply() - a
// keyword matcher (t.includes("apply"), t.includes("bid")...) that was never a real AI, just a
// hardcoded response dictionary. It's been removed. This client talks to arena-api's real
// com.vikisol.arena.agent module instead, which persists conversations/messages server-side and
// is honest when there's no real agent backend configured (see AgentServiceClient's class doc) -
// it returns a serviceUnavailable message rather than a fabricated reply.

export interface AgentConversationDto {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AgentMessageDto {
  id: string;
  role: "user" | "agent";
  content: string;
  serviceUnavailable: boolean;
  actions?: AgentAction[];
  createdAt: string;
}

// Exact copy the backend also uses (AgentService.UNAVAILABLE_MESSAGE) - kept in sync manually
// since mock mode has no server round trip to source it from.
export const AGENT_UNAVAILABLE_MESSAGE =
  "The agent is temporarily unavailable. Your Arena account is still working normally.";

function toChatMessage(m: AgentMessageDto): ChatMessage {
  return { id: m.id, role: m.role, content: m.content, timestamp: m.createdAt, actions: m.actions ?? [], serviceUnavailable: m.serviceUnavailable };
}

export async function getOrCreateAgentConversation(): Promise<AgentConversationDto> {
  return apiFetch<AgentConversationDto>("/agent/conversation");
}

export async function getAgentMessages(conversationId: string): Promise<ChatMessage[]> {
  const messages = await apiFetch<AgentMessageDto[]>(`/agent/conversations/${conversationId}/messages`);
  return messages.map(toChatMessage);
}

export async function sendAgentMessage(conversationId: string, content: string): Promise<ChatMessage> {
  const message = await apiFetch<AgentMessageDto>(`/agent/conversations/${conversationId}/messages`, {
    method: "POST",
    body: { content },
    timeoutMs: 65_000,
  });
  return toChatMessage(message);
}

/** Only the backend-owned proposal ID is accepted. The browser never submits executable args. */
export async function decideAgentAction(actionId: string, approve: boolean): Promise<AgentAction> {
  return apiFetch<AgentAction>(`/agent/actions/${encodeURIComponent(actionId)}`, {
    method: "POST", body: { approve }, timeoutMs: 30_000,
  });
}
