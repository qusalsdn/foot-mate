import { Skeleton, SkeletonCard, SkeletonFrame } from "@/components/ui/skeleton";

// 매치 상세: 헤더 + 매치 정보 카드 + 참석 투표 + 명단/편성
export default function MatchDetailLoading() {
  return (
    <SkeletonFrame>
      <div className="mb-6 flex items-center gap-2.5">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-6 w-28" />
      </div>

      {/* 매치 정보 카드 */}
      <SkeletonCard className="mb-6 space-y-3">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </SkeletonCard>

      {/* 참석 투표 버튼 */}
      <SkeletonCard className="mb-6">
        <Skeleton className="mb-3 h-4 w-20" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-2xl" />
          ))}
        </div>
      </SkeletonCard>

      {/* 참석자 명단 */}
      <Skeleton className="mb-4 h-5 w-24" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="flex items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </SkeletonCard>
        ))}
      </div>
    </SkeletonFrame>
  );
}
