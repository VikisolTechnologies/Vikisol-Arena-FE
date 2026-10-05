import type { Room, RoomMember, RoomMessage } from "@/lib/types";
import { MOCK_ROOMS, MOCK_ROOM_MEMBERS, MOCK_ROOM_MESSAGES } from "@/lib/mock/rooms";
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
  return apiFetch<Room[]>("/rooms");
}

export async function getRoomMessages(roomId: string): Promise<RoomMessage[]> {
  return apiFetch<RoomMessage[]>(`/rooms/${roomId}/messages`);
}

export async function getRoomMembers(roomId: string): Promise<RoomMember[]> {
  return apiFetch<RoomMember[]>(`/rooms/${roomId}/members`);
}

export async function sendRoomMessage(roomId: string, content: string): Promise<RoomMessage> {
  return apiFetch<RoomMessage>(`/rooms/${roomId}/messages`, { method: "POST", body: { content } });
}

export async function setRoomMuted(roomId: string, muted: boolean): Promise<void> {
  await apiFetch<void>(`/rooms/${roomId}/${muted ? "mute" : "unmute"}`, { method: "PUT" });
  return;
}

export async function markRoomRead(roomId: string): Promise<void> {
  await apiFetch<void>(`/rooms/${roomId}/read`, { method: "PUT" });
  return;
}

export async function reportRoom(roomId: string, reason: string): Promise<void> {
  await apiFetch<void>(`/rooms/${roomId}/report`, { method: "POST", body: { reason } });
  return;
}

// §4 safety-audit fix: "creator can remove anyone" - previously entirely unbuilt. Only the
// room's own admin (the post's author) can call this successfully; the backend enforces that,
// this is just the client call.
export async function removeRoomMember(roomId: string, userId: string): Promise<void> {
  await apiFetch<void>(`/rooms/${roomId}/members/${userId}`, { method: "DELETE" });
  return;
}
