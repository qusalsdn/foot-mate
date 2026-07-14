import { Skeleton, SkeletonCard, SkeletonFrame } from "@/components/ui/skeleton";

// 알림 목록
export default function NotificationsLoading() {
  return (
    <SkeletonFrame>
      <div className="mb-6 flex items-center gap-2.5">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-6 w-20" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} className="flex items-start gap-3">
            <Skeleton className="size-10 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-20" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </SkeletonFrame>
  );
}
