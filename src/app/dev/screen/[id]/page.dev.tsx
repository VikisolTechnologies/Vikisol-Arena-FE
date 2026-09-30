"use client";

import { notFound, useParams } from "next/navigation";
import { ActivityScreen } from "@/components/activity/ActivityScreen";
import { RoomScreen } from "@/components/activity/RoomScreen";
import { NeedScreen } from "@/components/needs/NeedScreen";
import { JobDetailScreen } from "@/components/career/JobDetailScreen";
import { ApplicationScreen } from "@/components/career/ApplicationScreen";
import { CoverStep } from "@/components/activities/CoverStep";
import { Preview, Published } from "@/components/activities/ActivityCreateFlow";
import { IntakeForm } from "@/components/intake/IntakeForm";
import { activitySchema } from "@/lib/intake/schemas/activity";
import { KindPicker } from "@/components/activities/KindPicker";
import { ConversationScreen } from "@/components/inbox/ConversationScreen";
import { ReportSheet } from "@/components/trust/ReportSheet";
import { AppShell } from "@/components/bplus/AppShell";
import { Button } from "@/components/bplus/Button";
import { StateCard } from "@/components/bplus/Primitives";
import { FIXTURES_ALLOWED } from "@/lib/data/mode";
import { ApprovalSheet } from "@/components/jenny/ApprovalSheet";
import { loadQueue } from "@/lib/data/jenny";
import { SPECIMEN_ACTIVITY, SPECIMEN_APPLICATION, SPECIMEN_CANDIDATE, SPECIMEN_JOB, SPECIMEN_APPROVED, SPECIMEN_CONVERSATION, SPECIMEN_HOST_REQUESTS, SPECIMEN_PREVIEW_DATE, SPECIMEN_HOST_SOON, SPECIMEN_HOST_UPCOMING, SPECIMEN_NEED, SPECIMEN_NEED_ROOM, SPECIMEN_OFFERER, SPECIMEN_OFFERS, SPECIMEN_PENDING, SPECIMEN_ROOM } from "@/lib/dev/specimens";

/** Compare-page specimens: the real screen components with fixed fictional data, for screens
 *  whose live route needs a real record id. Buttons still call the real API (and will fail
 *  honestly against these fake ids). */
