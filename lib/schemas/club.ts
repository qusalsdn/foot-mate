import { z } from "zod";
import { VALID_REGIONS } from "@/lib/constants/regions";

/**
 * 클럽 생성/수정 입력 스키마.
 * 클라이언트(React Hook Form)와 서버(Server Action)에서 함께 재사용한다.
 */
export const clubSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "2자 이상 입력해주세요")
    .max(30, "30자 이하로 입력해주세요"),
  // "서울" 또는 "서울 강남구" 같은 유효한 결합 문자열, 또는 빈 값(미선택).
  // 서버에서 "" 는 null 로 저장한다.
  region: z
    .string()
    .refine((v) => v === "" || VALID_REGIONS.has(v), "지역을 다시 선택해주세요")
    .optional(),
  description: z
    .string()
    .trim()
    .max(200, "200자 이하로 입력해주세요")
    .optional(),
});

export type ClubInput = z.infer<typeof clubSchema>;
