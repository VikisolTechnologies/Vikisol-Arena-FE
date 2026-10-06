import type { Room, RoomMember, RoomMessage } from "@/lib/types";
import { apiFetch } from "./httpClient";

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