export default function SpecimenPage() {
  const { id } = useParams<{ id: string }>();
  if (!FIXTURES_ALLOWED) notFound();
  switch (id) {
    case "activity-details":
      return <ActivityScreen post={SPECIMEN_ACTIVITY} />;
    case "activity-manage":
      return <ActivityScreen post={SPECIMEN_HOST_UPCOMING} specimen={{ requests: SPECIMEN_HOST_REQUESTS }} />;
    case "activity-checkin":
      return <ActivityScreen post={SPECIMEN_HOST_SOON} specimen={{ requests: SPECIMEN_HOST_REQUESTS, open: "checkin" }} />;
    case "activity-cancel":
      return <ActivityScreen post={SPECIMEN_HOST_UPCOMING} specimen={{ requests: SPECIMEN_HOST_REQUESTS, open: "cancel" }} />;
    case "activity-leave":
      return <ActivityScreen post={SPECIMEN_APPROVED} specimen={{ open: "leave" }} />;
    case "activity-intake":
      return (
        <AppShell>
          <div className="-mx-5 -mt-2 flex-1 bg-paper px-5 pb-6 pt-3 text-paper-ink">
            <IntakeForm schema={activitySchema("cricket")} draftKey="specimen-activity-intake" initial={{ title: "Sunday tennis-ball cricket", format: "tennis-ball" }} startAt="details" onExit={() => {}} onSubmit={() => {}} />
          </div>
        </AppShell>
      );
    case "activity-preview":
      return (
        <AppShell>
          <div className="-mx-5 -mt-2 flex-1 bg-paper px-5 pb-6 pt-3 text-paper-ink">
            <Preview
              subtypeId="cricket"
              seed="specimen-cricket"
              values={{ title: "Sunday tennis-ball cricket", date: SPECIMEN_PREVIEW_DATE, start: "07:00", end: "09:00", area: "Gachibowli", size: { max: 12 } }}
              cover={{ mode: "card", variant: 0 }}
              coverFile={null}
              onEdit={() => {}}
              onCover={() => {}}
              onPublish={async () => {}}
            />
          </div>
        </AppShell>
      );
    case "join-sent":
      return <ActivityScreen post={SPECIMEN_PENDING} sentOpen />;
    case "approved-ready":
      return <ActivityScreen post={SPECIMEN_APPROVED} />;
    case "activity-room":
      return <RoomScreen roomId={SPECIMEN_ROOM.room.id} specimen={SPECIMEN_ROOM} />;
    case "need-page":
      return <NeedScreen post={SPECIMEN_NEED} specimen={{ offers: SPECIMEN_OFFERS }} />;
    case "offer-details":
      return <NeedScreen post={SPECIMEN_NEED} specimen={{ offers: SPECIMEN_OFFERS, openOfferId: "o1", profile: SPECIMEN_OFFERER }} />;
    case "coordination-room":
      return <RoomScreen roomId={SPECIMEN_NEED_ROOM.room.id} specimen={SPECIMEN_NEED_ROOM} />;
    case "mark-completed":
      return <RoomScreen roomId={SPECIMEN_NEED_ROOM.room.id} specimen={{ ...SPECIMEN_NEED_ROOM, completeStage: "done" }} />;
    case "conversation":
      return <ConversationScreen id="specimen-conv" specimen={SPECIMEN_CONVERSATION} />;
    case "report-block":
      return (
        <AppShell>
          <ReportSheet open onClose={() => {}} target={{ kind: "chat", id: "specimen-conv" }} person={{ userId: "u-rohit", name: "Rohit Varma", detail: "1.8 km away · Joined Aug 2024" }} />
        </AppShell>
      );
    case "resilient-states":
      return (
        <AppShell>
          <div className="space-y-4 pt-3">
            <StateCard kind="offline" title="You're offline" detail="This screen will refresh when you're back. Anything you were writing stays on this device." />
            <StateCard kind="empty" title="No messages yet" detail="Start a conversation by joining an activity, responding to a need or saying hi to someone nearby." action={<Button>Discover nearby</Button>} />
            <StateCard kind="error" title="Something went wrong" detail="We couldn't load this content. Check your connection and try again." action={<Button variant="outline">Retry</Button>} />
            <StateCard kind="saved" title="Your draft is saved" detail="We'll keep it on this device until you're back online." />
          </div>
        </AppShell>
      );
    case "job-details":
      return <JobDetailScreen id="specimen-job" specimen={{ job: SPECIMEN_JOB, profile: SPECIMEN_CANDIDATE }} />;
    case "apply-sheet":
      return <JobDetailScreen id="specimen-job" specimen={{ job: SPECIMEN_JOB, profile: SPECIMEN_CANDIDATE, applyOpen: true }} />;
    case "apply-track":
      return <ApplicationScreen id="specimen-app" specimen={{ application: SPECIMEN_APPLICATION, job: SPECIMEN_JOB }} />;
    case "application-tracker":
      return <ApplicationScreen id="specimen-app" specimen={{ application: { ...SPECIMEN_APPLICATION, stage: "applied", appliedAt: new Date().toISOString() }, job: SPECIMEN_JOB, viaJenny: true }} />;
    case "approve-action":
      return (
        <AppShell>
          <ApprovalSheet item={loadQueue().find((q) => q.id === "q-invite") ?? null} onClose={() => {}} onDone={() => {}} />
        </AppShell>
      );
    case "activity-kind":
      return <AppShell><div className="-mx-5 -mt-2 flex-1 bg-paper px-5 pb-6 pt-3 text-paper-ink"><KindPicker onPick={() => {}} onClose={() => {}} /></div></AppShell>;
    case "activity-cover":
      return <AppShell><div className="-mx-5 -mt-2 flex-1 bg-paper px-5 pb-6 pt-3 text-paper-ink"><CoverStep seed="specimen-cricket" subtypeId="cricket" time="evening" answers={{}} onBack={() => {}} onUse={() => {}} /></div></AppShell>;
    case "activity-published":
      return <AppShell><div className="-mx-5 -mt-2 flex-1 bg-paper px-5 pb-6 pt-3 text-paper-ink"><Published id="specimen-activity" title="Sunday tennis-ball cricket" /></div></AppShell>;
    default:
      notFound();
  }
}
