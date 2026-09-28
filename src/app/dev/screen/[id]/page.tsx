"use client";

import { notFound, useParams } from "next/navigation";
import { ActivityScreen } from "@/components/activity/ActivityScreen";
import { RoomScreen } from "@/components/activity/RoomScreen";
import { NeedScreen } from "@/components/needs/NeedScreen";
import { ConversationScreen } from "@/components/inbox/ConversationScreen";
import { ReportSheet } from "@/components/trust/ReportSheet";
import { AppShell } from "@/components/bplus/AppShell";
import { Button } from "@/components/bplus/Button";
import { StateCard } from "@/components/bplus/Primitives";
import { FIXTURES_ALLOWED } from "@/lib/data/mode";
import { SPECIMEN_ACTIVITY, SPECIMEN_APPROVED, SPECIMEN_CONVERSATION, SPECIMEN_NEED, SPECIMEN_NEED_ROOM, SPECIMEN_OFFERER, SPECIMEN_OFFERS, SPECIMEN_PENDING, SPECIMEN_ROOM } from "@/lib/dev/specimens";

/** Compare-page specimens: the real screen components with fixed fictional data, for screens
 *  whose live route needs a real record id. Buttons still call the real API (and will fail
 *  honestly against these fake ids). */
export default function SpecimenPage() {
  const { id } = useParams<{ id: string }>();
  if (!FIXTURES_ALLOWED) notFound();
  switch (id) {
    case "activity-details":
      return <ActivityScreen post={SPECIMEN_ACTIVITY} />;
    case "join-sent":
      return <ActivityScreen post={SPECIMEN_PENDING} sentOpen />;
    case "approved-ready":
      return <ActivityScreen post={SPECIMEN_APPROVED} />;
    case "activity-room":
      return <RoomScreen roomId={SPECIMEN_ROOM.room.id} specimen={SPECIMEN_ROOM} />;
    case "need-page":
      return <NeedScreen post={SPECIMEN_NEED} specimen={{ offers: SPECIMEN_OFFERS }} />;
    case "offer-details":
      return <NeedScreen post={SPECIMEN_NEED} specimen={{ offers: SPECIMEN_OFFERS, openOfferId: "o1", profile: SPECIMEN_OFFERER }} />;
    case "coordination-room":
      return <RoomScreen roomId={SPECIMEN_NEED_ROOM.room.id} specimen={SPECIMEN_NEED_ROOM} />;
    case "mark-completed":
      return <RoomScreen roomId={SPECIMEN_NEED_ROOM.room.id} specimen={{ ...SPECIMEN_NEED_ROOM, completeStage: "done" }} />;
    case "conversation":
      return <ConversationScreen id="specimen-conv" specimen={SPECIMEN_CONVERSATION} />;
    case "report-block":
      return (
        <AppShell>
          <ReportSheet open onClose={() => {}} target={{ kind: "chat", id: "specimen-conv" }} person={{ userId: "u-rohit", name: "Rohit Kumar", detail: "1.8 km away · Joined Aug 2024" }} />
        </AppShell>
      );
    case "resilient-states":
      return (
        <AppShell>
          <div className="space-y-4 pt-3">
            <StateCard kind="offline" title="You're offline" detail="This screen will refresh when you're back. Anything you were writing stays on this device." />
            <StateCard kind="empty" title="No messages yet" detail="Start a conversation by joining an activity, responding to a need or saying hi to someone nearby." action={<Button>Discover nearby</Button>} />
            <StateCard kind="error" title="Something went wrong" detail="We couldn't load this content. Check your connection and try again." action={<Button variant="outline">Retry</Button>} />
            <StateCard kind="saved" title="Your draft is saved" detail="We'll keep it on this device until you're back online." />
          </div>
        </AppShell>
      );
    default:
      notFound();
  }
}
