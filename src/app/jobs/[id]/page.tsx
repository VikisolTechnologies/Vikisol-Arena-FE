"use client";

import { useParams } from "next/navigation";
import { JobDetailScreen } from "@/components/career/JobDetailScreen";

export default function JobPage() {
  const { id } = useParams<{ id: string }>();
  return <JobDetailScreen id={id} />;
}
