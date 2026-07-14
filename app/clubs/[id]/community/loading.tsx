import { Skeleton, SkeletonCard, SkeletonFrame } from "@/components/ui/skeleton";

// 커뮤니티 목록: 헤더 + 카테고리 필터 탭 + 글 카드 리스트
export default function CommunityLoading() {
  return (
    <SkeletonFrame>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>

      {/* 필터 탭 */}
      <div className="mb-5 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-full" />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="size-16 shrink-0 rounded-xl" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </SkeletonFrame>
  );
}
