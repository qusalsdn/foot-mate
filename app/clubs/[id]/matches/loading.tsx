import { Skeleton, SkeletonCard, SkeletonFrame } from "@/components/ui/skeleton";

// 매치 목록: 뒤로가기 + 제목/새 매치 버튼 + 매치 카드 리스트
export default function MatchesLoading() {
  return (
    <SkeletonFrame>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2.5">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <Skeleton className="h-7 w-16 shrink-0 rounded-full" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </SkeletonFrame>
  );
}
