"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { matchSchema } from "@/lib/schemas/match";
import { kstInputToUtcIso } from "@/lib/date";

export type MatchMutationResult = { error: string };

// matchSchema 출력 → matches 테이블 컬럼 매핑 (생성/수정 공용)
function toRow(v: {
  title: string;
  matchDate: string;
  voteDeadline?: string;
  type: string;
  opponent?: string;
  locationName?: string;
  capacity?: number;
  fee: number;
}) {
  return {
    title: v.title,
    // datetime-local(KST 벽시계) → UTC 저장
    match_date: kstInputToUtcIso(v.matchDate),
    vote_deadline: v.voteDeadline ? kstInputToUtcIso(v.voteDeadline) : null,
    type: v.type,
    opponent: v.opponent || null,
    location_name: v.locationName || null,
    capacity: v.capacity ?? null,
    fee: v.fee,
  };
}

/**
 * 매치 생성. 권한(회장·감독·코치)은 RLS `match write`(can_manage_match)가 강제.
 * created_by = auth.uid() 도 정책이 요구. 성공 시 상세로 리다이렉트.
 */
export async function createMatch(
  clubId: string,
  values: unknown,
): Promise<MatchMutationResult> {
  const parsed = matchSchema.safeParse(values);
  if (!parsed.success) return { error: "입력값을 확인해주세요" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const { data, error } = await supabase
    .from("matches")
    .insert({ club_id: clubId, created_by: user.id, ...toRow(parsed.data) })
    .select("id")
    .single();

  if (error) return { error: "매치를 만들지 못했어요. 권한을 확인해주세요." };

  redirect(`/clubs/${clubId}/matches/${data.id}`);
}

/**
 * 매치 정보 수정. 권한은 RLS(can_manage_match)가 강제 —
 * 비권한자가 호출하면 0건 업데이트되고, 여기선 상세로 되돌린다.
 * 상태·결과·참석은 건드리지 않는다(각자 별도 액션).
 */
export async function updateMatch(
  clubId: string,
  matchId: string,
  values: unknown,
): Promise<MatchMutationResult> {
  const parsed = matchSchema.safeParse(values);
  if (!parsed.success) return { error: "입력값을 확인해주세요" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const { data, error } = await supabase
    .from("matches")
    .update(toRow(parsed.data))
    .eq("id", matchId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "매치를 수정하지 못했어요. 권한을 확인해주세요." };
  }

  revalidatePath(`/clubs/${clubId}/matches/${matchId}`);
  revalidatePath(`/clubs/${clubId}/matches`);
  redirect(`/clubs/${clubId}/matches/${matchId}`);
}
