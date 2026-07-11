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
    type: z.enum(MATCH_TYPES),
    opponent: z.string().trim().max(30, "30자 이하로 입력해주세요").optional(),
    locationName: z.string().trim().max(60, "60자 이하로 입력해주세요").optional(),
    // 정원: 비우면 무제한
    capacity: optionalInt(100),
    // 참가비(원)
    fee: defaultInt(10_000_000),
    // 팀/상대팀 이름 목록. 의미는 유형별로 다름:
    // - 자체전: 내부 팀(2~4). 상세에서 참석자를 이 팀에 배정.
    // - 친선전: 상대팀(1~3). 저장 시 우리팀이 team 1로 자동 포함(총 2~4팀).
    // - 리그: 사용 안 함(상대팀은 opponent 텍스트).
    teams: z
      .array(
        z.object({
          name: z
            .string()
            .trim()
            .min(1, "이름을 입력해주세요")
            .max(10, "10자 이하로 입력해주세요"),
        }),
      )
      .max(4)
      .default([]),
  })
  // 마감은 경기 시각보다 앞서야 한다. 둘 다 같은 형식·KST 벽시계라 문자열 비교로 충분.
  .refine((v) => !v.voteDeadline || v.voteDeadline <= v.matchDate, {
    message: "투표 마감은 경기 시각보다 앞서야 해요",
    path: ["voteDeadline"],
  })
  // 자체전: 내부 팀 2~4개.
  .refine(
    (v) => v.type !== "internal" || (v.teams.length >= 2 && v.teams.length <= 4),
    { message: "자체전은 팀을 2~4개 정해주세요", path: ["teams"] },
  )
  // 친선전: 상대팀 1~3개(우리팀 자동 포함).
  .refine(
    (v) => v.type !== "friendly" || (v.teams.length >= 1 && v.teams.length <= 3),
    { message: "상대팀을 1~3개 추가해주세요", path: ["teams"] },
  )
  // 리그: 상대팀은 opponent 텍스트로 받으므로 teams 는 비운다.
  .refine((v) => v.type !== "league" || v.teams.length === 0, {
    message: "리그는 상대팀 이름만 입력해주세요",
    path: ["teams"],
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

/**
 * 팀 경기(자체전/친선) 결과 입력 스키마 (운영진 전용).
 * teamScores = 팀별 최종 점수(쿼터 기록 시 합계). quarterScores = 쿼터별 상세(선택, 비면 단일 기록).
 * stats(개인 기록)·note 는 외부 경기와 동일.
 */
export const internalResultSchema = z.object({
  teamScores: z.array(
    z.object({
      team: z.number().int().min(1).max(4),
      // 쿼터 합계라 상한을 넉넉히
      score: defaultInt(999),
    }),
  ),
  quarterScores: z
    .array(
      z.object({
        quarter: z.number().int().min(1).max(8),
        team: z.number().int().min(1).max(4),
        score: defaultInt(99),
      }),
    )
    .default([]),
  note: z.string().trim().max(200, "200자 이하로 입력해주세요").optional(),
  // 매치 합계 개인 기록 (쿼터 합)
  stats: z.array(
    z.object({
      userId: z.string().uuid(),
      goals: defaultInt(999),
      assists: defaultInt(999),
    }),
  ),
  // 쿼터별 개인 기록 상세
  quarterStats: z
    .array(
      z.object({
        quarter: z.number().int().min(1).max(8),
        userId: z.string().uuid(),
        goals: defaultInt(99),
        assists: defaultInt(99),
      }),
    )
    .default([]),
});
export type InternalResultInput = z.infer<typeof internalResultSchema>;

/**
 * 자체전 팀 편성 입력 스키마 (운영진 전용).
 * 참석 확정자별 팀 배정. team 0 = 미배정(저장 생략), 1~4 = 해당 팀.
 * 서버 액션에서 team>0 인 항목만 match_teams 에 insert.
 */
export const teamsSchema = z.object({
  assignments: z.array(
    z.object({
      userId: z.string().uuid(),
      team: z.number().int().min(0).max(4),
    }),
  ),
});
export type TeamsInput = z.infer<typeof teamsSchema>;
