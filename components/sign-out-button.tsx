"use client";

import { useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { deletePushSubscription } from "@/app/me/push-actions";
import { Button } from "@/components/ui/button";

/**
 * 로그아웃 버튼. 세션을 끊기 전에 이 기기의 푸시 구독을 정리한다 —
 * 구독은 계정이 아니라 기기에 묶이므로, 로그아웃 후에도 남으면 이전 사용자의 알림이
 * 이 기기로 계속 온다. 그래서 DB 행 삭제 + 브라우저 unsubscribe 후 signout 을 POST 한다.
 */
export function SignOutButton() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          // 아직 로그인 상태에서 내 구독 행을 지운 뒤, 브라우저 구독도 해제
          await deletePushSubscription(sub.endpoint);
          await sub.unsubscribe();
        }
      }
    } catch (err) {
      console.warn("[signout] 구독 정리 실패", err);
    }
    // 네이티브 submit → /auth/signout POST → 303 리다이렉트(onSubmit 안 탐, 루프 없음)
    formRef.current?.submit();
  }

  return (
    <form
      ref={formRef}
      action="/auth/signout"
      method="post"
      onSubmit={handleSubmit}
    >
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        disabled={pending}
        title="로그아웃"
        className="size-9 rounded-full text-slate-400 hover:bg-slate-900/5 hover:text-slate-700"
      >
        <LogOut className="size-4" />
      </Button>
    </form>
  );
}
