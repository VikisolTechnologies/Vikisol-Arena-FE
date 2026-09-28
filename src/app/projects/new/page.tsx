import type { Metadata } from "next";
import { ProjectCreateFlow } from "@/components/projects/ProjectCreateFlow";

export const metadata: Metadata = { title: "Start a project · Arena" };

export default function NewProjectPage() {
  return <ProjectCreateFlow />;
}
