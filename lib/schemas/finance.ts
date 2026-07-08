import { z } from "zod";

/** 빈 문자열/undefined → 0, 그 외엔 숫자로 강제 (폼의 문자열 입력 대응) */
const wonInt = z.preprocess(
  (v) => (v === "" || v == null ? 0 : Number(v)),
  z
    .number()
    .int("금액은 정수로 입력해주세요")
    .min(1, "1원 이상 입력해주세요")
    .max(10_000_000, "1,000만원 이하로 입력해주세요"),
);

const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * 월회비 일괄 부과 입력 스키마.
 * 클라이언트(RHF)와 서버(Server Action)가 공유. period는 <input type="month"> 값('2026-07').
 */
export const chargeMonthlySchema = z.object({
  // 부과 기간 (월). input[type=month]가 "2026-07" 형태로 준다.
  period: z
    .string()
    .min(1, "기간을 선택해주세요")
    .regex(PERIOD, "기간을 다시 선택해주세요"),
  // 1인당 회비(원)
  amount: wonInt,
});
export type ChargeMonthlyInput = z.infer<typeof chargeMonthlySchema>;
