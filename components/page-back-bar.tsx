import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NotificationBell } from "./notification-bell";

/**
 * 페이지 상단 공통 바: 왼쪽 뒤로가기 링크 + 오른쪽 알림 벨.
 * 각 페이지가 제각각 뒤로가기만 두던 것을 표준화해, 어느 화면에서든 알림에 접근할 수 있게 한다.
 * (홈은 자체 헤더가 있어 이걸 쓰지 않고 벨만 직접 넣는다.)
 */
export function PageBackBar({
  href,
  label,
  userId,
}: {
  href: string;
  label: React.ReactNode;
  userId: string;
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      <Link
        href={href}
        className="group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-900/5 hover:text-slate-800"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        {label}
      </Link>
      <NotificationBell userId={userId} />
    </div>
  );
}
