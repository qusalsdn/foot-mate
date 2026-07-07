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
