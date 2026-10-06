"use client";

import { use } from "react";
import { PublicProfileScreen } from "@/components/screens/PublicProfileScreen";

/** Canonical public profile (architect, 30 Sep): /people/[id]. /neighbour/* redirects here. */
export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PublicProfileScreen id={id} />;
}
