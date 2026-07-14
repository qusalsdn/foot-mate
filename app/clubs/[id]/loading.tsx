import { Skeleton, SkeletonCard, SkeletonFrame, SkeletonHeader } from "@/components/ui/skeleton";

// 클럽 상세: 헤더 + 클럽 카드(아바타·이름·지역·소개) + 바로가기 + 로스터
export default function ClubLoading() {
  return (
    <SkeletonFrame>
      <SkeletonHeader />

      {/* 클럽 히어로 카드 */}
      <SkeletonCard className="mb-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 shrink-0 rounded-3xl" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      </SkeletonCard>

      {/* 바로가기 (매치·회비·커뮤니티) */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="flex flex-col items-center gap-2 py-4">
            <Skeleton className="size-8 rounded-xl" />
            <Skeleton className="h-3 w-12" />
          </SkeletonCard>
        ))}
      </div>

      {/* 로스터 */}
      <Skeleton className="mb-4 h-5 w-24" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="flex items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-12 shrink-0 rounded-full" />
          </SkeletonCard>
        ))}
      </div>
    </SkeletonFrame>
  );
}
