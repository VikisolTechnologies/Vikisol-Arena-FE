"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { PlatformAdminShell, usePlatformAdminGate } from "@/components/app/PlatformAdminShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { searchPlatformUsers } from "@/lib/api/platformAdmin";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import type { PlatformUser, Role } from "@/lib/types";

const ROLE_FILTERS: { key: Role | ""; label: string }[] = [
  { key: "", label: "All" },
  { key: "talent", label: "Talent" },
  { key: "recruiter", label: "Recruiter" },
  { key: "company_admin", label: "Company admin" },
  { key: "hiring_manager", label: "Hiring manager" },
  { key: "platform_admin", label: "Platform admin" },
];

const ROLE_TONE: Record<string, string> = {
  talent: "bg-white/5 text-muted-foreground",
  recruiter: "bg-primary/12 text-primary-soft",
  company_admin: "bg-amber-500/15 text-amber-400",
  hiring_manager: "bg-sky-500/15 text-sky-400",
  platform_admin: "bg-red-500/15 text-red-400",
};

export default function PlatformUsersPage() {
  const gate = usePlatformAdminGate();
  const [users, setUsers] = useState<PlatformUser[] | null>(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role | "">("");

  const load = (q: string, r: Role | "") => searchPlatformUsers(q, r || undefined).then(setUsers);

  useEffect(() => { if (gate === "ready") load(query, role); }, [gate, role]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PlatformAdminShell title="Users">
      <div className="mb-4 flex items-center gap-2 rounded-full border border-border bg-white/[0.03] px-4 py-2.5">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); load(e.target.value, role); }}
          placeholder="Search by name or email…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {ROLE_FILTERS.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRole(r.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              role === r.key ? "border-primary/60 bg-primary/10 text-primary-soft" : "border-border bg-white/[0.03] text-muted-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {!users ? (
        <OrbLoader className="h-96" />
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white/[0.02] px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{u.name}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
              {u.tenantName && <span className="text-xs text-muted-foreground">{u.tenantName}</span>}
              <Badge variant="secondary" className={`capitalize ${ROLE_TONE[u.role] ?? "bg-white/5 text-muted-foreground"}`}>
                {u.role.replace("_", " ")}
              </Badge>
              <span className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</span>
            </div>
          ))}
          {users.length === 0 && <EmptyState title="No users match that search." className="py-16" />}
        </div>
      )}
    </PlatformAdminShell>
  );
}
