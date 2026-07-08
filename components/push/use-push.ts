"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deletePushSubscription,
  isPushSubscribed,
  savePushSubscription,
} from "@/app/me/push-actions";

export type PushState = "loading" | "unsupported" | "denied" | "off" | "on";

/** VAPID 공개키(base64url) → subscribe 가 요구하는 Uint8Array (ArrayBuffer 백업) */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * 기기 푸시 구독 상태 + 켜기/끄기 로직. 토글(/me)과 알림 넛지 배너가 공유한다.
 * on/off 는 '현재 계정이 이 기기를 구독 중인지'(계정 기준)로 판단한다.
 */
export function usePush() {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!cancelled) setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      const mine = sub ? await isPushSubscribed(sub.endpoint) : false;
      if (!cancelled) setState(mine ? "on" : "off");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async (): Promise<boolean> => {
    if (!vapidKey) return false;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return false;
      }
      const reg = await navigator.serviceWorker.ready;
      // 이미 브라우저 구독이 있으면 재사용(현재 계정 소유로 저장), 없으면 새로 구독
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }
      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      const res = await savePushSubscription({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
      });
      if (res.error) {
        setState("off");
        return false;
      }
      setState("on");
      return true;
    } catch (err) {
      console.warn("[push] 구독 실패", err);
      setState("off");
      return false;
    } finally {
      setBusy(false);
    }
  }, [vapidKey]);

  const disable = useCallback(async (): Promise<void> => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch (err) {
      console.warn("[push] 해제 실패", err);
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable };
}
