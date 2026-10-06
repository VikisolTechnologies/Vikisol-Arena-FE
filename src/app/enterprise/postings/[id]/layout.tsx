import type { Metadata } from "next";

export const metadata: Metadata = { title: { absolute: "Manage job · Arena for Business" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
