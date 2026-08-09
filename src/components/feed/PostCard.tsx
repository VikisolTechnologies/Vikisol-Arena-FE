import { CalendarClock, MapPin, MessageCircle, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ReactionButton } from "@/components/feed/ReactionButton";
import { formatFriendlyDateTime } from "@/lib/format";
import type { Post } from "@/lib/types";

const INTENT_LABEL: Record<Post["intentType"], string> = {
  activity: "Activity",
  ask: "Ask",
  update: "Update",
};

const INTENT_ICON: Record<Post["intentType"], typeof Sparkles> = {
  activity: Users,
  ask: Sparkles,
  update: CalendarClock,
};

export function PostCard({ post, onClick }: { post: Post; onClick: () => void }) {
  const Icon = INTENT_ICON[post.intentType];
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[24px] border border-border bg-white/[0.03] p-5 text-left transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{post.authorEmoji}</span>
          <span className="text-sm font-semibold">{post.authorName}</span>
          {post.mine && <Badge variant="secondary" className="bg-primary/12 text-[11px] text-primary-soft">You</Badge>}
        </div>
        <div className="flex items-center gap-1.5">
          {(post.status === "cancelled" || post.status === "expired" || post.status === "full") && (
            <Badge variant="secondary" className={post.status === "full" ? "bg-white/5 text-[11px] text-muted-foreground" : "bg-red-500/10 text-[11px] text-red-400"}>
              {post.status === "cancelled" ? "Cancelled" : post.status === "expired" ? "Expired" : "Full"}
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1 bg-white/5 text-[11px] text-muted-foreground">
            <Icon className="size-3" /> {INTENT_LABEL[post.intentType]}
          </Badge>
        </div>
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-foreground/90">{post.body}</p>

      {post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.slice(0, 4).map((t) => (
            <Badge key={t} variant="secondary" className="bg-white/5 text-[11px] text-muted-foreground">#{t}</Badge>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {post.locationText && (
          <span className="flex items-center gap-1"><MapPin className="size-3" /> {post.locationText}</span>
        )}
        {post.joinable && (
          <span className="flex items-center gap-1">
            <Users className="size-3" /> {post.spotsFilled}{post.capacity ? `/${post.capacity}` : ""} joined
            {post.visibility === "approval" && " · approval required"}
          </span>
        )}
        <span className="ml-auto">{formatFriendlyDateTime(post.createdAt)}</span>
      </div>

      <div className="mt-3 flex items-center gap-4 border-t border-border pt-3">
        <ReactionButton postId={post.id} reacted={!!post.myReacted} count={post.reactionCount} />
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageCircle className="size-3.5" /> {post.commentCount > 0 ? post.commentCount : ""}
        </span>
      </div>

      {post.myJoinStatus && (
        <p className="mt-2 text-xs font-medium text-primary-soft">
          {post.myJoinStatus === "approved" ? "You're in" : post.myJoinStatus === "pending" ? "Request pending" : "Request declined"}
        </p>
      )}
    </button>
  );
}
