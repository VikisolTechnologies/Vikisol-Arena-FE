"use client";

import { notFound, useParams } from "next/navigation";
import { ActivityScreen } from "@/components/activity/ActivityScreen";
import { RoomScreen } from "@/components/activity/RoomScreen";
import { NeedScreen } from "@/components/needs/NeedScreen";
import { FIXTURES_ALLOWED } from "@/lib/data/mode";
import { SPECIMEN_ACTIVITY, SPECIMEN_APPROVED, SPECIMEN_NEED, SPECIMEN_NEED_ROOM, SPECIMEN_OFFERER, SPECIMEN_OFFERS, SPECIMEN_PENDING, SPECIMEN_ROOM } from "@/lib/dev/specimens";

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
    default:
      notFound();
  }
}
