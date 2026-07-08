"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Trophy,
} from "lucide-react";
import { saveResult } from "./actions";
import { Button } from "@/components/ui/button";

export type EditablePlayer = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  goals: number;
  assists: number;
};

/** −/+ 버튼 스텝퍼 (타이핑 대신 버튼으로만 증감). size: lg=스코어, sm=골·도움 */
function Stepper({
  value,
  onChange,
  label,
  min = 0,
  max = 99,
  size = "sm",
}: {
  value: number;
  onChange: (next: number) => void;
  label: string;
  min?: number;
  max?: number;
  size?: "lg" | "sm";
}) {
  const lg = size === "lg";
  const btn = `flex cursor-pointer items-center justify-center rounded-xl border transition-colors disabled:pointer-events-none disabled:opacity-35 ${
    lg ? "size-11" : "size-8"
  }`;
  return (
    <div className={`inline-flex items-center ${lg ? "gap-2" : "gap-1"}`}>
      <button
        type="button"
        aria-label={`${label} 감소`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={`${btn} border-slate-900/10 bg-white/70 text-slate-500 hover:bg-white`}
      >
        <Minus className={lg ? "size-5" : "size-4"} />
      </button>
      <span
        className={`text-center font-bold tabular-nums text-slate-900 ${
          lg ? "w-10 text-3xl" : "w-7 text-base"
        }`}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={`${label} 증가`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={`${btn} border-[#84cc16]/40 bg-[#84cc16]/12 text-[#4d7c0f] hover:bg-[#84cc16]/20`}
      >
        <Plus className={lg ? "size-5" : "size-4"} />
      </button>
    </div>
  );
}

export function ResultEditor({
  clubId,
  matchId,
  clubName,
  opponent,
  players,
  hasResult,
  defaultOur,
  defaultOpponent,
  defaultNote,
}: {
  clubId: string;
  matchId: string;
  clubName: string;
  opponent: string | null;
  players: EditablePlayer[];
  hasResult: boolean;
  defaultOur: number;
  defaultOpponent: number;
  defaultNote: string;
}) {
  const [open, setOpen] = useState(!hasResult);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [our, setOur] = useState(defaultOur);
  const [opp, setOpp] = useState(defaultOpponent);
  const [note, setNote] = useState(defaultNote);
  const [stats, setStats] = useState<Record<string, { g: number; a: number }>>(
    () =>
      Object.fromEntries(
        players.map((p) => [p.userId, { g: p.goals, a: p.assists }]),
      ),
  );

  function setStat(userId: string, key: "g" | "a", value: number) {
    setStats((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [key]: value },
    }));
  }

  function submit() {
    setError(null);
    const values = {
      ourScore: our,
      opponentScore: opp,
      note,
      stats: players.map((p) => ({
        userId: p.userId,
        goals: stats[p.userId]?.g ?? 0,
        assists: stats[p.userId]?.a ?? 0,
      })),
    };
    startTransition(async () => {
      const res = await saveResult(clubId, matchId, values);
      if (res?.error) setError(res.error);
      else setOpen(false);
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-10 gap-1.5 rounded-xl border-slate-900/10 bg-white/70 px-4 text-sm font-semibold text-slate-600 hover:bg-white"
      >
        <Pencil className="size-4" />
        결과 수정
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-[#84cc16]/25 bg-white/70 p-5 backdrop-blur-xl">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
        <Trophy className="size-4 text-[#65a30d]" />
        경기 결과 입력
      </h3>

      {/* 스코어 */}
      <div className="flex items-start justify-center gap-4">
        <div className="flex flex-col items-center gap-2">
          <span className="max-w-24 truncate text-xs font-semibold text-slate-500">
            {clubName}
          </span>
          <Stepper value={our} onChange={setOur} label="우리 팀 득점" size="lg" />
        </div>
        <span className="pt-9 text-lg font-bold text-slate-300">:</span>
        <div className="flex flex-col items-center gap-2">
          <span className="max-w-24 truncate text-xs font-semibold text-slate-500">
            {opponent || "상대팀"}
          </span>
          <Stepper
            value={opp}
            onChange={setOpp}
            label="상대 팀 득점"
            size="lg"
          />
        </div>
      </div>

      {/* 개인 기록 */}
      {players.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-end gap-2 px-1 text-xs font-semibold text-slate-400">
            <span className="mr-auto">참석자 기록</span>
            <span className="w-[104px] text-center">골</span>
            <span className="w-[104px] text-center">도움</span>
          </div>
          <ul className="space-y-1.5">
            {players.map((p) => (
              <li
                key={p.userId}
                className="flex items-center gap-2.5 rounded-xl bg-white/60 px-2.5 py-1.5"
              >
                {p.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.avatarUrl}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                    className="size-8 shrink-0 rounded-full object-cover ring-1 ring-slate-900/10"
                  />
                ) : (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#84cc16]/15 text-xs font-bold text-[#4d7c0f]">
                    {p.name.charAt(0)}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                  {p.name}
                </span>
                <Stepper
                  value={stats[p.userId]?.g ?? 0}
                  onChange={(v) => setStat(p.userId, "g", v)}
                  label={`${p.name} 골`}
                />
                <Stepper
                  value={stats[p.userId]?.a ?? 0}
                  onChange={(v) => setStat(p.userId, "a", v)}
                  label={`${p.name} 도움`}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 메모 */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={200}
        placeholder="경기 메모 (선택)"
        className="mt-4 w-full resize-none rounded-xl border border-slate-900/10 bg-white/70 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/25"
      />

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          onClick={submit}
          disabled={pending}
          className="h-11 flex-1 gap-1.5 rounded-xl bg-[#84cc16] text-sm font-semibold text-[#1a2e05] shadow-md shadow-[#84cc16]/30 transition-all hover:bg-[#77b514] hover:not-disabled:-translate-y-0.5"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          결과 저장
        </Button>
        {hasResult && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="h-11 rounded-xl border-slate-900/10 bg-white/70 px-4 text-sm font-semibold text-slate-500 hover:bg-white"
          >
            취소
          </Button>
        )}
      </div>
    </div>
  );
}
