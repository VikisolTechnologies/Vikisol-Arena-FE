import type { Room, RoomMember, RoomMessage } from "@/lib/types";
import { MOCK_ROOMS, MOCK_ROOM_MEMBERS, MOCK_ROOM_MESSAGES } from "@/lib/mock/rooms";
import { CURRENT_CANDIDATE_ID, getCandidateById } from "@/lib/mock/candidates";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";

const ROOMS_KEY = "arena_rooms";
const MEMBERS_KEY = "arena_room_members";
const MESSAGES_KEY = "arena_room_messages";

function readRooms(): Room[] {
  if (typeof window === "undefined") return MOCK_ROOMS;
  try {
    const raw = localStorage.getItem(ROOMS_KEY);
    return raw ? (JSON.parse(raw) as Room[]) : MOCK_ROOMS;
  } catch {
    return MOCK_ROOMS;
  }
}
function writeRooms(rooms: Room[]) {
  localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
}

function readMembers(): Record<string, RoomMember[]> {
  if (typeof window === "undefined") return MOCK_ROOM_MEMBERS;
  try {
    const raw = localStorage.getItem(MEMBERS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, RoomMember[]>) : MOCK_ROOM_MEMBERS;
  } catch {
    return MOCK_ROOM_MEMBERS;
  }
}
function readMessages(): Record<string, RoomMessage[]> {
  if (typeof window === "undefined") return MOCK_ROOM_MESSAGES;
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, RoomMessage[]>) : MOCK_ROOM_MESSAGES;
  } catch {
    return MOCK_ROOM_MESSAGES;
  }
}
function writeMessages(messages: Record<string, RoomMessage[]>) {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

export async function getMyRooms(): Promise<Room[]> {
  if (isRealMode()) return apiFetch<Room[]>("/rooms");
  return delay([...readRooms()].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()), 250);
}

export async function getRoomMessages(roomId: string): Promise<RoomMessage[]> {
  if (isRealMode()) return apiFetch<RoomMessage[]>(`/rooms/${roomId}/messages`);
  return delay(readMessages()[roomId] ?? [], 200);
}

export async function getRoomMembers(roomId: string): Promise<RoomMember[]> {
  if (isRealMode()) return apiFetch<RoomMember[]>(`/rooms/${roomId}/members`);
  return delay(readMembers()[roomId] ?? [], 200);
}

export async function sendRoomMessage(roomId: string, content: string): Promise<RoomMessage> {
  if (isRealMode()) return apiFetch<RoomMessage>(`/rooms/${roomId}/messages`, { method: "POST", body: { content } });
  const me = getCandidateById(CURRENT_CANDIDATE_ID);
  const message: RoomMessage = {
    id: `rm-${Date.now()}`,
    roomId,
    senderUserId: CURRENT_CANDIDATE_ID,
    senderName: me?.name ?? "You",
    senderEmoji: me?.avatarEmoji ?? "🧑🏽",
    fromMe: true,
    content,
    createdAt: new Date().toISOString(),
  };
  const messages = readMessages();
  writeMessages({ ...messages, [roomId]: [...(messages[roomId] ?? []), message] });
  writeRooms(readRooms().map((r) => (r.id === roomId
    ? { ...r, lastMessageAt: message.createdAt, lastMessagePreview: content.length > 80 ? content.slice(0, 80) + "…" : content }
    : r)));
  return delay(message, 200);
}

export async function markRoomRead(roomId: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>(`/rooms/${roomId}/read`, { method: "PUT" });
    return;
  }
  writeRooms(readRooms().map((r) => (r.id === roomId ? { ...r, unread: false } : r)));
}

export async function reportRoom(roomId: string, reason: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>(`/rooms/${roomId}/report`, { method: "POST", body: { reason } });
    return;
  }
  // Mock mode has no moderation backend to write to - the report control still works (confirms
  // to the user) but there's nothing durable to persist locally either, same as real mode's own
  // "no queue reads this yet" scope for Phase A.
  await delay(undefined, 200);
}
