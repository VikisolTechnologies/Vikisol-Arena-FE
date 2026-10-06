import { Suspense } from "react";
import { DiscoverScreen } from "@/components/screens/DiscoverScreen";

export default function DiscoverPage() {
  return (
    <Suspense fallback={null}>
      <DiscoverScreen />
    </Suspense>
  );
}
