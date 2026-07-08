"use client";

import { useEffect } from "react";

/**
 * 서비스워커(/sw.js) 등록. 앱 전역(layout)에 마운트해 모든 페이지에서 한 번 등록한다.
 * 등록돼 있어야 Web Push 구독(pushManager.subscribe)과 백그라운드 알림 수신이 가능하다.
 *
 * 구독 소유권은 '계정 기준'으로 명시적으로만 바꾼다(자동 이전 안 함):
 * 켜기는 PushToggle 에서, 로그아웃 정리는 SignOutButton 에서 처리한다.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[sw] 등록 실패", err);
    });
  }, []);

  return null;
}
