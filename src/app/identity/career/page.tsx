import type { Metadata } from "next";
import { Suspense } from "react";
import { CareerFlow } from "@/components/career/CareerFlow";

export const metadata: Metadata = { title: "Career profile · Arena" };

export default function CareerPage() {
  return (
    <Suspense>
      <CareerFlow />
    </Suspense>
  );
}
