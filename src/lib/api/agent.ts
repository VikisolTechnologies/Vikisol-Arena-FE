import { apiFetch } from "./httpClient";
import { isRealMode } from "./mode";
import type { ChatMessage } from "@/lib/types";

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
  createdAt: string;
}

// Exact copy the backend also uses (AgentService.UNAVAILABLE_MESSAGE) - kept in sync manually
// since mock mode has no server round trip to source it from.
export const AGENT_UNAVAILABLE_MESSAGE =
  "The agent is temporarily unavailable. Your Arena account is still working normally.";

function toChatMessage(m: AgentMessageDto): ChatMessage {
  return { id: m.id, role: m.role, content: m.content, timestamp: m.createdAt };
}

export async function getOrCreateAgentConversation(): Promise<AgentConversationDto> {
  if (isRealMode()) return apiFetch<AgentConversationDto>("/agent/conversation");
  const now = new Date().toISOString();
  return { id: "local-agent-conversation", title: null, createdAt: now, updatedAt: now };
}

export async function getAgentMessages(conversationId: string): Promise<ChatMessage[]> {
  if (isRealMode()) {
    const messages = await apiFetch<AgentMessageDto[]>(`/agent/conversations/${conversationId}/messages`);
    return messages.map(toChatMessage);
  }
  // Mock/local-dev mode has no backend to persist against - always starts empty, same as a real
  // brand-new conversation would.
  return [];
}

export async function sendAgentMessage(conversationId: string, content: string): Promise<ChatMessage> {
  if (isRealMode()) {
    const message = await apiFetch<AgentMessageDto>(`/agent/conversations/${conversationId}/messages`, {
      method: "POST",
      body: { content },
    });
    return toChatMessage(message);
  }
  // No real AgentServiceClient exists in any environment yet (see AgentServiceClient's class
  // doc) - mock mode reports the same honest unavailable state real mode does, rather than a
  // second fake AI implementation.
  return { id: `local-${Date.now()}`, role: "agent", content: AGENT_UNAVAILABLE_MESSAGE, timestamp: new Date().toISOString() };
}
