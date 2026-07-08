"use client";

import { useTransition } from "react";
import { BadgeCheck, Loader2, Send, X } from "lucide-react";
import { requestPayment, withdrawPaymentRequest } from "./actions";

/**
 * 회원 본인 미납 항목의 '납부 완료 요청' 토글 버튼.
 * 요청 전 → "납부 완료 요청" 보내기, 요청 후 → "요청됨(승인 대기)" + 취소.
 * 실제 납부 확정은 운영진이 하므로 여기선 요청 표시만 남긴다.
 */
export function RequestButton({
  clubId,
  paymentId,
  requested,
}: {
  clubId: string;
  paymentId: string;
  requested: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (requested) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-600">
          <BadgeCheck className="size-3.5" />
          승인 대기
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await withdrawPaymentRequest(clubId, paymentId);
            })
          }
          aria-label="납부 완료 요청 취소"
          title="요청 취소"
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full border border-slate-900/10 bg-white text-slate-400 transition-colors hover:border-slate-900/20 hover:text-slate-600 disabled:pointer-events-none disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <X className="size-3.5" />
          )}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await requestPayment(clubId, paymentId);
        })
      }
      className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[#84cc16]/40 bg-[#84cc16]/12 px-2.5 py-1 text-xs font-semibold text-[#4d7c0f] transition-colors hover:bg-[#84cc16]/20 disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Send className="size-3.5" />
      )}
      납부 완료 요청
    </button>
  );
}
