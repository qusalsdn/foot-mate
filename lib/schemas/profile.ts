import { z } from "zod";

/**
 * 내 프로필 수정 입력 스키마.
 * 클라이언트(React Hook Form)와 서버(Server Action)에서 함께 재사용한다.
 */
export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "이름을 입력해주세요")
    .max(20, "20자 이하로 입력해주세요"),
  // 휴대폰: 선택. 하이픈 유무 모두 허용. 빈 값은 서버에서 null 로 저장.
  phone: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^01[016789]-?\d{3,4}-?\d{4}$/.test(v),
      "올바른 휴대폰 번호를 입력해주세요",
    )
    .optional(),
  // 아바타: 업로드 후의 공개 URL, 또는 "" / null(사진 제거).
  // 파일 업로드 자체는 클라이언트에서 Storage로 직접 처리하고 그 결과 URL만 여기로 온다.
  avatarUrl: z.string().url().or(z.literal("")).nullish(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
