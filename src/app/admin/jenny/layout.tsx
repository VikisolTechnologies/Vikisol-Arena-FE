import type { Metadata } from "next";

export const metadata: Metadata = { title: "Jenny & AI" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
