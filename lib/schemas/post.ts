import { z } from "zod";

/**
 * 커뮤니티 게시글·댓글 스키마. 클라이언트(RHF)와 서버(Server Action)가 공유한다.
 *
 * category: 작성 폼이 다루는 카테고리는 notice/free 둘뿐이다.
 *   - notice(공지)는 RLS `post write`가 운영진(회장·총무·감독·코치)만 허용 → 서버에서 재검증됨.
 *   - gallery(이미지 게시판)는 Storage 배선이 필요한 별도 기능이라 작성 폼에서 제외한다
 *     (enum엔 남아 있어 기존/추후 갤러리 글은 목록·상세에서 렌더만 지원).
 */
export const POST_WRITE_CATEGORIES = ["notice", "free"] as const;
export type PostWriteCategory = (typeof POST_WRITE_CATEGORIES)[number];

export const postSchema = z.object({
  category: z.enum(POST_WRITE_CATEGORIES, {
    message: "카테고리를 선택해주세요",
  }),
  title: z
    .string()
    .trim()
    .min(1, "제목을 입력해주세요")
    .max(100, "제목은 100자 이하로 입력해주세요"),
  // 내용은 선택(빈 값 허용). 저장 시 빈 문자열은 null로 처리한다.
  content: z
    .string()
    .trim()
    .max(5000, "내용은 5,000자 이하로 입력해주세요")
    .optional()
    .default(""),
});
export type PostInput = z.infer<typeof postSchema>;

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "댓글을 입력해주세요")
    .max(1000, "댓글은 1,000자 이하로 입력해주세요"),
});
export type CommentInput = z.infer<typeof commentSchema>;
