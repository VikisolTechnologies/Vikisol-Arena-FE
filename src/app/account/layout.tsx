import type { Metadata } from "next";

export const metadata: Metadata = { title: { template: "%s · Arena", default: "Account · Arena" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
