import { Skeleton, SkeletonCard, SkeletonFrame } from "@/components/ui/skeleton";

// 회원 프로필 조회
export default function MemberProfileLoading() {
  return (
    <SkeletonFrame>
      <div className="mb-6 flex items-center gap-2.5">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-6 w-24" />
      </div>

      <SkeletonCard className="flex flex-col items-center gap-4 py-8">
        <Skeleton className="size-24 rounded-full" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </SkeletonCard>
    </SkeletonFrame>
  );
}
