"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markNotificationRead } from "./actions";

/**
 * 알림 한 줄 (클릭 시 읽음 처리 후 link 로 이동).
 * 시각 마크업은 서버(페이지)에서 만들어 children 으로 넘기고, 여기선 클릭 동작만 담당한다.
 */
export function NotificationItem({
  id,
  link,
  unread,
  onRead,
  children,
}: {
  id: string;
  link: string | null;
  unread: boolean;
  /** 읽음 처리 직후 호출(목록의 낙관적 업데이트용). 과거 페이지 항목도 즉시 반영된다. */
  onRead?: (id: string) => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      if (unread) {
        onRead?.(id);
        await markNotificationRead(id);
      }
      if (link) router.push(link);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="block w-full cursor-pointer text-left outline-none disabled:opacity-60"
    >
      {children}
    </button>
  );
}
