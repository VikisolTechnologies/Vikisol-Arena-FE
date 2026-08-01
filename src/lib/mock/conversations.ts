import type { Conversation, ThreadMessage } from "@/lib/types";

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1", participantId: "ext-1", participantName: "Techolution HR", participantEmoji: "🟢",
    context: "Senior React Developer", lastMessageAt: new Date(Date.now() - 20 * 60000).toISOString(), unread: true,
  },
  {
    id: "conv-2", participantId: "ext-2", participantName: "Innova Solutions", participantEmoji: "🔵",
    context: "Interview follow-up", lastMessageAt: new Date(Date.now() - 3 * 3600000).toISOString(), unread: false,
  },
  {
    id: "conv-3", participantId: "cand-2", participantName: "Priya Sharma", participantEmoji: "👩🏽",
    context: "Food delivery app bid", lastMessageAt: new Date(Date.now() - 8 * 3600000).toISOString(), unread: false,
  },
  {
    id: "conv-4", participantId: "ext-3", participantName: "Swiggy Recruiting", participantEmoji: "🟠",
    context: "Backend Developer", lastMessageAt: new Date(Date.now() - 26 * 3600000).toISOString(), unread: false,
  },
];

export const MOCK_MESSAGES: ThreadMessage[] = [
  { id: "m-1", conversationId: "conv-1", fromMe: false, content: "Hi! We loved your application — do you have 15 min this week?", timestamp: new Date(Date.now() - 25 * 60000).toISOString() },
  { id: "m-2", conversationId: "conv-1", fromMe: true, content: "Yes, happy to chat. Tuesday works well for me.", timestamp: new Date(Date.now() - 21 * 60000).toISOString() },
  { id: "m-3", conversationId: "conv-1", fromMe: false, content: "Perfect, we'd love to see your portfolio too if you have one.", timestamp: new Date(Date.now() - 20 * 60000).toISOString() },

  { id: "m-4", conversationId: "conv-2", fromMe: false, content: "Thanks for the interview yesterday — we'll be in touch by Friday.", timestamp: new Date(Date.now() - 3 * 3600000).toISOString() },

  { id: "m-5", conversationId: "conv-3", fromMe: true, content: "Hi Priya, saw your bid on the food delivery app project — really strong portfolio.", timestamp: new Date(Date.now() - 9 * 3600000).toISOString() },
  { id: "m-6", conversationId: "conv-3", fromMe: false, content: "Thank you! Happy to walk through the approach if useful.", timestamp: new Date(Date.now() - 8 * 3600000).toISOString() },

  { id: "m-7", conversationId: "conv-4", fromMe: false, content: "Your assessment score was excellent. Are you still open to full-time roles?", timestamp: new Date(Date.now() - 26 * 3600000).toISOString() },
];
