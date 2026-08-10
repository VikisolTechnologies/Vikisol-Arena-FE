import type { FeedItem, FeedTab, Post } from "@/lib/types";
import { getFeed as getPostFeed } from "@/lib/api/posts";
import { MOCK_JOBS } from "@/lib/mock/jobs";
import { MOCK_PROJECTS } from "@/lib/mock/projects";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";

// ARENA-MASTER-ARCHITECTURE.md PART 6/7.5 - the unified Home feed. Real mode hits arena-api's
// new GET /feed (FeedAggregationService - see DECISIONS.md). Mock mode has no backend to merge
// server-side, so it does the same merge client-side over the existing MOCK_POSTS/MOCK_JOBS/
// MOCK_PROJECTS - recency-only ranking (no follow/embedding signals in mock mode), same "honest
// simplification for the demo path" precedent as getFeed()'s own mock branch.
function postToFeedItem(post: Post): FeedItem {
  return {
    id: post.id,
    itemType: post.intentType,
    authorUserId: post.authorUserId,
    authorName: post.authorName,
    authorEmoji: post.authorEmoji,
    authorCompanyId: post.authorCompanyId,
    title: post.title,
    body: post.body,
    locationText: post.locationText,
    tags: post.tags,
    mediaUrls: post.mediaUrls,
    status: post.status,
    createdAt: post.createdAt,
    visibility: post.visibility,
    capacity: post.capacity,
    spotsFilled: post.spotsFilled,
    startsAt: post.startsAt,
    endsAt: post.endsAt,
    joinable: post.joinable,
    mine: post.mine,
    myJoinStatus: post.myJoinStatus,
    roomId: post.roomId,
    approxLat: post.approxLat,
    approxLng: post.approxLng,
    commentCount: post.commentCount,
    reactionCount: post.reactionCount,
    myReacted: post.myReacted,
    authorJoinCount: post.authorJoinCount,
    authorAccountAgeDays: post.authorAccountAgeDays,
  };
}

function daysAgoToIso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

function jobToFeedItem(job: (typeof MOCK_JOBS)[number]): FeedItem {
  return {
    id: job.id,
    itemType: "job",
    authorCompanyName: job.company,
    authorCompanyEmoji: job.companyEmoji,
    title: job.title,
    body: job.description,
    locationText: job.location,
    tags: job.skills,
    mediaUrls: [],
    status: "open",
    createdAt: daysAgoToIso(job.postedDaysAgo),
    employmentType: job.employmentType,
    remote: job.remote,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
  };
}

function projectToFeedItem(project: (typeof MOCK_PROJECTS)[number], index: number): FeedItem {
  return {
    id: project.id,
    itemType: "project",
    authorName: project.postedBy,
    authorEmoji: "\u{1F9D1}",
    title: project.title,
    body: project.description,
    tags: project.skills,
    mediaUrls: [],
    status: project.status === "awarded" ? "closed" : project.status,
    // Mock Project has no createdAt (only a deadline) - spread across recent days by index so
    // the merged feed has a believable recency spread instead of every project tying at "now".
    createdAt: daysAgoToIso(index % 10),
    endsAt: project.endsAt,
    budgetMin: project.budgetMin,
    budgetMax: project.budgetMax,
    durationWeeks: project.durationWeeks,
    bidCount: project.bids.length,
  };
}

export async function getFeedItems(tab: FeedTab = "for-you", page = 0, size = 20): Promise<FeedItem[]> {
  if (isRealMode()) return apiFetch<FeedItem[]>("/feed", { query: { tab, page, size } });

  const posts = await getPostFeed(0, 500);
  const items: FeedItem[] = [
    ...posts.map(postToFeedItem),
    ...MOCK_JOBS.slice(0, 15).map(jobToFeedItem),
    ...MOCK_PROJECTS.slice(0, 15).map(projectToFeedItem),
  ];
  const filtered = tab === "following" ? items.filter((i) => i.mine || false) : items;
  const sorted = filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return delay(sorted.slice(page * size, page * size + size), 250);
}
