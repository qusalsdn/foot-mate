"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertTriangle,
  Ban,
  Loader2,
  Lock,
  RotateCcw,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteMatch, setMatchStatus } from "./actions";

function DeleteConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="destructive"
      disabled={pending}
      className="h-11 w-full rounded-2xl text-[15px] font-semibold"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          삭제 중…
        </>
      ) : (
        <>
          <Trash2 className="size-4" />
          매치 영구 삭제
        </>
      )}
    </Button>
  );
}

/** 운영진 전용 매치 관리 — 모집 마감/재개·취소·삭제 */
export function MatchManage({
  clubId,
  matchId,
  status,
}: {
  clubId: string;
  matchId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const deleteMatchWithId = deleteMatch.bind(null, clubId, matchId);

  function change(next: string) {
    startTransition(async () => {
      await setMatchStatus(clubId, matchId, next);
    });
  }

  const chip =
    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50";

  return (
    <div className="flex flex-wrap gap-2">
      {status === "scheduled" && (
        <button
          type="button"
          onClick={() => change("closed")}
          disabled={pending}
          className={`${chip} cursor-pointer border-amber-500/25 bg-amber-500/[0.08] text-amber-600 hover:bg-amber-500/[0.15]`}
        >
          <Lock className="size-4" />
          모집 마감
        </button>
      )}
      {status === "closed" && (
        <button
          type="button"
          onClick={() => change("scheduled")}
          disabled={pending}
          className={`${chip} cursor-pointer border-[#84cc16]/30 bg-[#84cc16]/[0.1] text-[#4d7c0f] hover:bg-[#84cc16]/[0.18]`}
        >
          <Unlock className="size-4" />
          모집 재개
        </button>
      )}
      {(status === "scheduled" || status === "closed") && (
        <button
          type="button"
          onClick={() => change("canceled")}
          disabled={pending}
          className={`${chip} cursor-pointer border-red-500/20 bg-red-500/[0.06] text-red-600 hover:bg-red-500/[0.12]`}
        >
          <Ban className="size-4" />
          매치 취소
        </button>
      )}
      {status === "canceled" && (
        <button
          type="button"
          onClick={() => change("scheduled")}
          disabled={pending}
          className={`${chip} cursor-pointer border-[#84cc16]/30 bg-[#84cc16]/[0.1] text-[#4d7c0f] hover:bg-[#84cc16]/[0.18]`}
        >
          <RotateCcw className="size-4" />
          취소 해제
        </button>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${chip} cursor-pointer border-red-500/20 bg-red-500/[0.06] text-red-600 hover:bg-red-500/[0.12]`}
      >
        <Trash2 className="size-4" />
        삭제
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-match-title"
            className="relative w-full max-w-md rounded-3xl border border-slate-900/[0.08] bg-white p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-700"
              aria-label="닫기"
            >
              <X className="size-4" />
            </button>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
              <AlertTriangle className="size-6" />
            </span>
            <h2
              id="delete-match-title"
              className="mt-4 text-lg font-bold text-slate-900"
            >
              매치를 삭제할까요?
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              참석 응답과 경기 결과·기록이{" "}
              <b className="font-semibold text-red-600">모두 삭제</b>돼요. 이
              작업은 되돌릴 수 없어요.
            </p>
            <form action={deleteMatchWithId} className="mt-5">
              <DeleteConfirmButton />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
