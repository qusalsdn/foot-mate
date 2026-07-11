"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalPortal } from "@/components/ui/modal-portal";
import { deletePost, deleteComment } from "../actions";

/** 게시글 수정·삭제 메뉴 (작성자 본인 또는 회장·총무에게만 노출). */
export function PostMenu({
  clubId,
  postId,
}: {
  clubId: string;
  postId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deletePost(clubId, postId);
      // 성공하면 액션이 목록으로 redirect 하므로 여기 도달하지 않는다.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Link
          href={`/clubs/${clubId}/community/${postId}/edit`}
          className="inline-flex items-center gap-1 rounded-full border border-slate-900/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-900/[0.03] hover:text-slate-700"
        >
          <Pencil className="size-3.5" />
          수정
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-red-500/20 bg-red-500/[0.06] px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/[0.12]"
        >
          <Trash2 className="size-3.5" />
          삭제
        </button>
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
              aria-labelledby="delete-post-title"
              className="relative w-full max-w-sm rounded-3xl border border-slate-900/[0.08] bg-white p-6 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => !pending && setOpen(false)}
                className="absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-700"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>

              <span className="flex size-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
                <AlertTriangle className="size-6" />
              </span>
              <h2
                id="delete-post-title"
                className="mt-4 text-lg font-bold text-slate-900"
              >
                글을 삭제할까요?
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                이 글과 달린 댓글이 모두 삭제돼요. 되돌릴 수 없어요.
              </p>

              {error && (
                <p className="mt-3 text-sm text-red-600">{error}</p>
              )}

              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={onDelete}
                className="mt-5 h-11 w-full rounded-2xl text-[15px] font-semibold"
              >
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    삭제 중…
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" />
                    글 삭제
                  </>
                )}
              </Button>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}

/** 댓글 삭제 버튼 — 인라인 2단계 확인(휴지통 → 확인/취소). */
export function CommentDeleteButton({
  clubId,
  postId,
  commentId,
}: {
  clubId: string;
  postId: string;
  commentId: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      await deleteComment(clubId, postId, commentId);
      setConfirming(false);
    });
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          aria-label="댓글 삭제 확인"
          className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-red-500/10 text-red-600 transition-colors hover:bg-red-500/20 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          aria-label="삭제 취소"
          className="flex size-7 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-600"
        >
          <X className="size-3.5" />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label="댓글 삭제"
      className="flex size-7 cursor-pointer items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-500"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
