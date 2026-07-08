"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * 내 알림(notifications) 변경을 실시간 구독해 화면을 갱신한다.
 * 이벤트가 오면 payload 를 직접 쓰지 않고 router.refresh() 로 서버 컴포넌트를
 * 다시 렌더 → 벨 안읽음 개수·알림 목록이 최신값으로 바뀐다(서버가 진실의 원천).
 *
 * 중요: notifications 엔 RLS("noti own")가 걸려 있어, realtime 소켓이 '사용자 JWT'로
 * 인증돼야 본인 행 변경을 받는다. @supabase/ssr 브라우저 클라이언트는 쿠키 세션을
 * 비동기로 읽으므로, getSession 으로 토큰을 확보해 realtime.setAuth() 로 심은 뒤 구독한다.
 * (인증 없이 붙으면 anon 권한이라 RLS 에 막혀 이벤트가 아예 오지 않는다.)
 */
export function NotificationsRealtime({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            router.refresh();
          },
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            // 구독 실패 시 콘솔로 원인 파악 (Realtime 미활성/토큰 문제 등)
            console.warn("[notifications realtime]", status);
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}
