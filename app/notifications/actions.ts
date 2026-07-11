"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { NOTIFICATIONS_PAGE_SIZE } from "@/lib/constants/notifications";
import type { NotificationRow } from "./notification-list";

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

/**
 * "더 보기" 커서 페이지네이션. 마지막으로 본 항목(created_at, id)보다 과거인 알림을
 * 최신순으로 한 페이지 더 가져온다. created_at 동률은 id로 안정 정렬(누락·중복 방지).
 * PAGE_SIZE+1 개를 조회해 다음 페이지 존재 여부(hasMore)를 판단한다.
 * RLS "noti own"이 본인 알림만 반환하므로 user_id 필터는 방어적 중복이다.
 */
export async function loadMoreNotifications(cursor: {
  createdAt: string;
  id: string;
}): Promise<{ items: NotificationRow[]; hasMore: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], hasMore: false };

  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("user_id", user.id)
    .or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(NOTIFICATIONS_PAGE_SIZE + 1);

  const rows = data ?? [];
  const hasMore = rows.length > NOTIFICATIONS_PAGE_SIZE;
  return { items: rows.slice(0, NOTIFICATIONS_PAGE_SIZE), hasMore };
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
