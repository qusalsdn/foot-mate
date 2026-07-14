import { Skeleton, SkeletonCard, SkeletonFrame, SkeletonHeader } from "@/components/ui/skeleton";

// 홈: 내 클럽 목록 + 다가오는 매치 + 클럽 둘러보기
export default function HomeLoading() {
  return (
    <SkeletonFrame width="max-w-3xl">
      <SkeletonHeader />

      {/* 내 클럽 */}
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard key={i} className="flex items-center gap-3">
            <Skeleton className="size-12 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </SkeletonCard>
        ))}
      </div>

      {/* 다가오는 매치 */}
      <Skeleton className="mb-4 h-5 w-28" />
      <div className="mb-8 space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard key={i} className="flex items-center gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-7 w-14 shrink-0 rounded-full" />
          </SkeletonCard>
        ))}
      </div>

      {/* 클럽 둘러보기 */}
      <Skeleton className="mb-4 h-5 w-32" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="flex items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-44" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </SkeletonFrame>
  );
}
