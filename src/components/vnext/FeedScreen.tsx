"use client";

import { getFeedItems } from "@/lib/api/feed";
import { JennySlot, Card, hrefFor, labelFor, useLoad } from "./shared";
import { Status, VNextShell } from "./Shell";

export function FeedScreen() {
  const { data, error } = useLoad(() => getFeedItems("for-you", 0, 20), []);
  return (
    <VNextShell>
      <JennySlot surface="Feed" />
      {error && <Status kind="error" title="The feed did not load" detail={error} />}
      {!error && !data && <Status kind="loading" title="Loading" />}
      {data && data.length === 0 && <Status kind="empty" title="Arena is quiet right now" detail="When someone nearby posts a need, an activity, or a piece of work, it will show up here." />}
      {data && data.length > 0 && (
        <>
          <p className="mb-3 text-xs text-muted-foreground">{data.length} {data.length === 1 ? "thing" : "things"} in this feed</p>
          <div className="grid gap-3">
            {data.map((item) => (
              <Card key={item.id} href={hrefFor(item)} title={item.title || item.body.slice(0, 80)} meta={labelFor(item)} />
            ))}
          </div>
        </>
      )}
    </VNextShell>
  );
}
