"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { OrbLoader } from "@/components/ui/orb-loader";
import { HomeHeader } from "@/components/home-v3/HomeHeader";
import { HomeTabBar } from "@/components/home-v3/HomeTabBar";
import { ARENA_V3 } from "@/components/home-v3/tokens";
import { InboxRow } from "@/components/inbox-v3/InboxRow";
import { CreateComposer } from "@/components/create-v3/CreateComposer";
import { getMyProfile } from "@/lib/api/profile";
import { getMyRooms } from "@/lib/api/rooms";
import { getConversations, getOrCreateConversation } from "@/lib/api/messages";
import { getCandidateById } from "@/lib/mock/candidates";
import { requireOnboarded } from "@/lib/auth-guard";
import type { CandidateProfile, Conversation, Room } from "@/lib/types";

type Thread =
  | { kind: "room"; id: string; sortAt: string; room: Room }
  | { kind: "person" | "job"; id: string; sortAt: string; conversation: Conversation };

function InboxContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const withParam = searchParams.get("with");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [search, setSearch] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
    getMyRooms().then(setRooms);
    getConversations().then(setConversations);
  }, [router]);

  // Arriving from a "message this person" link elsewhere (e.g. the Talent view) - open or
  // create the real conversation, then go straight to its thread.
  useEffect(() => {
    if (!withParam) return;
    const candidate = getCandidateById(withParam);
    getOrCreateConversation(withParam, candidate?.name ?? "New contact", candidate?.avatarEmoji ?? "🧑").then((conv) => {
      router.replace(`/messages/${conv.id}`);
    });
  }, [withParam, router]);

  const threads: Thread[] = [
    ...(rooms ?? []).map((room): Thread => ({ kind: "room", id: room.id, sortAt: room.lastMessageAt, room })),
    ...(conversations ?? []).map((c): Thread => ({ kind: c.context ? "job" : "person", id: c.id, sortAt: c.lastMessageAt, conversation: c })),
  ].sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime());

  const filtered = threads.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.kind === "room" ? t.room.postBody.toLowerCase().includes(q) : t.conversation.participantName.toLowerCase().includes(q);
  });

  const loading = rooms === null || conversations === null;

  return (
    <div style={{ background: ARENA_V3.ivory, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <HomeHeader profile={profile} onCompose={() => setComposerOpen(true)} />

      <div style={{ flex: 1, paddingBottom: "calc(84px + env(safe-area-inset-bottom))" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "18px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 10, letterSpacing: 3, color: ARENA_V3.muted }}>INBOX</p>
            <Search size={17} strokeWidth={1.75} color={ARENA_V3.ink} />
          </div>

          <div style={{ padding: "0 20px" }}>
            <p style={{ margin: 0, fontFamily: "var(--font-arena-fraunces)", fontSize: 28, color: ARENA_V3.ink }}>Conversations</p>
            <div style={{ width: 40, height: 2, background: ARENA_V3.gold, margin: "14px 0 18px" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations"
              style={{ width: "100%", fontSize: 13, color: ARENA_V3.ink, background: ARENA_V3.white, border: "none", borderRadius: 10, padding: "10px 14px", outline: "none", marginBottom: 16 }}
            />
          </div>

          <div style={{ margin: "0 12px 12px" }}>
            {loading ? (
              <OrbLoader className="h-64" />
            ) : filtered.length === 0 ? (
              <div style={{ background: ARENA_V3.white, borderRadius: 14, padding: "28px 20px", textAlign: "center" }}>
                <p style={{ margin: "0 0 8px", fontSize: 15, color: ARENA_V3.ink }}>
                  {search.trim() ? "No conversations match that search" : "Nothing here yet"}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: ARENA_V3.muted, lineHeight: 1.6 }}>
                  Join an activity or need to start a room, or message someone from their profile.
                </p>
              </div>
            ) : (
              <div style={{ background: ARENA_V3.white, borderRadius: 14, overflow: "hidden" }}>
                {filtered.map((t) =>
                  t.kind === "room" ? (
                    <InboxRow
                      key={t.id}
                      href={`/rooms/${t.room.id}`}
                      kind="room"
                      name={t.room.postBody}
                      title={t.room.postBody}
                      subtitle={`${t.room.memberCount} in room${t.room.lastMessagePreview ? ` · ${t.room.lastMessagePreview}` : ""}`}
                      timestamp={t.room.lastMessageAt}
                      unread={t.room.unread}
                    />
                  ) : (
                    <InboxRow
                      key={t.id}
                      href={`/messages/${t.conversation.id}`}
                      kind={t.kind}
                      name={t.conversation.participantName}
                      title={t.conversation.participantName}
                      subtitle={t.conversation.context || "Direct message"}
                      timestamp={t.conversation.lastMessageAt}
                      unread={t.conversation.unread}
                    />
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <HomeTabBar onCompose={() => setComposerOpen(true)} />
      <CreateComposer open={composerOpen} onOpenChange={setComposerOpen} onPublished={() => {}} />
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<OrbLoader className="h-96" />}>
      <InboxContent />
    </Suspense>
  );
}
