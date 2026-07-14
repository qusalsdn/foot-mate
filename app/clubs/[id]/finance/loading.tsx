import { Skeleton, SkeletonCard, SkeletonFrame } from "@/components/ui/skeleton";

// 회비/정산: 헤더 + 요약 카드 + 기간별(월) 납부 묶음
export default function FinanceLoading() {
  return (
    <SkeletonFrame>
      <div className="mb-6 flex items-center gap-2.5">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-6 w-24" />
      </div>

      {/* 요약 카드 */}
      <SkeletonCard className="mb-6">
        <Skeleton className="mb-3 h-4 w-24" />
        <Skeleton className="h-8 w-40" />
      </SkeletonCard>

      {/* 기간별 묶음 */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <Skeleton className="size-9 shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="ml-auto h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </SkeletonCard>
        ))}
      </div>
    </SkeletonFrame>
  );
}
