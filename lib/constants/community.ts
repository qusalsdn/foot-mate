import { ImageIcon, Megaphone, MessageSquare, type LucideIcon } from "lucide-react";

/**
 * post_category enum(notice/free/gallery) ↔ 한글 라벨·표시 메타.
 * DB는 영문 enum, UI는 한글 라벨. 새 카테고리가 생기면 여기에 한 줄 추가한다.
 */
export type PostCategory = "notice" | "free" | "gallery";

export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  notice: "공지",
  free: "자유",
  gallery: "갤러리",
};

export function postCategoryLabel(category: string): string {
  return POST_CATEGORY_LABELS[category as PostCategory] ?? category;
}

/**
 * 카테고리별 아이콘·뱃지 스타일. 공지만 라임 강조, 나머지는 중립(역할 뱃지 규칙과 동일 톤).
 */
type CategoryMeta = { icon: LucideIcon; badge: string };

const POST_CATEGORY_META: Record<PostCategory, CategoryMeta> = {
  notice: {
    icon: Megaphone,
    badge: "border-[#84cc16]/30 bg-[#84cc16]/10 text-[#4d7c0f]",
  },
  free: {
    icon: MessageSquare,
    badge: "border-slate-900/10 bg-slate-900/[0.04] text-slate-500",
  },
  gallery: {
    icon: ImageIcon,
    badge: "border-slate-900/10 bg-slate-900/[0.04] text-slate-500",
  },
};

const FALLBACK_META: CategoryMeta = {
  icon: MessageSquare,
  badge: "border-slate-900/10 bg-slate-900/[0.04] text-slate-500",
};

export function postCategoryMeta(category: string): CategoryMeta {
  return POST_CATEGORY_META[category as PostCategory] ?? FALLBACK_META;
}

/** 목록 필터 탭 순서 (전체는 페이지에서 별도 처리). */
export const POST_CATEGORY_FILTERS = ["notice", "free"] as const;

/**
 * "사진" 필터: 카테고리가 아니라 '이미지가 있는 글'을 모아본다(images <> '{}').
 * URL 파라미터 값이자 탭 하이라이트 키. 카테고리와 구분해 페이지에서 별도 처리한다.
 */
export const PHOTOS_FILTER = "photos";

/** 갤러리 이미지 스토리지 버킷. */
export const POST_IMAGE_BUCKET = "post-images";

/**
 * 갤러리 이미지 경로 → 공개 URL. posts.images 에는 버킷 내 경로만 저장하고,
 * 공개 URL 은 여기서 조립한다(서버 컴포넌트에서 supabase 클라이언트 없이 렌더 가능).
 * 공개 버킷이므로 URL 규칙이 고정: /storage/v1/object/public/<bucket>/<path>.
 */
export function postImageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${POST_IMAGE_BUCKET}/${path}`;
}
