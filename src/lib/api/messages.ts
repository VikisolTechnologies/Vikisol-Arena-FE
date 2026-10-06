import type { Conversation, ThreadMessage } from "@/lib/types";
import { apiFetch } from "./httpClient";

export async function getConversations(): Promise<Conversation[]> {
  return apiFetch<Conversation[]>("/messages/conversations");
}

export async function getThreadMessages(conversationId: string): Promise<ThreadMessage[]> {
  return apiFetch<ThreadMessage[]>(`/messages/conversations/${conversationId}/messages`);
}

/** participantName/participantEmoji are mock-only display data the caller fabricates for a
 * brand-new thread; real mode ignores them and returns whatever the server resolves for the
 * real participant user record instead. */
export async function getOrCreateConversation(
  participantId: string,
  participantName: string,
  participantEmoji: string,
  context?: string,
): Promise<Conversation> {
  return apiFetch<Conversation>("/messages/conversations", { method: "POST", body: { participantUserId: participantId, context } });
}

/**
 * Message a post's author (works for an anonymous post without revealing them) or a person, with
 * the option to hide yourself. Real mode only - anonymous chats need the server to keep the
 * identities apart.
 */
export function startChat(input: { postId?: string; participantUserId?: string; anonymous?: boolean; context?: string }): Promise<Conversation> {
  return apiFetch<Conversation>("/messages/conversations", { method: "POST", body: input });
}

export function closeChat(conversationId: string): Promise<Conversation> {
  return apiFetch<Conversation>(`/messages/conversations/${conversationId}/close`, { method: "POST" });
}

export async function reportChat(conversationId: string, reason?: string): Promise<void> {
  await apiFetch<void>(`/messages/conversations/${conversationId}/report`, { method: "POST", body: { reason } });
}

export async function sendThreadMessage(conversationId: string, content: string): Promise<ThreadMessage> {
  return apiFetch<ThreadMessage>(`/messages/conversations/${conversationId}/messages`, { method: "POST", body: { content } });
}
