"use client";

import { useEffect, useState } from "react";
import { Download, Plus, Share, X } from "lucide-react";

// 안드로이드/데스크톱 크롬이 발생시키는 설치 프롬프트 이벤트 (표준 타입엔 없어 직접 정의)
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "footmate:install-dismissed";

/**
 * PWA 설치 유도 배너.
 * - 안드로이드/데스크톱 크롬: beforeinstallprompt 를 잡아 "설치" 버튼 → 네이티브 설치창
 * - iOS 사파리: 해당 이벤트가 없어 "공유 → 홈 화면에 추가" 안내를 대신 노출
 * 이미 설치(standalone)됐거나 사용자가 닫았으면 렌더하지 않는다.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [mode, setMode] = useState<"hidden" | "android" | "ios">("hidden");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 이미 홈 화면 앱(standalone)이면 노출 안 함
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    if (standalone) return;

    // 사용자가 이전에 닫았으면 노출 안 함
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // localStorage 접근 불가(프라이빗 모드 등) — 무시하고 진행
    }

    // iOS 사파리 감지 (크롬/파폭 iOS 는 홈 화면 추가로 푸시가 안 되므로 사파리만)
    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    // 클라이언트에서만 가능한 UA/standalone 감지라 마운트 후 노출한다(SSR 하이드레이션 불일치 방지).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isIOS && isSafari) setMode("ios");

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // 미니 인포바 억제 → 우리 버튼으로 유도
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("android");
    };
    const onInstalled = () => {
      setMode("hidden");
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        // 무시
      }
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setMode("hidden");
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // 무시
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setMode("hidden");
  }

  if (mode === "hidden") return null;

  return (
    <div className="relative mb-6 flex items-center gap-3.5 overflow-hidden rounded-2xl border border-[#84cc16]/25 bg-white/80 p-4 shadow-sm backdrop-blur-xl">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#84cc16]/12 text-[#4d7c0f]">
        <Download className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">앱으로 설치하기</p>
        {mode === "android" ? (
          <p className="text-xs text-slate-400">
            홈 화면에서 바로 열고 알림도 받아요.
          </p>
        ) : (
          <p className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-slate-400">
            <span className="inline-flex items-center gap-0.5">
              공유
              <Share className="size-3.5 text-[#65a30d]" />
            </span>
            →
            <span className="inline-flex items-center gap-0.5">
              홈 화면에 추가
              <Plus className="size-3.5 text-[#65a30d]" />
            </span>
            <span>하면 알림을 받을 수 있어요.</span>
          </p>
        )}
      </div>

      {mode === "android" && (
        <button
          type="button"
          onClick={install}
          className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-br from-[#bef264] to-[#84cc16] px-4 text-sm font-semibold text-[#1a2e05] shadow-md shadow-[#a3e635]/40 ring-1 ring-inset ring-white/50 transition-all hover:-translate-y-0.5 hover:from-[#d9f99d] hover:to-[#a3e635]"
        >
          설치
        </button>
      )}

      <button
        type="button"
        onClick={dismiss}
        aria-label="닫기"
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-700"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
