import type { Metadata } from "next";
import { Suspense } from "react";
import { DiscoverScreen } from "@/components/screens/DiscoverScreen";

// Map is Discover's map mode (FE-BPLUS-BUILD §2 #1); /map stays as a deep link into it.
export const metadata: Metadata = { title: "Map · Arena" };

export default function MapPage() {
  return (
    <Suspense fallback={null}>
      <DiscoverScreen />
    </Suspense>
  );
}
