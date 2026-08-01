import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arena for Enterprise — Talent Universe",
  description: "Search consented candidates, post roles, and manage your hiring pipeline from Arena's enterprise portal.",
};

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
