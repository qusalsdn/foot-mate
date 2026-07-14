"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Check, Loader2, LogOut, X } from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";
import { signOutOtherDevices } from "./actions";

/**
 * 다른 기기 모두 로그아웃 (/me 보안 섹션).
 * 현재 기기는 유지하고 나머지 세션만 폐기(`scope: "others"`) — 확인 다이얼로그 경유.
 */
export function SignOutOthers() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await signOutOtherDevices();
      if (res.error) {
        setError(res.error);
        return;
      }
      setDone(true);
      setOpen(false);
    });
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-900/[0.06] bg-white/80 p-4 shadow-sm backdrop-blur-xl">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900/[0.04] text-slate-400">
          <LogOut className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">
            다른 기기 모두 로그아웃
          </p>
          <p className="text-xs text-slate-400">
            {done
              ? "다른 기기의 로그인을 모두 해제했어요. 이 기기는 그대로예요."
              : "이 기기는 유지하고 나머지 기기·브라우저의 로그인을 해제해요."}
          </p>
        </div>

        {done ? (
          <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#84cc16]/12 px-3.5 text-sm font-semibold text-[#4d7c0f]">
            <Check className="size-4" />
            완료
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setOpen(true);
            }}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-slate-900/10 bg-white px-3.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-900/[0.03]"
          >
            해제
          </button>
        )}
      </div>

      {open && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => !pending && setOpen(false)}
              aria-hidden
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="signout-others-title"
              className="relative w-full max-w-md rounded-3xl border border-slate-900/[0.08] bg-white p-6 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-50"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>

              <span className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                <AlertTriangle className="size-6" />
              </span>
              <h2
                id="signout-others-title"
                className="mt-4 text-lg font-bold text-slate-900"
              >
                다른 기기를 모두 로그아웃할까요?
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                지금 보고 있는 <b className="font-semibold text-slate-700">이
                기기는 유지</b>되고, 그 외 모든 기기·브라우저의 로그인이
                해제됩니다. 해당 기기에서는 다시 로그인해야 해요.
              </p>

              {error && (
                <p className="mt-3 rounded-xl bg-red-500/[0.06] px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <div className="mt-5 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="h-11 flex-1 cursor-pointer rounded-2xl border border-slate-900/10 bg-white text-[15px] font-semibold text-slate-600 transition-colors hover:bg-slate-900/[0.03] disabled:pointer-events-none disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={pending}
                  className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-[#bef264] to-[#84cc16] text-[15px] font-semibold text-[#1a2e05] shadow-md shadow-[#a3e635]/40 ring-1 ring-inset ring-white/50 transition-colors hover:from-[#d9f99d] hover:to-[#a3e635] disabled:pointer-events-none disabled:opacity-60"
                >
                  {pending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      해제 중…
                    </>
                  ) : (
                    "모두 로그아웃"
                  )}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
