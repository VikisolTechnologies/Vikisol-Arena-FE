"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home, Compass, MessageSquare, Fingerprint, ClipboardList, Store, Mail, Settings,
  LayoutDashboard, Search as SearchIcon, Briefcase, Sparkles,
} from "lucide-react";
import {
  Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { MOCK_JOBS } from "@/lib/mock/jobs";
import { getSession } from "@/lib/session";

const CANDIDATE_NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/agent", label: "Agent", icon: MessageSquare },
  { href: "/identity", label: "Identity", icon: Fingerprint },
  { href: "/applications", label: "Applications", icon: ClipboardList },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/messages", label: "Messages", icon: Mail },
  { href: "/settings", label: "Settings", icon: Settings },
];

const ENTERPRISE_NAV = [
  { href: "/enterprise/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/enterprise/talent", label: "Talent Universe", icon: SearchIcon },
  { href: "/enterprise/postings", label: "Postings", icon: Briefcase },
  { href: "/enterprise/messages", label: "Messages", icon: Mail },
];

/** Global ⌘K palette — jump to any screen, search jobs, or ask the agent. Mounted once in the root layout. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const role = useMemo(() => (open ? getSession()?.role : undefined), [open]);
  const navItems = role === "enterprise" ? ENTERPRISE_NAV : CANDIDATE_NAV;

  const jobResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return MOCK_JOBS.filter((j) => j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)).slice(0, 5);
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Jump to..." description="Search screens, jobs, or ask your agent">
      <Command>
        <CommandInput placeholder="Jump to a screen, search jobs, or ask your agent..." value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>Nothing found.</CommandEmpty>
          <CommandGroup heading="Go to">
            {navItems.map(({ href, label, icon: Icon }) => (
              <CommandItem key={href} value={label} onSelect={() => go(href)}>
                <Icon /> {label}
              </CommandItem>
            ))}
          </CommandGroup>
          {jobResults.length > 0 && (
            <CommandGroup heading="Jobs">
              {jobResults.map((job) => (
                <CommandItem key={job.id} value={`${job.title} ${job.company}`} onSelect={() => go(`/jobs/${job.id}`)}>
                  <Briefcase /> {job.title} <span className="text-muted-foreground">at {job.company}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {query.trim() && (
            <CommandGroup heading="Agent">
              <CommandItem value={`ask-agent-${query}`} onSelect={() => go(`/agent?ask=${encodeURIComponent(query)}`)}>
                <Sparkles /> Ask agent: &ldquo;{query}&rdquo;
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
