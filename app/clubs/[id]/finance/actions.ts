"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { chargeMonthlySchema } from "@/lib/schemas/finance";

export type MutationResult = { error?: string };

export type ChargeResult =
  | { error: string }
  | { ok: true; created: number; skipped: number };

/**
 * 월회비 일괄 부과. 권한(회장·총무)은 RLS `pay admin`(can_manage_club)이 강제.
 * 활성 정회원 전원에게 해당 기간 미납 행을 생성한다 —
 * 게스트 제외(회비 대상 아님), 같은 기간에 이미 부과된 회원은 건너뛴다(멱등).
 */
export async function chargeMonthlyDues(
  clubId: string,
  values: unknown,
): Promise<ChargeResult> {
  const parsed = chargeMonthlySchema.safeParse(values);
  if (!parsed.success) return { error: "입력값을 확인해주세요" };
  const { period, amount } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  // 부과 대상: 활성 정회원 (게스트 제외)
  const { data: members, error: memberErr } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("status", "active")
    .neq("role", "guest");
  if (memberErr) return { error: "회원 목록을 불러오지 못했어요" };
  const memberIds = (members ?? []).map((m) => m.user_id as string);
  if (memberIds.length === 0) return { error: "부과할 회원이 없어요" };

  // 같은 기간에 이미 부과된 회원은 스킵 (중복 방지)
  const { data: existing } = await supabase
    .from("payments")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("type", "monthly_due")
    .eq("period", period);
  const already = new Set((existing ?? []).map((p) => p.user_id as string));

  const rows = memberIds
    .filter((uid) => !already.has(uid))
    .map((uid) => ({
      club_id: clubId,
      user_id: uid,
      type: "monthly_due" as const,
      period,
      amount,
      status: "unpaid" as const,
      created_by: user.id,
    }));

  if (rows.length === 0) {
    return { ok: true, created: 0, skipped: memberIds.length };
  }

  const { error } = await supabase.from("payments").insert(rows);
  if (error) return { error: "회비를 부과하지 못했어요. 권한을 확인해주세요." };

  revalidatePath(`/clubs/${clubId}/finance`);
  return { ok: true, created: rows.length, skipped: already.size };
}

/**
 * 납부 상태 토글 (미납 ↔ 납부). 권한은 RLS(can_manage_club)가 강제 —
 * 비권한자가 호출하면 0건 업데이트되고 에러로 되돌린다.
 * paid_at은 납부로 바꿀 때만 채우고, 미납으로 되돌리면 지운다.
 */
export async function setPaymentStatus(
  clubId: string,
  paymentId: string,
  paid: boolean,
): Promise<MutationResult> {
  const supabase = await createClient();
  // 상태 변경 + (확정 시) 회원 알림을 한 번에 처리하는 RPC.
  // 권한(can_manage_club)·요청표시 소거·알림은 모두 함수 안에서 강제한다.
  const { error } = await supabase.rpc("set_payment_status", {
    _payment_id: paymentId,
    _paid: paid,
  });

  if (error) {
    return { error: "상태를 바꾸지 못했어요. 권한을 확인해주세요." };
  }
  revalidatePath(`/clubs/${clubId}/finance`);
  return {};
}

/**
 * 회원: 본인 미납 항목에 '납부 완료 요청'을 남긴다 (입금 후 운영진 확인 요청).
 * 실제 납부 확정은 운영진이 setPaymentStatus로 처리. 조건(본인·미납)은 RPC가 강제.
 */
export async function requestPayment(
  clubId: string,
  paymentId: string,
): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_payment", {
    _payment_id: paymentId,
  });
  if (error) return { error: "요청하지 못했어요. 다시 시도해주세요." };
  revalidatePath(`/clubs/${clubId}/finance`);
  return {};
}

/** 회원: 납부 완료 요청 취소. */
export async function withdrawPaymentRequest(
  clubId: string,
  paymentId: string,
): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_payment_request", {
    _payment_id: paymentId,
  });
  if (error) return { error: "취소하지 못했어요. 다시 시도해주세요." };
  revalidatePath(`/clubs/${clubId}/finance`);
  return {};
}

/** 개별 회비 항목 삭제. 권한은 RLS(can_manage_club)가 강제. */
export async function deletePayment(
  clubId: string,
  paymentId: string,
): Promise<MutationResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .delete()
    .eq("id", paymentId)
    .eq("club_id", clubId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "삭제하지 못했어요. 권한을 확인해주세요." };
  }
  revalidatePath(`/clubs/${clubId}/finance`);
  return {};
}

/** 특정 기간의 월회비 부과 전체 삭제 (잘못 부과했을 때 되돌리기용). */
export async function deleteMonthlyPeriod(
  clubId: string,
  period: string,
): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("club_id", clubId)
    .eq("type", "monthly_due")
    .eq("period", period);

  if (error) return { error: "삭제하지 못했어요. 권한을 확인해주세요." };
  revalidatePath(`/clubs/${clubId}/finance`);
  return {};
}
