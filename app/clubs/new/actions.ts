"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clubSchema } from "@/lib/schemas/club";

export type CreateClubResult = { error: string };

/**
 * 클럽 생성. Zod로 서버에서 재검증한 뒤 insert.
 * insert 성공 시 handle_new_club 트리거가 생성자를 회장으로 자동 등록한다.
 * 성공하면 리다이렉트하므로 반환값은 에러 케이스에서만 사용된다.
 */
export async function createClub(values: unknown): Promise<CreateClubResult> {
  const parsed = clubSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "입력값을 확인해주세요" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다" };
  }

  const { data, error } = await supabase
    .from("clubs")
    .insert({
      name: parsed.data.name,
      region: parsed.data.region || null,
      description: parsed.data.description || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  redirect(`/clubs/${data.id}`);
}
