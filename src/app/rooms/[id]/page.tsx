"use client";

import { useParams } from "next/navigation";
import { RoomScreen } from "@/components/activity/RoomScreen";

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <RoomScreen roomId={id} />;
}
