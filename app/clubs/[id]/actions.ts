"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ASSIGNABLE_ROLES, type AssignableRole } from "@/lib/constants/roles";

/**
 * 클럽 가입.
 *   - open(누구나 가입) 클럽  → 즉시 active 정회원
 *   - approval(승인제) 클럽    → pending (운영진 승인 대기)
 * 정책 판정은 서버에서 clubs.join_policy 를 다시 조회해 신뢰한다(클라이언트 값 미신뢰).
 * RLS "member join" 정책도 동일 조건을 강제하므로, 정책을 위조해도 DB에서 거부된다.
 */
export async function joinClub(clubId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: club } = await supabase
    .from("clubs")
    .select("join_policy")
    .eq("id", clubId)
    .single();

  const status = club?.join_policy === "open" ? "active" : "pending";

  await supabase.from("club_members").insert({
    club_id: clubId,
    user_id: user.id,
    role: "member",
    status,
  });

  revalidatePath(`/clubs/${clubId}`);
}

/**
 * 가입 신청 승인 (회장·총무). pending → active 로 전환.
 * RLS `member manage` 정책이 can_manage_club 으로 권한을 강제하므로
 * 비운영진이 호출하면 0건 갱신(no-op)된다. `.eq("status", "pending")` 으로
 * 이미 처리된(active/inactive) 회원은 건드리지 않는다.
 */
export async function approveMember(clubId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("club_members")
    .update({ status: "active" })
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .eq("status", "pending");

  revalidatePath(`/clubs/${clubId}`);
}

/**
 * 가입 신청 거절 (회장·총무). pending 신청 row 를 삭제한다.
 * (rejected 상태로 남기지 않고 삭제 → 신청자가 나중에 다시 신청 가능)
 * RLS `member remove` 정책이 can_manage_club 으로 권한을 강제한다.
 * `.eq("status", "pending")` 으로 이미 승인된 회원 삭제를 방지한다.
 */
export async function rejectMember(clubId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("club_members")
    .delete()
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .eq("status", "pending");

  revalidatePath(`/clubs/${clubId}`);
}

/**
 * 회원 역할 변경 (회장·총무). active 회원만 대상.
 * RLS `member manage` 가 권한을 강제한다:
 *   - 총무는 president row 수정 불가, 누구도 president 로 승격 불가(화이트리스트가 이미 배제)
 *   - 회장은 비회장 대상 자유 변경
 * 권한 밖 호출은 0건 갱신(no-op)된다.
 */
export async function changeMemberRole(
  clubId: string,
  userId: string,
  role: AssignableRole,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 위조된 role(president/guest 등) 방어 — 화이트리스트만 통과
  if (!ASSIGNABLE_ROLES.includes(role)) return;

  await supabase
    .from("club_members")
    .update({ role })
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .eq("status", "active");

  revalidatePath(`/clubs/${clubId}`);
}

/**
 * 회원 강퇴 (회장·총무). active 회원 삭제.
 * RLS `member remove` 가 권한을 강제하고(회장 강퇴는 회장만), 마지막 회장 보호 트리거가
 * 회장이 0명이 되는 삭제를 차단한다. pending 신청 거절은 rejectMember 가 담당하므로
 * 여기서는 `.eq("status", "active")` 로 정회원 강퇴만 처리한다.
 */
export async function removeMember(clubId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("club_members")
    .delete()
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .eq("status", "active");

  revalidatePath(`/clubs/${clubId}`);
}

/**
 * 회장 이양 (현 회장만). 대상을 회장으로 승격하고 본인은 회원으로 강등한다.
 * 승격→강등 순서와 마지막 회장 보호를 위해 security definer RPC(transfer_presidency)로 원자 처리.
 * 권한 검증은 RPC 안에서 auth.uid() 기준으로 한다.
 */
export async function transferPresidency(clubId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.rpc("transfer_presidency", {
    _club_id: clubId,
    _to_user: userId,
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
