"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home, Compass, MessageSquare, Fingerprint, ClipboardList, Store, Mail, Settings,
  LayoutDashboard, Search as SearchIcon, Briefcase, Sparkles, Users, ScrollText,
  CreditCard, Building2, CalendarClock, Building, ShieldAlert, BarChart3, Flag,
} from "lucide-react";
import {
  Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { getJobs } from "@/lib/api/jobs";
import { getSession } from "@/lib/session";
import type { Job } from "@/lib/types";

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

const COMPANY_ADMIN_NAV = [
  { href: "/enterprise/admin", label: "Admin dashboard", icon: LayoutDashboard },
  { href: "/enterprise/admin/team", label: "Team", icon: Users },
  { href: "/enterprise/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/enterprise/admin/billing", label: "Billing & plan", icon: CreditCard },
  { href: "/enterprise/admin/company", label: "Company profile", icon: Building2 },
  ...ENTERPRISE_NAV,
];

const HIRING_MANAGER_NAV = [
  { href: "/enterprise/interviews/mine", label: "My interviews", icon: CalendarClock },
];

const PLATFORM_ADMIN_NAV = [
  { href: "/admin", label: "Tenants", icon: Building },
  { href: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/flags", label: "Feature flags", icon: Flag },
];

/** Global ⌘K palette — jump to any screen, search jobs, or ask the agent. Mounted once in the root layout. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);

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
  const navItems =
    role === "company_admin" ? COMPANY_ADMIN_NAV
    : role === "recruiter" ? ENTERPRISE_NAV
    : role === "hiring_manager" ? HIRING_MANAGER_NAV
    : role === "platform_admin" ? PLATFORM_ADMIN_NAV
    : CANDIDATE_NAV;

  useEffect(() => {
    if (open && role === "talent" && jobs.length === 0) getJobs().then(setJobs);
  }, [open, role, jobs.length]);

  const jobResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return jobs.filter((j) => j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)).slice(0, 5);
  }, [query, jobs]);

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
