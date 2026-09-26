"use client";

import { getNearby } from "@/lib/api/posts";
import { JennySlot, Card, useLoad } from "./shared";
import { Status, VNextShell } from "./Shell";

export function MapScreen() {
  const { data, error } = useLoad(() => getNearby({ lat: 17.385, lng: 78.4867, radiusKm: 10 }), []);
  return (
    <VNextShell>
      <p className="text-xs uppercase tracking-wide text-primary-soft">Around Hyderabad</p>
      <JennySlot surface="Map" />
      <p className="mb-3 text-xs text-muted-foreground">A list of real nearby activities. The map canvas stays off this first load.</p>
      {error && <Status kind="error" title="Nearby did not load" detail={error} />}
      {!error && !data && <Status kind="loading" title="Loading" />}
      {data && data.length === 0 && <Status kind="empty" title="Nothing nearby in the last search" detail="10 km around Hyderabad returned no activities." />}
      {data && data.length > 0 && (
        <div className="grid gap-3">
          {data.map((post) => (
            <Card key={post.id} href={`/feed/${post.id}`} title={post.title || post.body.slice(0, 80)} meta={post.locationText || "Activity"} />
          ))}
        </div>
      )}
    </VNextShell>
  );
}
