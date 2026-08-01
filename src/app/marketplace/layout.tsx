import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketplace — Arena",
  description: "Post projects, take bids in the open, and hire on proof — not resumes.",
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
