import Link from "next/link";
import { SectionHeader } from "@/components/bplus/Primitives";
import type { NeedOutcome } from "@/lib/api/needs";
import type { ProfileStats, ProjectCard } from "@/lib/api/profileActivity";
import type { Post } from "@/lib/types";

function Rows({ items }: { items: { href: string; title: string; detail?: string }[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className="block rounded-tile bg-paper px-4 py-3 text-paper-ink">
            <span className="block text-[16px] font-semibold">{item.title}</span>
            {item.detail && <span className="text-[13px] text-paper-ink-muted">{item.detail}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Block({ title, empty, items }: { title: string; empty: string; items: { href: string; title: string; detail?: string }[] }) {
  return (
    <section className="mt-6" aria-label={title}>
      <SectionHeader title={title} />
      {items.length === 0 ? <p className="text-[15px] text-faint">{empty}</p> : <Rows items={items} />}
    </section>
  );
}

function postRow(p: Post) {
  return { href: `/feed/${p.id}`, title: p.title || p.body.slice(0, 80), detail: p.locationText };
}

/** Posts, activities, needs, offers and projects, in the same profile style. Public pages only
 *  receive what those endpoints already allow the viewer to see. */
export function ProfileActivity({ posts, joined = [], projects, outcomes, stats, counts = true }: {
  posts: Post[];
  joined?: Post[];
  projects: ProjectCard[];
  outcomes: NeedOutcome[];
  stats: ProfileStats | null;
  counts?: boolean;
}) {
  const hosted = posts.filter((p) => p.intentType === "activity");
  const needsOffers = posts.filter((p) => p.intentType === "ask" || p.intentType === "offer");
  const writings = posts.filter((p) => p.intentType !== "activity" && p.intentType !== "ask" && p.intentType !== "offer");
  return (
    <div>
      {counts && stats && (
        <dl className="mt-6 grid grid-cols-4 divide-x divide-line rounded-[var(--radius-card)] border border-line bg-surface py-3 text-center" aria-label="Profile counts">
          {([
            ["Hosted", stats.hosted],
            ["Joined", stats.joined],
            ["Helped", stats.helped],
            ["Projects", stats.projects],
          ] as const).map(([label, n]) => (
            <div key={label}>
              <dd className="font-display-serif text-[24px] font-medium">{n}</dd>
              <dt className="text-[13px] text-faint">{label}</dt>
            </div>
          ))}
        </dl>
      )}
      <Block title="Posts" empty="No posts yet." items={writings.map(postRow)} />
      <Block title="Hosted activities" empty="No hosted activities yet." items={hosted.map(postRow)} />
      <Block title="Joined activities" empty="No joined activities yet." items={joined.filter((p) => p.intentType === "activity").map(postRow)} />
      <Block title="Needs and offers" empty="No needs or offers yet." items={needsOffers.map(postRow)} />
      <Block
        title="Projects"
        empty="No projects yet."
        items={projects.map((p) => ({ href: `/feed/${p.postId}`, title: p.title || "Project", detail: p.role || p.status }))}
      />
      <Block
        title="Completed needs and offers"
        empty="Nothing completed yet."
        items={outcomes.map((o) => ({ href: `/feed/${o.postId}`, title: o.title, detail: o.role }))}
      />
    </div>
  );
}
