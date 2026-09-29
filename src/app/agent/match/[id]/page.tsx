import type { Metadata } from "next";
import { SmartMatchScreen } from "@/components/jenny/SmartMatchScreen";

export const metadata: Metadata = { title: "Smart match · Arena" };

export default async function SmartMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SmartMatchScreen id={id} />;
}
