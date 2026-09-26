"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { FeedItem } from "@/lib/types";

export const JennySlot = dynamic(() => import("./JennySlot").then((m) => m.JennySlot), { ssr: false });

export function useLoad<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    load()
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load this.");
      });
    return () => {
      cancelled = true;
    };
    // The caller passes the values this load closes over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error };
}

export function Card({ href, title, meta }: { href: string; title: string; meta: string }) {
  return (
    <Link href={href} className="block rounded-3xl border border-border bg-card px-4 py-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
    </Link>
  );
}

export function hrefFor(item: FeedItem) {
  if (item.itemType === "job") return `/jobs/${item.id}`;
  if (item.itemType === "project") return `/marketplace/${item.id}`;
  return `/feed/${item.id}`;
}

export function labelFor(item: FeedItem) {
  const kind = item.itemType === "offer" ? "Offer" : item.itemType;
  const who = item.authorName || item.authorCompanyName || "Someone";
  return `${kind} · ${who}${item.locationText ? ` · ${item.locationText}` : ""}`;
}
