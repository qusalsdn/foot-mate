/**
 * 매치 도메인 enum ↔ 한글 라벨 매핑 (DB는 영문 enum, UI는 한글).
 * 역할 라벨(lib/constants/roles.ts)과 같은 패턴.
 */

/** match_type: 경기 성격 */
export const MATCH_TYPE_LABELS = {
  internal: "자체전",
  friendly: "친선경기",
  league: "리그",
} as const;
export type MatchType = keyof typeof MATCH_TYPE_LABELS;
export const MATCH_TYPES = Object.keys(MATCH_TYPE_LABELS) as MatchType[];
export function matchTypeLabel(t: string): string {
  return MATCH_TYPE_LABELS[t as MatchType] ?? t;
}

/** match_status: 진행 상태 */
export const MATCH_STATUS_LABELS = {
  scheduled: "모집중",
  closed: "모집마감",
  finished: "경기종료",
  canceled: "취소됨",
} as const;
export type MatchStatus = keyof typeof MATCH_STATUS_LABELS;
export function matchStatusLabel(s: string): string {
  return MATCH_STATUS_LABELS[s as MatchStatus] ?? s;
}

/** 상태별 뱃지 색 (모집중 = 라임 강조, 종료/취소는 중립·경고) */
export const MATCH_STATUS_BADGE: Record<string, string> = {
  scheduled: "border-[#84cc16]/30 bg-[#84cc16]/12 text-[#4d7c0f]",
  closed: "border-amber-500/25 bg-amber-500/10 text-amber-600",
  finished: "border-slate-900/10 bg-slate-900/[0.04] text-slate-500",
  canceled: "border-red-500/20 bg-red-500/[0.07] text-red-500",
};

/**
 * 표시용 매치 상태 — DB status + 경기 시각(now)으로 렌더 시점에 계산.
 * DB status 는 사람이 명시한 사실(마감/취소/결과입력)만 담고, "진행중"처럼
 * 시간에 따라 바뀌는 상태는 여기서 파생한다(자동 전이·cron 불필요).
 *
 * - canceled            → 취소됨
 * - finished(결과 입력)  → 경기종료
 * - 시작시각 지남         → 진행중  (결과 미입력)
 * - 시작 전 & closed     → 모집마감
 * - 시작 전 & scheduled  → 모집중
 */
export type MatchViewKey =
  | "recruiting"
  | "closed"
  | "ongoing"
  | "finished"
  | "canceled";

export function getMatchView(
  status: string,
  matchDate: string | Date,
  now: Date = new Date(),
): { key: MatchViewKey; label: string; badge: string } {
  if (status === "canceled") {
    return { key: "canceled", label: "취소됨", badge: MATCH_STATUS_BADGE.canceled };
  }
  if (status === "finished") {
    return { key: "finished", label: "경기종료", badge: MATCH_STATUS_BADGE.finished };
  }
  const started = new Date(matchDate).getTime() <= now.getTime();
  if (started) {
    return {
      key: "ongoing",
      label: "진행중",
      badge: "border-sky-500/25 bg-sky-500/10 text-sky-600",
    };
  }
  if (status === "closed") {
    return { key: "closed", label: "모집마감", badge: MATCH_STATUS_BADGE.closed };
  }
  return { key: "recruiting", label: "모집중", badge: MATCH_STATUS_BADGE.scheduled };
}

/** attend_status: 참석 응답 */
export const ATTEND_LABELS = {
  attending: "참석",
  absent: "불참",
  maybe: "미정",
} as const;
export type AttendStatus = keyof typeof ATTEND_LABELS;
export function attendLabel(s: string): string {
  return ATTEND_LABELS[s as AttendStatus] ?? s;
}
