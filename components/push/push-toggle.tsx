"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { usePush } from "./use-push";

/**
 * 기기 푸시 알림 켜기/끄기 토글 (/me). 상태·구독 로직은 usePush 훅에 위임한다.
 * on/off 는 '현재 계정이 이 기기를 구독 중인지'로 판단한다.
 */
export function PushToggle() {
  const { state, busy, enable, disable } = usePush();
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
