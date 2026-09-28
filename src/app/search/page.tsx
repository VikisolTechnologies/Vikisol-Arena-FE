import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchScreen } from "@/components/inbox/SearchScreen";

export const metadata: Metadata = { title: "Search · Arena" };

export default function SearchPage() {
  return (
    <Suspense>
      <SearchScreen />
    </Suspense>
  );
}
