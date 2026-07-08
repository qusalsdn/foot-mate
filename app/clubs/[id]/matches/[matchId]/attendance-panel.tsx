"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Check, HelpCircle, Loader2, X } from "lucide-react";
import { voteAttendance } from "./actions";

type Choice = "attending" | "maybe" | "absent";

const OPTIONS: {
  value: Choice;
  label: string;
  icon: typeof Check;
  active: string;
}[] = [
  {
    value: "attending",
    label: "참석",
    icon: Check,
    active: "border-[#84cc16] bg-[#84cc16] text-[#1a2e05] shadow-md shadow-[#84cc16]/30",
  },
  {
    value: "maybe",
    label: "미정",
    icon: HelpCircle,
    active: "border-amber-400 bg-amber-400 text-amber-950 shadow-md shadow-amber-400/30",
  },
  {
    value: "absent",
    label: "불참",
    icon: X,
    active: "border-red-400 bg-red-500 text-white shadow-md shadow-red-500/25",
  },
];

export function AttendancePanel({
  clubId,
  matchId,
  myStatus,
  votable,
  willWaitlist,
}: {
  clubId: string;
  matchId: string;
  myStatus: Choice | null;
  votable: boolean;
  /** 지금 '참석'을 누르면 대기자로 들어가는 상태(정원 마감)인지 */
  willWaitlist: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // 낙관적 하이라이트 (서버 revalidate 전까지 즉시 반영)
  const [optimistic, setOptimistic] = useState<Choice | null>(myStatus);
  const current = optimistic;

  function choose(value: Choice) {
    if (pending || !votable || value === current) return;
    setError(null);
    setOptimistic(value);
    startTransition(async () => {
      const res = await voteAttendance(clubId, matchId, value);
      if (res?.error) {
        setError(res.error);
        setOptimistic(myStatus); // 실패 시 되돌림
      }
    });
  }

  if (!votable) {
    return (
      <div className="rounded-2xl border border-slate-900/[0.06] bg-white/70 px-4 py-3 text-sm text-slate-500 backdrop-blur-xl">
        참석 투표가 마감되었어요.
        {myStatus && (
          <span className="ml-1 font-semibold text-slate-700">
            내 응답: {OPTIONS.find((o) => o.value === myStatus)?.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => {
          const isActive = current === o.value;
          const Icon = o.icon;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => choose(o.value)}
              disabled={pending}
              aria-pressed={isActive}
              className={`flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                isActive
                  ? o.active
                  : "border-slate-900/10 bg-white/70 text-slate-600 hover:border-slate-900/20 hover:bg-white"
              }`}
            >
              {pending && isActive ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Icon className="size-4" />
              )}
              {o.label}
            </button>
          );
        })}
      </div>

      {willWaitlist && current !== "attending" && (
        <p className="mt-2 text-xs text-amber-600">
          정원이 찼어요. 지금 참석하면 대기자로 등록돼요.
        </p>
      )}
      {current === "attending" && (
        <p className="mt-2 text-xs text-[#4d7c0f]">참석으로 등록됐어요 ⚽</p>
      )}
      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
