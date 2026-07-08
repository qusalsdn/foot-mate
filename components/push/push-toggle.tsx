"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import {
  deletePushSubscription,
  savePushSubscription,
} from "@/app/me/push-actions";

/** VAPID 공개키(base64url) → subscribe 가 요구하는 Uint8Array (ArrayBuffer 백업) */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State = "loading" | "unsupported" | "off" | "on" | "denied";

/**
 * 기기 푸시 알림 켜기/끄기 토글. 권한 요청 → pushManager.subscribe → 서버에 구독 저장.
 * 앱이 꺼져 있어도 알림을 받으려면 이걸 켜야 한다(브라우저/기기별로 1회).
 */
export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })();
  }, []);

  async function enable() {
    if (!vapidKey) {
      alert("푸시 설정이 완료되지 않았어요(VAPID 키 없음).");
      return;
    }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      const res = await savePushSubscription({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
      });
      if (res.error) {
        await sub.unsubscribe();
        alert(res.error);
        setState("off");
        return;
      }
      setState("on");
    } catch (err) {
      console.warn("[push] 구독 실패", err);
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
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
  }

  const on = state === "on";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-900/[0.06] bg-white/80 p-4 shadow-sm backdrop-blur-xl">
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
          on
            ? "bg-[#84cc16]/12 text-[#4d7c0f]"
            : "bg-slate-900/[0.04] text-slate-400"
        }`}
      >
        {on ? <Bell className="size-5" /> : <BellOff className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">기기 푸시 알림</p>
        <p className="text-xs text-slate-400">
          {state === "unsupported"
            ? "이 브라우저는 푸시를 지원하지 않아요."
            : state === "denied"
              ? "브라우저 설정에서 알림이 차단돼 있어요. 사이트 권한을 허용해주세요."
              : on
                ? "앱을 닫아도 이 기기로 알림이 와요."
                : "앱이 꺼져 있어도 알림을 받으려면 켜세요."}
        </p>
      </div>

      {state !== "loading" && state !== "unsupported" && state !== "denied" && (
        <button
          type="button"
          onClick={on ? disable : enable}
          disabled={busy}
          className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-60 ${
            on
              ? "border border-slate-900/10 bg-white text-slate-600 hover:bg-slate-900/[0.03]"
              : "bg-gradient-to-br from-[#bef264] to-[#84cc16] text-[#1a2e05] shadow-md shadow-[#a3e635]/40 ring-1 ring-inset ring-white/50 hover:from-[#d9f99d] hover:to-[#a3e635]"
          }`}
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          {on ? "끄기" : "켜기"}
        </button>
      )}
    </div>
  );
}
