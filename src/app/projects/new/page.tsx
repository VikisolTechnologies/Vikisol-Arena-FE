import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectCreateFlow } from "@/components/projects/ProjectCreateFlow";

export const metadata: Metadata = { title: "Start a project · Arena" };

export default function NewProjectPage() {
  return (
    <Suspense>
      <ProjectCreateFlow />
    </Suspense>
  );
}
