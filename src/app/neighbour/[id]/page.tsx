"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/bplus/AppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { ButtonLink } from "@/components/bplus/Button";
import { StateCard } from "@/components/bplus/Primitives";
import { TopBar, Title, Lede } from "@/components/bplus/Screen";
import { getNeighbourPublic } from "@/components/account/fixtures";
import { isRealMode } from "@/lib/api/mode";
import { getPublicProfile } from "@/lib/api/profile";
import type { PublicCandidateProfile } from "@/lib/types";

/**
 * B+ public profile for another person (flow §12 / P11). Respects visibility:
 * hidden → private empty; otherwise shows consented public fields only.
 * Existing `/people/[id]` stays untouched — see SHARED-CHANGES-NEEDED.md.
 */
export default function NeighbourProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [apiProfile, setApiProfile] = useState<PublicCandidateProfile | null | undefined>(undefined);

  useEffect(() => {
    if (!isRealMode()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setApiProfile(null);
      return;
    }
    getPublicProfile(id).then((p) => setApiProfile(p ?? null));
  }, [id]);

  const fixture = !isRealMode() ? getNeighbourPublic(id) : null;
  const hidden = fixture?.visibility === "hidden";

  return (
    <AppShell tone="light">
      <TopBar onBack={() => router.back()} />
      {isRealMode() && apiProfile === undefined && <StateCard kind="empty" title="Loading…" />}
      {isRealMode() && apiProfile === null && (
        <StateCard kind="empty" title="This profile isn't available" detail="They may have set visibility to private, or the link is wrong." />
      )}
      {isRealMode() && apiProfile && (
        <PublicCard
          name={apiProfile.name}
          title={apiProfile.title}
          area={apiProfile.location || apiProfile.homeCity || ""}
          bio={apiProfile.bio || ""}
          interests={apiProfile.skills.map((s) => s.name)}
          verified={apiProfile.verificationLevel === "id" || apiProfile.phoneVerified}
        />
      )}
      {!isRealMode() && hidden && (
        <>
          <Title className="mt-2">Private profile</Title>
          <Lede>This neighbour has set their profile to Hidden. Arena doesn&apos;t show their details.</Lede>
          <div className="mt-6">
            <StateCard kind="empty" title="Nothing to show" detail="Respect their choice — you can still meet them through shared activities if they join." />
          </div>
        </>
      )}
      {!isRealMode() && fixture && !hidden && (
        <PublicCard
          name={fixture.name}
          title={fixture.title}
          area={fixture.area}
          bio={fixture.bio}
          interests={fixture.interests}
          verified={fixture.verifiedNeighbour}
        />
      )}
    </AppShell>
  );
}

function PublicCard({
  name,
  title,
  area,
  bio,
  interests,
  verified,
}: {
  name: string;
  title: string;
  area: string;
  bio: string;
  interests: string[];
  verified: boolean;
}) {
  return (
    <>
      <div className="mt-2 flex items-center gap-4">
        <Avatar name={name} className="size-20 text-[22px]" />
        <div className="min-w-0">
          <Title className="!text-[28px]">{name}</Title>
          {verified && (
            <p className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-success-on-paper">
              <ShieldCheck className="size-4" aria-hidden /> Verified neighbour
            </p>
          )}
          <p className="mt-1 text-[14px] text-paper-ink-muted">
            {title}
            {title && area ? " · " : ""}
            {area}
          </p>
        </div>
      </div>
      {bio && <p className="mt-5 text-[15px] leading-relaxed text-paper-ink">&ldquo;{bio}&rdquo;</p>}
      {interests.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[14px] font-semibold text-paper-ink">Interests</p>
          <ul className="flex flex-wrap gap-2">
            {interests.map((i) => (
              <li key={i} className="rounded-full bg-paper-muted px-3 py-1.5 text-[13px] font-medium text-paper-ink">
                {i}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-8">
        <ButtonLink href="/rooms" variant="primary">
          Message
        </ButtonLink>
        <p className="mt-3 text-center text-[12px] text-paper-ink-muted">
          Messaging may ask them first when connect requests ship (gap #34).{" "}
          <Link href="/account/help" className="underline underline-offset-2">
            Safety tips
          </Link>
        </p>
      </div>
    </>
  );
}
