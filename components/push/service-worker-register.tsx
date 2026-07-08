"use client";

import { useEffect } from "react";
import { savePushSubscription } from "@/app/me/push-actions";

/**
 * 서비스워커(/sw.js) 등록 + 푸시 구독 소유권 재동기화. 앱 전역(layout)에 마운트한다.
 *
 * 왜 재동기화가 필요한가:
 *   푸시 구독은 계정이 아니라 기기/브라우저에 묶인다. 계정 A로 구독한 뒤 로그아웃하고
 *   B로 로그인하면, 이 기기의 구독 행(push_subscriptions)이 여전히 A 소유로 남는다 →
 *   B는 자기 알림을 못 받고, A의 알림이 (지금 B가 쓰는) 이 기기로 계속 간다.
 *   그래서 로드 때마다 기존 구독을 '현재 로그인 사용자' 소유로 upsert 해 자가 치유한다.
 *   (savePushSubscription 은 세션의 user_id 로 endpoint 를 upsert — 로그아웃 상태면 no-op)
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    (async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return;
        const json = sub.toJSON() as {
          endpoint?: string;
          keys?: { p256dh?: string; auth?: string };
        };
        if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
          // 이 기기 구독을 현재 로그인 사용자 소유로 이전(계정 전환 대비)
          await savePushSubscription({
            endpoint: json.endpoint,
            keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          });
        }
      } catch (err) {
        console.warn("[sw] 등록/구독 동기화 실패", err);
      }
    })();
  }, []);

  return null;
}
