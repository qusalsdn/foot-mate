import { Skeleton, SkeletonCard, SkeletonFrame } from "@/components/ui/skeleton";

// 게시글 상세: 헤더 + 본문 카드 + 댓글 리스트
export default function PostDetailLoading() {
  return (
    <SkeletonFrame>
      <div className="mb-6 flex items-center gap-2.5">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-6 w-24" />
      </div>

      {/* 본문 카드 */}
      <SkeletonCard className="mb-6">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="mb-3 h-6 w-2/3" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </SkeletonCard>

      {/* 댓글 */}
      <Skeleton className="mb-4 h-5 w-20" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="flex gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </SkeletonFrame>
  );
}
