import type { ReactNode } from "react";

/**
 * 로딩 스켈레톤 프리미티브.
 * 글래스+라임 톤에 맞춰 은은한 라임 틴트 블록 + `footmate-shimmer` 스윕(globals.css).
 * 페이지 이동 시 `loading.tsx`가 이 조각들로 즉시 전환 UI를 그려 체감 딜레이를 없앤다.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-900/[0.055] ${className}`}>
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent [animation:footmate-shimmer_1.6s_ease-in-out_infinite]"
      />
    </div>
  );
}

/** 정적 글래스 카드 레시피를 그대로 쓴 스켈레톤 카드 컨테이너. */
export function SkeletonCard({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`rounded-3xl border border-slate-900/[0.06] bg-white/80 p-5 shadow-sm backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * 페이지 배경 프레임(홈·클럽 등과 동일한 오브+그리드).
 * `loading.tsx`는 페이지 대신 렌더되므로 배경까지 스스로 그려야 프레임이 안 깜빡인다.
 */
export function SkeletonFrame({
  children,
  width = "max-w-2xl",
}: {
  children: ReactNode;
  width?: string;
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#f6f8f4] text-slate-900">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,#a3e635_0%,transparent_65%)] opacity-25 blur-3xl [animation:footmate-drift_16s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-40 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,#34d399_0%,transparent_65%)] opacity-[0.18] blur-3xl [animation:footmate-drift_20s_ease-in-out_infinite_reverse]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(#0f172a0d_1px,transparent_1px),linear-gradient(90deg,#0f172a0d_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_top,#000_20%,transparent_70%)]"
      />
      <div className={`relative mx-auto w-full ${width} px-4 py-8 sm:py-10`}>{children}</div>
    </div>
  );
}

/** 상단 바(로고 자리 + 우측 액션) 스켈레톤 — 대부분 페이지 공통. */
export function SkeletonHeader() {
  return (
    <header className="mb-8 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-9 rounded-xl" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="size-9 rounded-full" />
      </div>
    </header>
  );
}
