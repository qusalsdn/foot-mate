import { z } from "zod";

/**
 * 커뮤니티 게시글·댓글 스키마. 클라이언트(RHF)와 서버(Server Action)가 공유한다.
 *
 * category: 작성 폼이 다루는 카테고리는 notice/free.
 *   - notice(공지)는 RLS `post write`가 운영진(회장·총무·감독·코치)만 허용 → 서버에서 재검증됨.
 * images: 카테고리와 무관하게 **선택적 첨부**(0장 허용). post-images 버킷에 업로드하고 경로만 저장한다
 *   (공개 URL 은 렌더 시 조립). 별도 '갤러리' 게시판 대신 어떤 글에나 사진을 붙일 수 있다.
 */
export const POST_WRITE_CATEGORIES = ["notice", "free"] as const;
export type PostWriteCategory = (typeof POST_WRITE_CATEGORIES)[number];

/** 게시글 첨부 이미지 최대 개수. */
export const MAX_POST_IMAGES = 10;

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
  // 첨부 이미지 경로(post-images 버킷 기준). 선택 — 0장도 허용한다.
  images: z
    .array(z.string().trim().min(1))
    .max(MAX_POST_IMAGES, `이미지는 최대 ${MAX_POST_IMAGES}장까지 올릴 수 있어요`)
    .optional()
    .default([]),
});
export type PostInput = z.infer<typeof postSchema>;

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "댓글을 입력해주세요")
    .max(1000, "댓글은 1,000자 이하로 입력해주세요"),
  // 멘션 대상 사용자 id 목록. 본문의 `@이름` 토큰과 대응한다(이름이 유일하지 않아 id로 특정).
  // 실제 저장은 서버가 "그 클럽 활성 회원"으로 필터링하고, RLS `cm write` 가 한 번 더 강제한다.
  mentionUserIds: z.array(z.string().uuid()).optional().default([]),
});
export type CommentInput = z.infer<typeof commentSchema>;
