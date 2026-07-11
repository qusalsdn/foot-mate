"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Circle,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import {
  formatWon,
  paymentTypeLabel,
  PAYMENT_STATUS_BADGE,
} from "@/lib/constants/finance";
import {
  deleteMonthlyPeriod,
  deletePayment,
  setPaymentStatus,
} from "./actions";
import { ModalPortal } from "@/components/ui/modal-portal";

export type PayRow = {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  type: string;
  period: string | null; // null = 매치비·기타 (행에 종류 뱃지 표시)
  amount: number;
  status: string;
  requestedAt: string | null; // 회원이 납부 완료 요청을 남긴 시각 (승인 대기 표시)
};

export type PeriodGroup = {
  key: string;
  period: string | null; // null = 매치비·기타 묶음
  label: string;
  rows: PayRow[];
  totalAmount: number;
  paidAmount: number;
  unpaidCount: number;
};

type Confirm =
  | { type: "row"; row: PayRow }
  | { type: "period"; group: PeriodGroup };

/**
 * 회장·총무용 정산 관리. 기간별로 묶어 회원별 납부 상태 토글·삭제를 제공한다.
 * 모든 동작의 권한은 RLS `pay admin`(can_manage_club)이 서버에서 강제한다.
 */
export function PaymentManager({
  clubId,
  groups,
}: {
  clubId: string;
  groups: PeriodGroup[];
}) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  // 개별 토글 중인 행 id (스피너 표시용)
  const [busyId, setBusyId] = useState<string | null>(null);

  function toggle(row: PayRow) {
    setBusyId(row.id);
    startTransition(async () => {
      await setPaymentStatus(clubId, row.id, row.status !== "paid");
      setBusyId(null);
    });
  }

  function runConfirm() {
    if (!confirm) return;
    startTransition(async () => {
      if (confirm.type === "row") await deletePayment(clubId, confirm.row.id);
      else if (confirm.group.period)
        await deleteMonthlyPeriod(clubId, confirm.group.period);
      setConfirm(null);
    });
  }

  return (
    <>
      <div className="space-y-4">
        {groups.map((g) => {
          const rate =
            g.totalAmount > 0
              ? Math.round((g.paidAmount / g.totalAmount) * 100)
              : 0;
          return (
            <section
              key={g.key}
              className="overflow-hidden rounded-2xl border border-slate-900/[0.06] bg-white/80 shadow-sm backdrop-blur-xl"
            >
              <header className="flex items-center gap-3 border-b border-slate-900/[0.06] px-4 py-3">
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    {g.label}
                    {g.unpaidCount > 0 ? (
                      <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600">
                        미납 {g.unpaidCount}
                      </span>
                    ) : (
                      <span className="rounded-full border border-[#84cc16]/30 bg-[#84cc16]/12 px-2 py-0.5 text-xs font-semibold text-[#4d7c0f]">
                        완납
                      </span>
                    )}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {formatWon(g.paidAmount)} / {formatWon(g.totalAmount)} 걷힘 ·{" "}
                    {rate}%
                  </p>
                </div>
                {g.period && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setConfirm({ type: "period", group: g })}
                    aria-label={`${g.label} 부과 전체 삭제`}
                    title="이 기간 부과 전체 삭제"
                    className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-900/10 bg-white text-slate-400 transition-colors hover:border-red-500/30 hover:bg-red-500/[0.06] hover:text-red-500 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </header>

              <ul className="divide-y divide-slate-900/[0.04]">
                {g.rows.map((row) => {
                  const paid = row.status === "paid";
                  const busy = busyId === row.id;
                  return (
                    <li
                      key={row.id}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      {row.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.avatarUrl}
                          alt={row.name}
                          referrerPolicy="no-referrer"
                          className="size-9 shrink-0 rounded-full object-cover ring-1 ring-slate-900/10"
                        />
                      ) : (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#84cc16]/15 text-sm font-bold text-[#4d7c0f]">
                          {row.name.charAt(0)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-700">
                          {row.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {row.period === null && (
                            <span className="mr-1 font-semibold text-slate-500">
                              {paymentTypeLabel(row.type)}
                            </span>
                          )}
                          {formatWon(row.amount)}
                        </p>
                      </div>

                      {/* 회원이 납부 완료 요청을 남긴 경우 — 운영진 승인 대기 */}
                      {!paid && row.requestedAt && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-1 text-xs font-semibold text-sky-600">
                          <BadgeCheck className="size-3.5" />
                          요청
                        </span>
                      )}

                      {/* 납부 상태 토글 */}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => toggle(row)}
                        aria-label={`${row.name} ${paid ? "미납으로 되돌리기" : "납부 처리"}`}
                        className={`inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 ${PAYMENT_STATUS_BADGE[row.status]}`}
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : paid ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          <Circle className="size-3.5" />
                        )}
                        {paid ? "납부" : "미납"}
                      </button>

                      {/* 개별 삭제 */}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setConfirm({ type: "row", row })}
                        aria-label={`${row.name} 항목 삭제`}
                        title="삭제"
                        className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-900/10 bg-white text-slate-400 transition-colors hover:border-red-500/30 hover:bg-red-500/[0.06] hover:text-red-500 disabled:pointer-events-none disabled:opacity-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {confirm && (
        <ConfirmDialog
          confirm={confirm}
          pending={pending}
          onCancel={() => setConfirm(null)}
          onConfirm={runConfirm}
        />
      )}
    </>
  );
}

function ConfirmDialog({
  confirm,
  pending,
  onCancel,
  onConfirm,
}: {
  confirm: Confirm;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isPeriod = confirm.type === "period";
  const title = isPeriod ? "이 기간 부과를 삭제할까요?" : "항목을 삭제할까요?";

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onCancel}
          aria-hidden
        />
        <div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-md rounded-3xl border border-slate-900/[0.08] bg-white p-6 shadow-2xl"
        >
          <button
            type="button"
            onClick={onCancel}
            className="absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-700"
            aria-label="닫기"
          >
            <X className="size-4" />
          </button>

          <span className="flex size-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
            <AlertTriangle className="size-6" />
          </span>

          <h2 className="mt-4 text-lg font-bold text-slate-900">{title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            {isPeriod ? (
              <>
                <b className="font-semibold text-slate-700">{confirm.group.label}</b>{" "}
                월회비 부과{" "}
                <b className="font-semibold text-slate-700">
                  {confirm.group.rows.length}건
                </b>
                을 모두 삭제합니다. 되돌릴 수 없어요.
              </>
            ) : (
              <>
                <b className="font-semibold text-slate-700">{confirm.row.name}</b> 님의{" "}
                <b className="font-semibold text-slate-700">
                  {formatWon(confirm.row.amount)}
                </b>{" "}
                항목을 삭제합니다. 되돌릴 수 없어요.
              </>
            )}
          </p>

          <div className="mt-5 flex gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="h-11 flex-1 cursor-pointer rounded-2xl border border-slate-900/10 bg-white text-[15px] font-semibold text-slate-600 transition-colors hover:bg-slate-900/[0.03] disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-2xl bg-red-500 text-[15px] font-semibold text-white shadow-md shadow-red-500/25 transition-all hover:-translate-y-0.5 hover:bg-red-600 disabled:pointer-events-none disabled:opacity-60"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              삭제
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
