"use client";

import { useParams } from "next/navigation";
import { ConversationScreen } from "@/components/inbox/ConversationScreen";

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  return <ConversationScreen id={id} />;
}
