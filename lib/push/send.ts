import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushPayload = {
  title: string;
  body?: string;
  link?: string;
  tag?: string;
};

let configured = false;
function configure() {
  if (configured) return;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    throw new Error("VAPID 환경변수가 설정되지 않았습니다");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

/**
 * 한 사용자의 모든 기기 구독으로 Web Push 발송.
 * 만료(404/410)된 구독은 정리한다. RLS 를 우회해야 하므로 admin 클라이언트로 조회한다.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; failed: number; subscriptions: number }> {
  configure();
  const supabase = createAdminClient();

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subs || subs.length === 0) {
    console.warn("[push] 구독 없음", { userId });
    return { sent: 0, failed: 0, subscriptions: 0 };
  }

  const body = JSON.stringify(payload);
  const expired: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    (subs as { endpoint: string; p256dh: string; auth: string }[]).map(
      async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
          );
          sent++;
        } catch (err) {
          failed++;
          const e = err as { statusCode?: number; body?: string };
          // 발송 실패 원인을 로그로 남긴다 (VAPID 불일치=403, 형식 오류 등)
          console.error("[push] 발송 실패", {
            statusCode: e?.statusCode,
            body: e?.body,
            endpoint: s.endpoint.slice(0, 40),
          });
          // 구독 만료/삭제 → 정리 대상
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            expired.push(s.endpoint);
          }
        }
      },
    ),
  );

  if (expired.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", expired);
  }
  return { sent, failed, subscriptions: subs.length };
}
