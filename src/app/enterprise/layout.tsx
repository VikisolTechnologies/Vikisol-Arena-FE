import type { Metadata } from "next";

// Every business page reads "<page> · Arena for Business" in the browser tab (review A8).
export const metadata: Metadata = {
  title: { template: "%s · Arena for Business", default: "Arena for Business" },
  description: "Post roles, review consented candidates on evidence and hire locally with Arena for Business.",
};

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
