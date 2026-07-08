/**
 * 회비/정산 도메인 enum ↔ 한글 라벨 + 표시 헬퍼.
 * 매치 도메인(lib/constants/matches.ts)과 같은 패턴 (DB는 영문 enum, UI는 한글).
 */

/** payment_type: 회비 종류 */
export const PAYMENT_TYPE_LABELS = {
  monthly_due: "월회비",
  match_fee: "매치비",
  other: "기타",
} as const;
export type PaymentType = keyof typeof PAYMENT_TYPE_LABELS;
export function paymentTypeLabel(t: string): string {
  return PAYMENT_TYPE_LABELS[t as PaymentType] ?? t;
}

/** payment_status: 납부 상태 */
export const PAYMENT_STATUS_LABELS = {
  unpaid: "미납",
  paid: "납부",
} as const;
export type PaymentStatus = keyof typeof PAYMENT_STATUS_LABELS;
export function paymentStatusLabel(s: string): string {
  return PAYMENT_STATUS_LABELS[s as PaymentStatus] ?? s;
}

/** 상태별 뱃지 색 (납부 = 라임, 미납 = 경고 앰버) */
export const PAYMENT_STATUS_BADGE: Record<string, string> = {
  paid: "border-[#84cc16]/30 bg-[#84cc16]/12 text-[#4d7c0f]",
  unpaid: "border-amber-500/25 bg-amber-500/10 text-amber-600",
};

/** 원화 표시: 10000 → "10,000원" (KST/서버 무관하게 일관) */
export function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

/**
 * period 문자열('2026-07') → 한글 라벨('2026년 7월').
 * period 없는 행(매치비/기타)은 null 반환.
 */
export function formatPeriod(period: string | null): string | null {
  if (!period) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return period;
  return `${m[1]}년 ${Number(m[2])}월`;
}

/** period 없는 행을 묶는 그룹 키 (매치비·기타) */
export const OTHER_PERIOD_KEY = "__other__";
