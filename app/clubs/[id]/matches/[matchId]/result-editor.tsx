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
import { saveInternalResult, saveResult } from "./actions";
import { Button } from "@/components/ui/button";
import { TEAM_STYLES } from "@/lib/constants/matches";

export type TeamScore = { team: number; name: string; score: number };
export type QuarterScore = { quarter: number; team: number; score: number };
export type QuarterStat = {
  quarter: number;
  userId: string;
  goals: number;
  assists: number;
};

const clampScore = (v: number) => Math.max(0, Math.min(99, Math.trunc(v) || 0));

/** 참석자 골·도움 입력 행 (매치 단위·쿼터 단위 공용). */
function PlayerStatRow({
  player,
  goals,
  assists,
  onGoals,
  onAssists,
}: {
  player: EditablePlayer;
  goals: number;
  assists: number;
  onGoals: (v: number) => void;
  onAssists: (v: number) => void;
}) {
  return (
    <li className="flex items-center gap-2.5 rounded-xl bg-white/60 px-2.5 py-1.5">
      {player.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player.avatarUrl}
          alt={player.name}
          referrerPolicy="no-referrer"
          className="size-8 shrink-0 rounded-full object-cover ring-1 ring-slate-900/10"
        />
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#84cc16]/15 text-xs font-bold text-[#4d7c0f]">
          {player.name.charAt(0)}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
        {player.name}
      </span>
      <Stepper value={goals} onChange={onGoals} label={`${player.name} 골`} />
      <Stepper value={assists} onChange={onAssists} label={`${player.name} 도움`} />
    </li>
  );
}

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
  mode,
  homeLabel,
  awayLabel,
  teams,
  quarterScores,
  quarterStats,
  players,
  hasResult,
  defaultOur,
  defaultOpponent,
  defaultNote,
}: {
  clubId: string;
  matchId: string;
  // external = 우리:상대 2면 스코어, internal = 팀별 점수(쿼터 필수)
  mode: "external" | "internal";
  // external 스코어 좌/우 라벨 (클럽명 / 상대팀)
  homeLabel: string;
  awayLabel: string;
  // internal 팀 목록 + 기존 최종 점수 프리필
  teams: TeamScore[];
  // 쿼터별 팀 점수·개인 기록 프리필
  quarterScores: QuarterScore[];
  quarterStats: QuarterStat[];
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

  // ── 쿼터 상태 (internal 전용, 쿼터 필수) ──
  const initialQ = Math.max(
    quarterScores.length ? Math.max(...quarterScores.map((q) => q.quarter)) : 0,
    quarterStats.length ? Math.max(...quarterStats.map((q) => q.quarter)) : 0,
    4,
  );
  const [qCount, setQCount] = useState(initialQ);
  const [activeQ, setActiveQ] = useState(1);
  const [qTeamScore, setQTeamScore] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      quarterScores.map((q) => [`${q.quarter}-${q.team}`, q.score]),
    ),
  );
  const [qStat, setQStat] = useState<Record<string, { g: number; a: number }>>(
    () =>
      Object.fromEntries(
        quarterStats.map((q) => [
          `${q.quarter}-${q.userId}`,
          { g: q.goals, a: q.assists },
        ]),
      ),
  );
  const quarters = Array.from({ length: qCount }, (_, i) => i + 1);
  const tsKey = (q: number, team: number) => `${q}-${team}`;
  const psKey = (q: number, userId: string) => `${q}-${userId}`;
  const teamTotal = (team: number) =>
    quarters.reduce((s, q) => s + (qTeamScore[tsKey(q, team)] ?? 0), 0);
  const playerTotal = (userId: string) =>
    quarters.reduce(
      (acc, q) => {
        const s = qStat[psKey(q, userId)];
        return { g: acc.g + (s?.g ?? 0), a: acc.a + (s?.a ?? 0) };
      },
      { g: 0, a: 0 },
    );
  function setTeamQScore(q: number, team: number, v: number) {
    setQTeamScore((prev) => ({ ...prev, [tsKey(q, team)]: clampScore(v) }));
  }
  function setPlayerQStat(q: number, userId: string, key: "g" | "a", v: number) {
    setQStat((prev) => {
      const cur = prev[psKey(q, userId)] ?? { g: 0, a: 0 };
      return { ...prev, [psKey(q, userId)]: { ...cur, [key]: clampScore(v) } };
    });
  }

  // ── 매치 단위 개인 기록 (external 전용) ──
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
    startTransition(async () => {
      let res;
      if (mode === "external") {
        res = await saveResult(clubId, matchId, {
          ourScore: our,
          opponentScore: opp,
          note,
          stats: players.map((p) => ({
            userId: p.userId,
            goals: stats[p.userId]?.g ?? 0,
            assists: stats[p.userId]?.a ?? 0,
          })),
        });
      } else {
        // 팀 경기: 쿼터 필수. 최종값 = 쿼터 합계, 상세는 쿼터별로.
        res = await saveInternalResult(clubId, matchId, {
          teamScores: teams.map((t) => ({
            team: t.team,
            score: teamTotal(t.team),
          })),
          quarterScores: quarters.flatMap((q) =>
            teams.map((t) => ({
              quarter: q,
              team: t.team,
              score: qTeamScore[tsKey(q, t.team)] ?? 0,
            })),
          ),
          stats: players.map((p) => {
            const tot = playerTotal(p.userId);
            return { userId: p.userId, goals: tot.g, assists: tot.a };
          }),
          quarterStats: quarters.flatMap((q) =>
            players.map((p) => {
              const s = qStat[psKey(q, p.userId)];
              return {
                quarter: q,
                userId: p.userId,
                goals: s?.g ?? 0,
                assists: s?.a ?? 0,
              };
            }),
          ),
          note,
        });
      }
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

      {/* 스코어 + 참석자 기록 */}
      {mode === "external" ? (
        <>
          <div className="flex items-start justify-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <span className="max-w-24 truncate text-xs font-semibold text-slate-500">
                {homeLabel}
              </span>
              <Stepper value={our} onChange={setOur} label={`${homeLabel} 득점`} size="lg" />
            </div>
            <span className="pt-9 text-lg font-bold text-slate-300">:</span>
            <div className="flex flex-col items-center gap-2">
              <span className="max-w-24 truncate text-xs font-semibold text-slate-500">
                {awayLabel}
              </span>
              <Stepper
                value={opp}
                onChange={setOpp}
                label={`${awayLabel} 득점`}
                size="lg"
              />
            </div>
          </div>

          {players.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-end gap-2 px-1 text-xs font-semibold text-slate-400">
                <span className="mr-auto">참석자 기록</span>
                <span className="w-[104px] text-center">골</span>
                <span className="w-[104px] text-center">도움</span>
              </div>
              <ul className="space-y-1.5">
                {players.map((p) => (
                  <PlayerStatRow
                    key={p.userId}
                    player={p}
                    goals={stats[p.userId]?.g ?? 0}
                    assists={stats[p.userId]?.a ?? 0}
                    onGoals={(v) => setStat(p.userId, "g", v)}
                    onAssists={(v) => setStat(p.userId, "a", v)}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      ) : teams.length === 0 ? (
        <p className="rounded-xl border border-slate-900/10 bg-white/60 px-4 py-3 text-center text-sm text-slate-400">
          위에서 팀을 먼저 편성하면 팀별 점수를 입력할 수 있어요.
        </p>
      ) : (
        <div className="space-y-4">
          {/* 쿼터 탭 + 개수 조절 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {quarters.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setActiveQ(q)}
                  className={`h-8 w-10 cursor-pointer rounded-lg border text-sm font-bold transition-colors ${
                    activeQ === q
                      ? "border-[#84cc16]/50 bg-[#84cc16]/15 text-[#4d7c0f]"
                      : "border-slate-900/10 bg-white/70 text-slate-500 hover:bg-white"
                  }`}
                >
                  {q}Q
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              쿼터 수
              <button
                type="button"
                aria-label="쿼터 줄이기"
                onClick={() => {
                  const nc = Math.max(2, qCount - 1);
                  setQCount(nc);
                  setActiveQ((a) => Math.min(a, nc));
                }}
                disabled={qCount <= 2}
                className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-slate-900/10 bg-white/70 text-slate-500 transition-colors hover:bg-white disabled:pointer-events-none disabled:opacity-35"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-4 text-center text-sm font-bold text-slate-700">
                {qCount}
              </span>
              <button
                type="button"
                aria-label="쿼터 늘리기"
                onClick={() => setQCount((c) => Math.min(8, c + 1))}
                disabled={qCount >= 8}
                className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-[#84cc16]/40 bg-[#84cc16]/12 text-[#4d7c0f] transition-colors hover:bg-[#84cc16]/20 disabled:pointer-events-none disabled:opacity-35"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>

          {/* 활성 쿼터: 팀 점수 */}
          <div>
            <p className="mb-2 px-1 text-xs font-semibold text-slate-400">
              {activeQ}쿼터 팀 점수
            </p>
            <div className="flex flex-wrap items-start justify-center gap-x-5 gap-y-4">
              {teams.map((t) => (
                <div key={t.team} className="flex flex-col items-center gap-2">
                  <span className="flex max-w-24 items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <span
                      className={`size-2 shrink-0 rounded-full ${TEAM_STYLES[t.team].dot}`}
                    />
                    <span className="truncate">{t.name}</span>
                  </span>
                  <Stepper
                    value={qTeamScore[tsKey(activeQ, t.team)] ?? 0}
                    onChange={(v) => setTeamQScore(activeQ, t.team, v)}
                    label={`${t.name} ${activeQ}쿼터 득점`}
                    size="lg"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 활성 쿼터: 참석자 기록 */}
          {players.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-end gap-2 px-1 text-xs font-semibold text-slate-400">
                <span className="mr-auto">{activeQ}쿼터 참석자 기록</span>
                <span className="w-[104px] text-center">골</span>
                <span className="w-[104px] text-center">도움</span>
              </div>
              <ul className="space-y-1.5">
                {players.map((p) => (
                  <PlayerStatRow
                    key={p.userId}
                    player={p}
                    goals={qStat[psKey(activeQ, p.userId)]?.g ?? 0}
                    assists={qStat[psKey(activeQ, p.userId)]?.a ?? 0}
                    onGoals={(v) => setPlayerQStat(activeQ, p.userId, "g", v)}
                    onAssists={(v) => setPlayerQStat(activeQ, p.userId, "a", v)}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* 합계 요약 */}
          <div className="rounded-xl bg-slate-900/[0.03] px-3.5 py-2.5 text-xs text-slate-500">
            <span className="font-bold text-slate-600">합계</span>{" "}
            {teams.map((t) => `${t.name} ${teamTotal(t.team)}`).join(" · ")}
          </div>
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
