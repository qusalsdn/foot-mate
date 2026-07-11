"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Check, Loader2, Pencil, Shuffle, Users2 } from "lucide-react";
import { saveTeams } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TEAM_STYLES } from "@/lib/constants/matches";

export type TeamPlayer = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  team: number; // 0 = 미배정
};

export type TeamDef = { team: number; name: string };

function PlayerAvatar({
  name,
  avatarUrl,
  size = 8,
}: {
  name: string;
  avatarUrl: string | null;
  size?: 7 | 8;
}) {
  const cls = size === 7 ? "size-7" : "size-8";
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        className={`${cls} shrink-0 rounded-full object-cover ring-1 ring-slate-900/10`}
      />
    );
  }
  return (
    <span
      className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-[#84cc16]/15 text-xs font-bold text-[#4d7c0f]`}
    >
      {name.charAt(0)}
    </span>
  );
}

/**
 * 팀별 편성 결과 읽기 뷰 (운영진·일반 회원 공용). 인원 있는 팀만, 정의 순서대로.
 * 서버 컴포넌트(상세 페이지)와 편집기 접힘 상태 양쪽에서 재사용.
 */
export function TeamGroups({
  teams,
  players,
}: {
  teams: TeamDef[];
  players: TeamPlayer[];
}) {
  const groups = teams
    .map((t) => ({ ...t, members: players.filter((p) => p.team === t.team) }))
    .filter((g) => g.members.length > 0);
  if (groups.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {groups.map((g) => {
        const style = TEAM_STYLES[g.team];
        return (
          <div
            key={g.team}
            className="rounded-2xl border border-slate-900/[0.06] bg-white/60 p-4"
          >
            <h3 className="mb-2.5 flex items-center gap-1.5 px-1 text-xs font-bold text-slate-500">
              <span className={`size-2 rounded-full ${style.dot}`} />
              {g.name}
              <span className="text-slate-400">{g.members.length}</span>
            </h3>
            <ul className="flex flex-wrap gap-2">
              {g.members.map((p) => (
                <li
                  key={p.userId}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-900/[0.06] bg-white/70 py-1 pl-1 pr-3 shadow-sm"
                >
                  <PlayerAvatar name={p.name} avatarUrl={p.avatarUrl} size={7} />
                  <span className="text-sm font-medium text-slate-700">
                    {p.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 팀 배정 편집 카드 (운영진). 팀은 생성/수정 시 정의되며, 여기선 참석 확정자를
 * 그 팀에 배정만 한다(팀 수·이름 변경은 매치 수정에서). 접힘=결과+수정 버튼.
 */
export function TeamEditor({
  clubId,
  matchId,
  teams,
  players,
  hasAssignment,
}: {
  clubId: string;
  matchId: string;
  teams: TeamDef[];
  players: TeamPlayer[];
  hasAssignment: boolean;
}) {
  const [open, setOpen] = useState(!hasAssignment);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [assign, setAssign] = useState<Record<string, number>>(() =>
    Object.fromEntries(players.map((p) => [p.userId, p.team])),
  );

  function setTeam(userId: string, team: number) {
    setAssign((prev) => ({ ...prev, [userId]: team }));
  }

  /** 균등 랜덤 분배: 참석자를 셔플해 팀에 순번대로 채운다(각 팀 인원 최대 1명 차이). */
  function shuffle() {
    const ids = players.map((p) => p.userId);
    // Fisher–Yates (Math.random 로 매 클릭 다른 결과)
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const next: Record<string, number> = {};
    ids.forEach((id, i) => {
      next[id] = teams[i % teams.length].team;
    });
    setAssign(next);
  }

  function cancel() {
    setAssign(Object.fromEntries(players.map((p) => [p.userId, p.team])));
    setError(null);
    setOpen(false);
  }

  function submit() {
    setError(null);
    const values = {
      assignments: players.map((p) => ({
        userId: p.userId,
        team: assign[p.userId] ?? 0,
      })),
    };
    startTransition(async () => {
      const res = await saveTeams(clubId, matchId, values);
      if (res?.error) setError(res.error);
      else setOpen(false);
    });
  }

  // ── 접힘: 저장된 배정 결과 + 수정 버튼 ──
  if (!open) {
    return (
      <section className="mt-6 space-y-4 rounded-3xl border border-slate-900/[0.06] bg-white/80 p-6 shadow-sm backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Users2 className="size-4 text-[#65a30d]" />
            팀 편성
          </h2>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-900/10 bg-white/70 px-3.5 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:border-[#84cc16]/40 hover:text-[#4d7c0f]"
          >
            <Pencil className="size-3.5" />
            {hasAssignment ? "편성 수정" : "배정하기"}
          </button>
        </div>
        {hasAssignment ? (
          <TeamGroups teams={teams} players={players} />
        ) : (
          <p className="text-sm text-slate-400">
            참석 확정 인원을 {teams.map((t) => t.name).join("·")} 에 배정하세요.
          </p>
        )}
      </section>
    );
  }

  // ── 펼침: 참석자 배정 ──
  const counts = teams.map(
    (t) => Object.values(assign).filter((v) => v === t.team).length,
  );
  const unassigned = players.length - counts.reduce((a, b) => a + b, 0);

  return (
    <section className="mt-6 rounded-3xl border border-[#84cc16]/25 bg-white/80 p-6 shadow-sm backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <Users2 className="size-4 text-[#65a30d]" />
          팀 편성
        </h2>
        {players.length > 0 && (
          <button
            type="button"
            onClick={shuffle}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-900/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[#84cc16]/40 hover:text-[#4d7c0f]"
          >
            <Shuffle className="size-3.5" />
            랜덤 배정
          </button>
        )}
      </div>

      {players.length === 0 ? (
        <p className="rounded-2xl border border-slate-900/10 bg-white/60 p-5 text-center text-sm text-slate-400">
          참석 확정 인원이 있어야 팀을 배정할 수 있어요.
        </p>
      ) : (
        <>
          {/* 팀별 인원 요약(범례) */}
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs font-semibold text-slate-500">
            {teams.map((t, i) => (
              <span key={t.team} className="inline-flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${TEAM_STYLES[t.team].dot}`} />
                {t.name} {counts[i]}
              </span>
            ))}
            {unassigned > 0 && (
              <span className="text-slate-400">미배정 {unassigned}</span>
            )}
          </div>

          {/* 참석자별 팀 선택 */}
          <ul className="space-y-1.5">
            {players.map((p) => {
              const cur = assign[p.userId] ?? 0;
              return (
                <li
                  key={p.userId}
                  className="flex items-center gap-2.5 rounded-xl bg-white/60 px-2.5 py-1.5"
                >
                  <PlayerAvatar name={p.name} avatarUrl={p.avatarUrl} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                    {p.name}
                  </span>
                  {cur > 0 && (
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${TEAM_STYLES[cur].dot}`}
                    />
                  )}
                  <Select
                    value={cur}
                    onValueChange={(v) => setTeam(p.userId, Number(v))}
                  >
                    <SelectTrigger
                      aria-label={`${p.name} 팀 선택`}
                      className="h-9 w-auto shrink-0 gap-1 rounded-lg pl-2.5 pr-2 font-medium text-slate-700"
                    >
                      <SelectValue>
                        {(v: number) =>
                          v === 0
                            ? "미배정"
                            : (teams.find((t) => t.team === v)?.name ?? "미배정")
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={0}>미배정</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.team} value={t.team}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              );
            })}
          </ul>
        </>
      )}

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
          disabled={pending || players.length === 0}
          className="h-11 flex-1 gap-1.5 rounded-xl bg-[#84cc16] text-sm font-semibold text-[#1a2e05] shadow-md shadow-[#84cc16]/30 transition-all hover:bg-[#77b514] hover:not-disabled:-translate-y-0.5"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          편성 저장
        </Button>
        {hasAssignment && (
          <Button
            type="button"
            variant="outline"
            onClick={cancel}
            disabled={pending}
            className="h-11 rounded-xl border-slate-900/10 bg-white/70 px-4 text-sm font-semibold text-slate-500 hover:bg-white"
          >
            취소
          </Button>
        )}
      </div>
    </section>
  );
}
