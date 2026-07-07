import { z } from "zod";

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
  region: z.string().trim().max(30, "30자 이하로 입력해주세요").optional(),
  description: z
    .string()
    .trim()
    .max(200, "200자 이하로 입력해주세요")
    .optional(),
});

export type ClubInput = z.infer<typeof clubSchema>;
