"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { postSchema, commentSchema } from "@/lib/schemas/post";

export type MutationResult = { error?: string };

/**
 * 게시글 작성. 권한은 RLS `post write` 가 강제:
 * - 소속 회원이어야 하고(author_id = auth.uid()),
 * - notice 카테고리는 운영진(can_manage_club || can_manage_match)만 쓸 수 있다.
 * 성공 시 상세로 리다이렉트. 공지 알림은 트리거(on_post_created)가 처리.
 */
export async function createPost(
  clubId: string,
  values: unknown,
): Promise<MutationResult> {
  const parsed = postSchema.safeParse(values);
  if (!parsed.success) return { error: "입력값을 확인해주세요" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const { category, title, content } = parsed.data;
  const { data, error } = await supabase
    .from("posts")
    .insert({
      club_id: clubId,
      author_id: user.id,
      category,
      title,
      content: content || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "글을 등록하지 못했어요. 권한을 확인해주세요." };
  }

  revalidatePath(`/clubs/${clubId}/community`);
  redirect(`/clubs/${clubId}/community/${data.id}`);
}

/**
 * 게시글 수정. 권한은 RLS `post own`(작성자 본인 또는 회장·총무)이 강제 —
 * 비권한자가 호출하면 0건 업데이트되고 여기선 에러로 되돌린다.
 */
export async function updatePost(
  clubId: string,
  postId: string,
  values: unknown,
): Promise<MutationResult> {
  const parsed = postSchema.safeParse(values);
  if (!parsed.success) return { error: "입력값을 확인해주세요" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const { category, title, content } = parsed.data;
  const { data, error } = await supabase
    .from("posts")
    .update({ category, title, content: content || null })
    .eq("id", postId)
    .eq("club_id", clubId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "글을 수정하지 못했어요. 권한을 확인해주세요." };
  }

  revalidatePath(`/clubs/${clubId}/community`);
  revalidatePath(`/clubs/${clubId}/community/${postId}`);
  redirect(`/clubs/${clubId}/community/${postId}`);
}

/**
 * 게시글 삭제. 권한은 RLS `post delete`(작성자 본인 또는 회장·총무)가 강제.
 * 댓글은 FK on delete cascade 로 함께 지워진다. 성공 시 목록으로 리다이렉트.
 */
export async function deletePost(
  clubId: string,
  postId: string,
): Promise<MutationResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("club_id", clubId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "삭제하지 못했어요. 권한을 확인해주세요." };
  }

  revalidatePath(`/clubs/${clubId}/community`);
  redirect(`/clubs/${clubId}/community`);
}

/**
 * 댓글 작성. 권한은 RLS `comment write`(소속 회원 + author_id = auth.uid())가 강제.
 * 글 작성자 알림은 트리거(on_comment_created)가 처리. 성공 시 상세를 재검증한다.
 */
export async function createComment(
  clubId: string,
  postId: string,
  values: unknown,
): Promise<MutationResult> {
  const parsed = commentSchema.safeParse(values);
  if (!parsed.success) return { error: "입력값을 확인해주세요" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const { data: inserted, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      author_id: user.id,
      content: parsed.data.content,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { error: "댓글을 남기지 못했어요. 다시 시도해주세요." };
  }

  // 멘션 저장(부수효과) — 실패해도 댓글 자체는 유지한다.
  // 클라이언트가 보낸 대상 중 "그 클럽의 활성 회원"만 남겨 넣는다(RLS `cm write` 가 최종 강제).
  const wanted = Array.from(new Set(parsed.data.mentionUserIds));
  if (wanted.length > 0) {
    const { data: valid } = await supabase
      .from("club_members")
      .select("user_id")
      .eq("club_id", clubId)
      .eq("status", "active")
      .in("user_id", wanted);
    const rows = ((valid ?? []) as { user_id: string }[]).map((m) => ({
      comment_id: inserted.id,
      user_id: m.user_id,
    }));
    if (rows.length > 0) {
      await supabase.from("comment_mentions").insert(rows);
    }
  }

  revalidatePath(`/clubs/${clubId}/community/${postId}`);
  return {};
}

/**
 * 댓글 삭제. 권한은 RLS `comment own`(작성자 본인 또는 회장·총무)이 강제.
 */
export async function deleteComment(
  clubId: string,
  postId: string,
  commentId: string,
): Promise<MutationResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("post_id", postId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "삭제하지 못했어요. 권한을 확인해주세요." };
  }

  revalidatePath(`/clubs/${clubId}/community/${postId}`);
  return {};
}
