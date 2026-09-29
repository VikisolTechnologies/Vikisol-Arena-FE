import type { Room, RoomMember, RoomMessage } from "@/lib/types";
import { CURRENT_CANDIDATE_ID, getCandidateById, MOCK_CANDIDATES } from "@/lib/mock/candidates";

const other = getCandidateById(MOCK_CANDIDATES[5].id)!;
const ravi = getCandidateById(MOCK_CANDIDATES[5].id)!;
const me = getCandidateById(CURRENT_CANDIDATE_ID)!;

export const MOCK_ROOMS: Room[] = [
  {
    id: "room-1",
    postId: "post-1",
    postBody: "Badminton doubles tonight",
    postIntentType: "activity",
    memberCount: 2,
    unread: true,
    muted: false,
    postStatus: "open",
    lastMessageAt: new Date(Date.now() - 40 * 60000).toISOString(),
    lastMessagePreview: "6pm sharp, court's booked till 7:30.",
  },
  {
    id: "room-sofa",
    postId: "post-sofa",
    postBody: "Help move a sofa",
    postIntentType: "ask",
    memberCount: 2,
    unread: false,
    muted: false,
    postStatus: "open",
    lastMessageAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    lastMessagePreview: "Tomorrow 5 pm works. I'll bring a friend.",
  },
];

export const MOCK_ROOM_MEMBERS: Record<string, RoomMember[]> = {
  "room-sofa": [
    { userId: ravi.id, name: ravi.name, emoji: ravi.avatarEmoji, role: "admin" },
    { userId: me.id, name: me.name, emoji: me.avatarEmoji, role: "member" },
  ],
  "room-1": [
    { userId: me.id, name: me.name, emoji: me.avatarEmoji, role: "admin" },
    { userId: other.id, name: other.name, emoji: other.avatarEmoji, role: "member" },
  ],
};

export const MOCK_ROOM_MESSAGES: Record<string, RoomMessage[]> = {
  "room-sofa": [
    {
      id: "rs-1", roomId: "room-sofa", senderUserId: ravi.id, senderName: ravi.name, senderEmoji: ravi.avatarEmoji,
      fromMe: false, content: "Thanks for offering! It's a 3-seater, first floor, no lift.",
      createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    },
    {
      id: "rs-2", roomId: "room-sofa", senderUserId: me.id, senderName: me.name, senderEmoji: me.avatarEmoji,
      fromMe: true, content: "Tomorrow 5 pm works. I'll bring a friend.",
      createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    },
  ],
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
