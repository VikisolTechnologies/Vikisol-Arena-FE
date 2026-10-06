import type { Metadata } from "next";

export const metadata: Metadata = { title: "Download my data" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
