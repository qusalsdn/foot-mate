"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * 알림 읽음 처리. RLS "noti own"이 본인 알림만 수정하도록 강제하므로 소유 검증은 정책에 맡긴다.
 * 이미 읽은 행(read_at 있음)은 건드리지 않아 최초 읽은 시각을 보존한다.
 */
export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  revalidatePath("/notifications");
  revalidatePath("/");
}

/** 내 안읽음 알림 전부 읽음 처리. */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  revalidatePath("/notifications");
  revalidatePath("/");
}
