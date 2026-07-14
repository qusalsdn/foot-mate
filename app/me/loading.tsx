import { Skeleton, SkeletonCard, SkeletonFrame } from "@/components/ui/skeleton";

// 내 프로필: 헤더 + 아바타/이름·연락처 폼 + 알림 토글
export default function MeLoading() {
  return (
    <SkeletonFrame width="max-w-lg">
      <div className="mb-6 flex items-center gap-2.5">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-6 w-24" />
      </div>

      {/* 프로필 폼 */}
      <SkeletonCard className="mb-6">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Skeleton className="size-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-11 w-full rounded-2xl" />
            </div>
          ))}
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
      </SkeletonCard>

      {/* 알림 토글 */}
      <SkeletonCard className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="h-7 w-12 rounded-full" />
      </SkeletonCard>
    </SkeletonFrame>
  );
}
