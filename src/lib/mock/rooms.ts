import type { Room, RoomMember, RoomMessage } from "@/lib/types";
import { CURRENT_CANDIDATE_ID, getCandidateById, MOCK_CANDIDATES } from "@/lib/mock/candidates";

const other = getCandidateById(MOCK_CANDIDATES[5].id)!;
const me = getCandidateById(CURRENT_CANDIDATE_ID)!;

export const MOCK_ROOMS: Room[] = [
  {
    id: "room-1",
    postId: "post-1",
    postBody: "Badminton at 6pm today, Gachibowli - need 2 more for doubles",
    postIntentType: "activity",
    memberCount: 2,
    unread: true,
    lastMessageAt: new Date(Date.now() - 40 * 60000).toISOString(),
    lastMessagePreview: "6pm sharp, court's booked till 7:30.",
  },
];

export const MOCK_ROOM_MEMBERS: Record<string, RoomMember[]> = {
  "room-1": [
    { userId: me.id, name: me.name, emoji: me.avatarEmoji, role: "admin" },
    { userId: other.id, name: other.name, emoji: other.avatarEmoji, role: "member" },
  ],
};

export const MOCK_ROOM_MESSAGES: Record<string, RoomMessage[]> = {
  "room-1": [
    {
      id: "rm-1", roomId: "room-1", senderUserId: other.id, senderName: other.name, senderEmoji: other.avatarEmoji,
      fromMe: false, content: "Count me in - what time should we get there?",
      createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
    },
    {
      id: "rm-2", roomId: "room-1", senderUserId: me.id, senderName: me.name, senderEmoji: me.avatarEmoji,
      fromMe: true, content: "6pm sharp, court's booked till 7:30. Bring your own racket if you have one.",
      createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
    },
  ],
};
