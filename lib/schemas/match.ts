import { z } from "zod";
import { MATCH_TYPES } from "@/lib/constants/matches";

/** 빈 문자열/undefined → undefined, 그 외엔 숫자로 강제 (폼의 문자열 입력 대응) */
const optionalInt = (max: number) =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().min(1, "1 이상 입력해주세요").max(max).optional(),
  );

const defaultInt = (max: number) =>
  z.preprocess(
    (v) => (v === "" || v == null ? 0 : Number(v)),
    z.number().int().min(0).max(max),
  );

/**
 * 매치 생성/수정 입력 스키마.
 * 클라이언트(RHF)와 서버(Server Action)에서 재사용. matchDate는 datetime-local 벽시계 문자열.
 */
const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export const matchSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "2자 이상 입력해주세요")
      .max(50, "50자 이하로 입력해주세요"),
    // datetime-local 값 ("2026-07-10T19:30"). 서버에서 KST→UTC 변환.
    matchDate: z
      .string()
      .min(1, "일시를 선택해주세요")
      .regex(DATETIME_LOCAL, "일시를 다시 선택해주세요"),
    // 투표 마감 시각(선택). 비우면 자동 마감 없음.
    voteDeadline: z
      .string()
      .refine((v) => v === "" || DATETIME_LOCAL.test(v), "일시를 다시 선택해주세요")
      .optional(),
    type: z.enum(MATCH_TYPES as [string, ...string[]]),
    opponent: z.string().trim().max(30, "30자 이하로 입력해주세요").optional(),
    locationName: z.string().trim().max(60, "60자 이하로 입력해주세요").optional(),
    // 정원: 비우면 무제한
    capacity: optionalInt(100),
    // 참가비(원)
    fee: defaultInt(10_000_000),
  })
  // 마감은 경기 시각보다 앞서야 한다. 둘 다 같은 형식·KST 벽시계라 문자열 비교로 충분.
  .refine((v) => !v.voteDeadline || v.voteDeadline <= v.matchDate, {
    message: "투표 마감은 경기 시각보다 앞서야 해요",
    path: ["voteDeadline"],
  });
export type MatchInput = z.infer<typeof matchSchema>;

/**
 * 경기 결과 + 개인 기록 입력 스키마 (운영진 전용).
 * stats는 참석자별 골·어시. 서버에서 0인 항목은 저장 생략.
 */
export const resultSchema = z.object({
  ourScore: defaultInt(99),
  opponentScore: defaultInt(99),
  note: z.string().trim().max(200, "200자 이하로 입력해주세요").optional(),
  stats: z.array(
    z.object({
      userId: z.string().uuid(),
      goals: defaultInt(99),
      assists: defaultInt(99),
    }),
  ),
});
export type ResultInput = z.infer<typeof resultSchema>;
