import type { Conversation, ThreadMessage } from "@/lib/types";
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from "@/lib/mock/conversations";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";

const CONV_KEY = "arena_conversations";
const MSG_KEY = "arena_thread_messages";

function readConversations(): Conversation[] {
  if (typeof window === "undefined") return MOCK_CONVERSATIONS;
  try {
    const raw = localStorage.getItem(CONV_KEY);
    return raw ? JSON.parse(raw) : MOCK_CONVERSATIONS;
  } catch {
    return MOCK_CONVERSATIONS;
  }
}
function writeConversations(convs: Conversation[]) {
  localStorage.setItem(CONV_KEY, JSON.stringify(convs));
}

function readMessages(): ThreadMessage[] {
  if (typeof window === "undefined") return MOCK_MESSAGES;
  try {
    const raw = localStorage.getItem(MSG_KEY);
    return raw ? JSON.parse(raw) : MOCK_MESSAGES;
  } catch {
    return MOCK_MESSAGES;
  }
}
function writeMessages(msgs: ThreadMessage[]) {
  localStorage.setItem(MSG_KEY, JSON.stringify(msgs));
}

export async function getConversations(): Promise<Conversation[]> {
  if (isRealMode()) return apiFetch<Conversation[]>("/messages/conversations");
  const convs = readConversations();
  return delay([...convs].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()), 250);
}

export async function getThreadMessages(conversationId: string): Promise<ThreadMessage[]> {
  if (isRealMode()) return apiFetch<ThreadMessage[]>(`/messages/conversations/${conversationId}/messages`);
  return delay(readMessages().filter((m) => m.conversationId === conversationId), 200);
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
  if (isRealMode()) {
    return apiFetch<Conversation>("/messages/conversations", { method: "POST", body: { participantUserId: participantId, context } });
  }
  const convs = readConversations();
  const existing = convs.find((c) => c.participantId === participantId);
  if (existing) return delay(existing, 150);
  const conv: Conversation = {
    id: `conv-${Date.now()}`,
    participantId,
    participantName,
    participantEmoji,
    context,
    lastMessageAt: new Date().toISOString(),
    unread: false,
  };
  writeConversations([conv, ...convs]);
  return delay(conv, 300);
}

export async function sendThreadMessage(conversationId: string, content: string): Promise<ThreadMessage> {
  if (isRealMode()) {
    return apiFetch<ThreadMessage>(`/messages/conversations/${conversationId}/messages`, { method: "POST", body: { content } });
  }
  const msg: ThreadMessage = { id: `msg-${Date.now()}`, conversationId, fromMe: true, content, timestamp: new Date().toISOString() };
  writeMessages([...readMessages(), msg]);
  const convs = readConversations();
  writeConversations(convs.map((c) => (c.id === conversationId ? { ...c, lastMessageAt: msg.timestamp } : c)));
  return delay(msg, 200);
}

/** Simulated reply — used by the fake realtime emitter so threads occasionally feel alive.
 * Mock-only by nature: real mode's threads should only ever show genuine server-pushed
 * content, so this is a no-op there. */
export function receiveThreadReply(conversationId: string, content: string): ThreadMessage | null {
  if (isRealMode()) return null;
  const msg: ThreadMessage = { id: `msg-${Date.now()}-r`, conversationId, fromMe: false, content, timestamp: new Date().toISOString() };
  writeMessages([...readMessages(), msg]);
  const convs = readConversations();
  writeConversations(convs.map((c) => (c.id === conversationId ? { ...c, lastMessageAt: msg.timestamp, unread: true } : c)));
  return msg;
}
