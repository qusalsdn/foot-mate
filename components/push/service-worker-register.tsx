"use client";

import { useEffect } from "react";

/**
 * 서비스워커(/sw.js) 등록. 앱 전역(layout)에 마운트해 모든 페이지에서 한 번 등록한다.
 * 등록돼 있어야 Web Push 구독(pushManager.subscribe)과 백그라운드 알림 수신이 가능하다.
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
