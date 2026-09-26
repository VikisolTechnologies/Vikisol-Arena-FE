"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { getMyRooms } from "@/lib/api/rooms";
import { getSession } from "@/lib/session";
import { readEntryDraft, subscribeEntryDraft } from "./entry/draft";
import { ArenaBrand } from "./entry/chrome";

const CreateSheet = dynamic(() => import("./CreateSheet").then((m) => m.CreateSheet), { ssr: false });

function subscribeSession(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function subscribeNetwork(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** null during server render, then whether localStorage has no session. */
export function useGuest(): boolean | null {
  return useSyncExternalStore(subscribeSession, () => getSession() == null, () => null);
}

function useSessionName(): string | null {
  return useSyncExternalStore(subscribeSession, () => getSession()?.name ?? null, () => null);
}

function useOffline(): boolean {
  return useSyncExternalStore(
    subscribeNetwork,
    () => typeof navigator !== "undefined" && !navigator.onLine,
    () => false,
  );
}

const LINKS = [
  { href: "/home", label: "Feed" },
  { href: "/discover", label: "Discover" },
  { href: "/work", label: "Work" },
  { href: "/identity", label: "You" },
];

export function VNextShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const name = useSessionName();
  const guest = useGuest();
  const [createOpen, setCreateOpen] = useState(false);
  const createRef = useRef<HTMLButtonElement>(null);
  const offline = useOffline();
  useEffect(() => {
    const open = () => setCreateOpen(true);
    window.addEventListener("arena-open-create", open);
    return () => window.removeEventListener("arena-open-create", open);
  }, []);
  const closeCreate = () => {
    setCreateOpen(false);
    createRef.current?.focus();
  };

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <ArenaBrand href="/home" />
        <nav className="hidden gap-4 text-sm lg:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href ? "text-foreground" : "text-muted-foreground"}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LocationChip />
          <InboxLink />
          {guest === true ? (
            <Link href="/auth?mode=signin" className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">Sign in</Link>
          ) : (
            name && <span className="hidden max-w-[28vw] truncate text-sm font-medium sm:inline">{name}</span>
          )}
          <button ref={createRef} type="button" className="hidden min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground lg:inline-flex" onClick={() => setCreateOpen(true)}>
            Create
          </button>
        </div>
      </header>
      {offline && <p className="bg-destructive/15 px-4 py-2 text-sm">You are offline. This screen will retry when the connection comes back.</p>}
      <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-24">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0d0d10]/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden" aria-label="Primary">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end">
          {LINKS.slice(0, 2).map((link) => (
            <TabLink key={link.href} href={link.href} label={link.label} active={pathname === link.href} />
          ))}
          <button type="button" aria-label="Create" onClick={() => setCreateOpen(true)} className="mx-auto grid size-14 -translate-y-3 place-items-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground shadow-[0_8px_20px_rgba(255,107,53,0.35)] active:scale-[0.98] motion-reduce:active:scale-100">
            +
          </button>
          {LINKS.slice(2).map((link) => (
            <TabLink key={link.href} href={link.href} label={link.label} active={pathname === link.href} />
          ))}
        </div>
      </nav>
      {createOpen && <CreateSheet open={createOpen} onClose={closeCreate} guest={guest === true} />}
    </div>
  );
}

function TabLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-11 min-w-11 flex-col items-center justify-center text-[13px] font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
      {label}
    </Link>
  );
}

function LocationChip() {
  const guest = useGuest();
  const area = useSyncExternalStore(subscribeEntryDraft, () => readEntryDraft().area.trim(), () => "");
  return (
    <Link href={guest === true ? "/auth" : "/onboarding"} className="inline-flex min-h-11 max-w-[34vw] items-center truncate rounded-full border border-border px-3 text-xs">
      {area || "Add your area"}
    </Link>
  );
}

function InboxLink() {
  const [unread, setUnread] = useState<number | null>(null);
  useEffect(() => {
    if (!getSession()) return;
    getMyRooms()
      .then((rooms) => setUnread(rooms.filter((room) => room.unread).length))
      .catch(() => setUnread(null));
  }, []);
  const label = unread != null && unread > 0 ? `Inbox, ${unread} unread` : "Inbox";
  return (
    <Link href="/rooms" aria-label={label} className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 6h16v12H4V6Z" stroke="currentColor" strokeWidth="1.75" />
        <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.75" />
      </svg>
      {unread != null && unread > 0 && (
        <span className="absolute right-0 top-1 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-4 text-primary-foreground">
          {unread}
        </span>
      )}
    </Link>
  );
}

export function Status({ kind, title, detail }: { kind: "loading" | "empty" | "error"; title: string; detail?: string }) {
  return (
    <div className="rounded-3xl border border-border px-5 py-10 text-center">
      <p className="font-display text-lg font-semibold">{kind === "loading" ? "Loading" : title}</p>
      {detail && <p className="mt-2 text-sm text-muted-foreground">{detail}</p>}
    </div>
  );
}
