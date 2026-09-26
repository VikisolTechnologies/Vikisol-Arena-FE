"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getMyRooms } from "@/lib/api/rooms";
import { getSession } from "@/lib/session";

const CreateSheet = dynamic(() => import("./CreateSheet").then((m) => m.CreateSheet), { ssr: false });

const LINKS = [
  { href: "/home", label: "Feed" },
  { href: "/discover", label: "Discover" },
  { href: "/map", label: "Map" },
  { href: "/work", label: "Work" },
  { href: "/identity", label: "You" },
];

export function VNextShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [name, setName] = useState<string | null>(null);
  const [guest, setGuest] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const session = getSession();
    setGuest(!session);
    setName(session?.name ?? null);
    const sync = () => setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 pr-16 backdrop-blur">
        <Link href="/home" className="font-display text-lg font-bold">
          Arena<span className="text-primary">.</span>
        </Link>
        <nav className="hidden gap-4 text-sm lg:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href ? "text-foreground" : "text-muted-foreground"}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <InboxLink />
          {name && <span className="max-w-[40vw] truncate text-sm font-medium">{name}</span>}
          {guest && <span className="text-xs text-muted-foreground">Browsing as a guest</span>}
          <button type="button" className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground" onClick={() => setCreateOpen(true)}>
            Create
          </button>
        </div>
      </header>
      {offline && <p className="bg-destructive/15 px-4 py-2 text-sm">You are offline. This screen will retry when the connection comes back.</p>}
      <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-24">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-background/95 px-2 py-2 lg:hidden">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="flex min-h-11 flex-1 items-center justify-center text-xs font-medium">
            {link.label}
          </Link>
        ))}
      </nav>
      {createOpen && <CreateSheet open={createOpen} onClose={() => setCreateOpen(false)} guest={guest} />}
    </div>
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
