"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteClub } from "./actions";

function ConfirmButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="destructive"
      disabled={disabled || pending}
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
          클럽 영구 삭제
        </>
      )}
    </Button>
  );
}

/** 회장 전용 클럽 삭제 — 이름 재입력으로 오삭제를 방지한다. */
export function DeleteClubButton({
  clubId,
  clubName,
}: {
  clubId: string;
  clubName: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const deleteClubWithId = deleteClub.bind(null, clubId);
  const matched = confirmText.trim() === clubName.trim();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/[0.06] px-3.5 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/[0.12]"
      >
        <Trash2 className="size-4" />
        클럽 삭제
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          {/* 다이얼로그 */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-club-title"
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
              id="delete-club-title"
              className="mt-4 text-lg font-bold text-slate-900"
            >
              클럽을 삭제할까요?
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              <b className="font-semibold text-slate-700">{clubName}</b> 의 회원,
              매치, 회비, 게시글이 <b className="font-semibold text-red-600">모두
              영구 삭제</b>됩니다. 이 작업은 되돌릴 수 없어요.
            </p>

            <form action={deleteClubWithId} className="mt-5">
              <label
                htmlFor="confirm-name"
                className="mb-1.5 block text-xs font-medium text-slate-500"
              >
                확인을 위해 클럽 이름{" "}
                <b className="font-semibold text-slate-700">{clubName}</b> 을
                입력하세요
              </label>
              <input
                id="confirm-name"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                placeholder={clubName}
                className="mb-4 h-11 w-full rounded-2xl border border-slate-900/[0.1] bg-white px-4 text-sm outline-none transition-colors placeholder:text-slate-300 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/15"
              />
              <ConfirmButton disabled={!matched} />
            </form>
          </div>
        </div>
      )}
    </>
  );
}
