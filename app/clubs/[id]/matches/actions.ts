"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { matchSchema } from "@/lib/schemas/match";
import { kstInputToUtcIso } from "@/lib/date";
import type { MatchType } from "@/lib/constants/matches";

export type MatchMutationResult = { error: string };

// matchSchema 출력 → matches 테이블 컬럼 매핑 (생성/수정 공용)
function toRow(v: {
  title: string;
  matchDate: string;
  voteDeadline?: string;
  type: MatchType;
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
 * teams 입력 → match_team_defs 행. 유형별 의미가 다르다:
 * - 자체전: teams = 내부 팀(team 1..N)
 * - 친선전: team 1 = 우리팀(clubName 자동) + teams = 상대팀(team 2..N)
 * - 리그: 팀 정의 없음(상대팀은 opponent 텍스트)
 */
function buildTeamDefs(
  matchId: string,
  type: string,
  teams: { name: string }[],
  clubName: string,
) {
  if (type === "internal") {
    return teams.map((t, i) => ({ match_id: matchId, team: i + 1, name: t.name }));
  }
  if (type === "friendly") {
    return [
      { match_id: matchId, team: 1, name: clubName },
      ...teams.map((t, i) => ({ match_id: matchId, team: i + 2, name: t.name })),
    ];
  }
  return [];
}

/** 친선전 우리팀 이름용 클럽명 조회(그 외 유형은 불필요). */
async function clubNameFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clubId: string,
): Promise<string> {
  const { data } = await supabase
    .from("clubs")
    .select("name")
    .eq("id", clubId)
    .single();
  return (data?.name as string) ?? "우리팀";
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

  // 팀 정의 저장. 실패해도 매치는 생성됐으니 진행(수정에서 보정 가능).
  const { type, teams } = parsed.data;
  const clubName = type === "friendly" ? await clubNameFor(supabase, clubId) : "";
  const defs = buildTeamDefs(data.id, type, teams, clubName);
  if (defs.length > 0) await supabase.from("match_team_defs").insert(defs);

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

  // 팀 정의 전체 교체 + 고아 정리(팀 수 감소·유형 변경 대응).
  const { type, teams } = parsed.data;
  const clubName = type === "friendly" ? await clubNameFor(supabase, clubId) : "";
  const defs = buildTeamDefs(matchId, type, teams, clubName);
  const defCount = defs.length;
  await supabase.from("match_team_defs").delete().eq("match_id", matchId);
  if (defCount > 0) await supabase.from("match_team_defs").insert(defs);
  // 배정은 자체전에만 유효 → 그 외 유형이면 전부 제거, 자체전이면 사라진 팀만 제거.
  if (type === "internal") {
    await supabase
      .from("match_teams")
      .delete()
      .eq("match_id", matchId)
      .gt("team", defCount);
  } else {
    await supabase.from("match_teams").delete().eq("match_id", matchId);
  }
  await supabase
    .from("match_team_scores")
    .delete()
    .eq("match_id", matchId)
    .gt("team", defCount);

  revalidatePath(`/clubs/${clubId}/matches/${matchId}`);
  revalidatePath(`/clubs/${clubId}/matches`);
  redirect(`/clubs/${clubId}/matches/${matchId}`);
}
