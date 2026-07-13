"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, X } from "lucide-react";
import { usePush } from "./use-push";

const dismissKey = (userId: string) => `footmate:noti-nudge-dismissed:${userId}`;

/**
 * 알림 켜기 유도 배너 (홈). 현재 계정이 이 기기에서 푸시 미구독일 때만 소프트하게 노출한다.
 * - 클릭 시 권한 요청 + 구독 (즉시 네이티브 prompt 로 밀지 않음 → 거부율 방지)
 * - 닫으면 계정별로 기억(userId 키)해 다시 띄우지 않음(hard-block 유발 방지)
 * - 미지원/차단(denied)/이미 켜짐이면 노출 안 함. iOS 사파리(미설치)는 미지원이라 자동 숨김
 *   → 그 경우 먼저 설치 배너(InstallPrompt)가 유도한다.
 */
export function NotificationNudge({ userId }: { userId: string }) {
  const { state, busy, enable } = usePush();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let d = false;
    try {
      d = !!localStorage.getItem(dismissKey(userId));
    } catch {
      d = false;
    }
    // 닫음 여부는 클라이언트 전용(localStorage)이라 마운트 후 반영한다(하이드레이션 불일치 방지).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(d);
  }, [userId]);

  if (state !== "off" || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(dismissKey(userId), "1");
    } catch {
      // 무시
    }
  }

  return (
    <div className="relative mb-6 flex items-center gap-3.5 overflow-hidden rounded-2xl border border-[#84cc16]/25 bg-white/80 p-4 shadow-sm backdrop-blur-xl">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#84cc16]/12 text-[#4d7c0f]">
        <Bell className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">알림 받기</p>
        <p className="text-xs text-slate-400">회비·매치·공지사항 소식을 이 기기로 바로 받아보세요.</p>
      </div>

      <button
        type="button"
        onClick={() => enable()}
        disabled={busy}
        className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-br from-[#bef264] to-[#84cc16] px-4 text-sm font-semibold text-[#1a2e05] shadow-md shadow-[#a3e635]/40 ring-1 ring-inset ring-white/50 transition-all hover:-translate-y-0.5 hover:from-[#d9f99d] hover:to-[#a3e635] disabled:pointer-events-none disabled:opacity-60"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        켜기
      </button>

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
