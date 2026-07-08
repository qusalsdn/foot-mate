"use server";

import { createClient } from "@/lib/supabase/server";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type PushResult = { error?: string };

/**
 * 브라우저 푸시 구독 저장. push_subscriptions RLS("push own")가 본인 것만 쓰도록 강제한다.
 * endpoint 는 unique — 같은 기기가 재구독하면 키만 갱신(upsert).
 */
export async function savePushSubscription(
  sub: PushSubscriptionInput,
): Promise<PushResult> {
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { error: "구독 정보가 올바르지 않아요" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) return { error: "구독을 저장하지 못했어요" };
  return {};
}

/** 푸시 구독 해제 — 해당 기기의 endpoint 행 삭제. */
export async function deletePushSubscription(
  endpoint: string,
): Promise<PushResult> {
  if (!endpoint) return {};
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) return { error: "구독을 해제하지 못했어요" };
  return {};
}
