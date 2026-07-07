"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** 클럽 가입 신청 (member 역할, pending 상태 → 운영진 승인 대기) */
export async function joinClub(clubId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("club_members").insert({
    club_id: clubId,
    user_id: user.id,
    role: "member",
    status: "pending",
  });

  revalidatePath(`/clubs/${clubId}`);
}

/**
 * 클럽 삭제 (회장만). RLS `club delete` 정책이 is_club_owner 로 권한을 강제하므로
 * 비회장이 호출하면 0건 삭제(no-op)된다. cascade 로 회원·매치·회비 등이 함께 삭제된다.
 */
export async function deleteClub(clubId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("clubs").delete().eq("id", clubId);
  if (error) {
    // 권한 부족(RLS)·트리거 예외 등 → 상세 페이지로 되돌려 상태를 다시 보여준다
    redirect(`/clubs/${clubId}?error=delete`);
  }

  revalidatePath("/");
  redirect("/");
}
