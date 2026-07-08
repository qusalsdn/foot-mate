import { formatDistanceToNow } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ko } from "date-fns/locale";

/**
 * 날짜 표시는 항상 Asia/Seoul 고정.
 * DB는 UTC(timestamptz) 저장, SSR 서버(Vercel)는 UTC이므로 KST로 변환하지 않으면
 * 서버/클라이언트 렌더가 어긋난다. 매치 시각을 다루는 곳은 이 유틸만 쓴다.
 */
export const KST = "Asia/Seoul";

/** UTC ISO(또는 Date) → KST 표시 문자열. 기본: "7월 10일 (금) 오후 7:30" */
export function formatKst(
  value: string | Date,
  pattern = "M월 d일 (EEE) a h:mm",
): string {
  return formatInTimeZone(value, KST, pattern, { locale: ko });
}

/** UTC ISO → 날짜만 "7월 10일 (금)" */
export function formatKstDate(value: string | Date): string {
  return formatInTimeZone(value, KST, "M월 d일 (EEE)", { locale: ko });
}

/** UTC ISO → 시각만 "오후 7:30" */
export function formatKstTime(value: string | Date): string {
  return formatInTimeZone(value, KST, "a h:mm", { locale: ko });
}

/**
 * UTC ISO → KST 기준 연/월. 지난 매치 연·월 그룹핑 키용.
 * 문자열 slice로 뽑으면 UTC 기준이라 자정 근처 매치가 옆 달로 새므로 반드시 이걸 쓴다.
 */
export function kstYearMonth(value: string | Date): {
  year: number;
  month: number;
} {
  return {
    year: Number(formatInTimeZone(value, KST, "yyyy")),
    month: Number(formatInTimeZone(value, KST, "M")),
  };
}

/**
 * datetime-local 입력값(KST 벽시계, 예: "2026-07-10T19:30") → 저장용 UTC ISO.
 * 브라우저 datetime-local은 타임존 없는 벽시계라 KST로 해석해 UTC로 변환한다.
 */
export function kstInputToUtcIso(local: string): string {
  return fromZonedTime(local, KST).toISOString();
}

/** UTC ISO → datetime-local 입력값(KST 벽시계) — 수정 폼 기본값용 */
export function utcIsoToKstInput(value: string | Date): string {
  return formatInTimeZone(value, KST, "yyyy-MM-dd'T'HH:mm");
}

/**
 * 상대 시각 "3분 전", "약 1시간 전" — 알림 목록 등 최신성 표시용.
 * 시각 차이(delta)라 타임존과 무관하다. 렌더 시점 기준이라 동적 페이지에서만 사용.
 */
export function formatRelative(value: string | Date): string {
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: ko });
}
