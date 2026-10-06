import type { Metadata } from "next";

export const metadata: Metadata = { title: { template: "%s · Arena Admin", default: "Overview · Arena Admin" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
