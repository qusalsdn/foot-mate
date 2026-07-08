"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * 알림 진입 벨 + 안읽음 뱃지. 자기완결형 — userId 만 주면 스스로
 * (1) 안읽음 개수를 조회하고 (2) 내 알림 변경을 실시간 구독해 개수·화면을 갱신한다.
 * 그래서 어느 페이지 헤더든 <NotificationBell userId=.. /> 한 줄로 넣을 수 있다.
 *
 * 실시간은 RLS("noti own")를 통과해야 하므로 세션 토큰을 realtime.setAuth 로 심은 뒤 구독한다.
 * 이벤트가 오면 개수를 다시 세고 router.refresh() 로 서버 컴포넌트(목록·뱃지)도 갱신한다.
 */
export function NotificationBell({
  userId,
  ringBg = "#f6f8f4",
}: {
  userId: string;
  ringBg?: string;
}) {
  const router = useRouter();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    async function fetchCount() {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);
      if (!cancelled) setCount(count ?? 0);
    }

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);
      await fetchCount();

      channel = supabase
        .channel(`noti-bell:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            fetchCount();
            router.refresh();
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return (
    <Link
      href="/notifications"
      title="알림"
      aria-label={count > 0 ? `알림 ${count}개` : "알림"}
      className="relative flex size-9 items-center justify-center rounded-full text-slate-400 outline-none transition-colors hover:bg-slate-900/5 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-[#84cc16]/50"
    >
      <Bell className="size-4.5" />
      {count > 0 && (
        <span
          style={{ boxShadow: `0 0 0 2px ${ringBg}` }}
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#84cc16] px-1 text-[10px] font-bold text-[#1a2e05]"
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
