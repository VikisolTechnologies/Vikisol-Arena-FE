import type { Metadata } from "next";

export const metadata: Metadata = { title: "Session expired" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
