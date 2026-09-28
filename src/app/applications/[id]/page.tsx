"use client";

import { useParams } from "next/navigation";
import { ApplicationScreen } from "@/components/career/ApplicationScreen";

export default function ApplicationPage() {
  const { id } = useParams<{ id: string }>();
  return <ApplicationScreen id={id} />;
}
