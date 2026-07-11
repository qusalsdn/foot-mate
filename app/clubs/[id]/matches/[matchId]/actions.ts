"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  internalResultSchema,
  resultSchema,
  teamsSchema,
} from "@/lib/schemas/match";

export type ActionResult = { error?: string };

const VOTABLE = new Set(["attending", "absent", "maybe"]);
// 운영진이 지정할 수 있는 상태 전이 (finished 는 결과 입력에서만)
const SETTABLE = new Set(["scheduled", "closed", "canceled"]);

function revalidateMatch(clubId: string, matchId: string) {
  revalidatePath(`/clubs/${clubId}/matches/${matchId}`);
  revalidatePath(`/clubs/${clubId}/matches`);
}

/**
 * 참석 투표. 정원 초과 시 대기자 배정 + 취소 시 자동 승격은
 * vote_attendance RPC(security definer)가 원자적으로 처리한다.
 */
export async function voteAttendance(
  clubId: string,
  matchId: string,
  status: string,
): Promise<ActionResult> {
  if (!VOTABLE.has(status)) return { error: "잘못된 응답입니다" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("vote_attendance", {
    _match_id: matchId,
    _status: status,
  });
  if (error) {
    // RPC 내부 raise (마감/비회원 등) 메시지를 그대로 노출
    return { error: error.message.replace(/^.*:\s*/, "") || "투표에 실패했어요" };
  }

  revalidateMatch(clubId, matchId);
  return {};
}

/**
 * 경기 결과 + 개인 기록 저장 (운영진). 저장 시 매치 상태를 finished 로 전환.
 * 권한은 RLS(can_manage_match)가 강제한다. 기록은 매번 전체 교체(delete→insert).
 */
export async function saveResult(
  clubId: string,
  matchId: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = resultSchema.safeParse(values);
  if (!parsed.success) return { error: "입력값을 확인해주세요" };
  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: resErr } = await supabase.from("match_results").upsert(
    {
      match_id: matchId,
      our_score: v.ourScore,
      opponent_score: v.opponentScore,
      note: v.note || null,
    },
    { onConflict: "match_id" },
  );
  if (resErr) return { error: "결과를 저장하지 못했어요. 권한을 확인해주세요." };

  // 개인 기록: 전체 교체. 0골 0어시는 저장 생략.
  await supabase.from("match_stats").delete().eq("match_id", matchId);
  const rows = v.stats
    .filter((s) => s.goals > 0 || s.assists > 0)
    .map((s) => ({
      match_id: matchId,
      user_id: s.userId,
      goals: s.goals,
      assists: s.assists,
    }));
  if (rows.length > 0) {
    const { error: statErr } = await supabase.from("match_stats").insert(rows);
    if (statErr) return { error: "기록을 저장하지 못했어요." };
  }

  // 종료 처리 (이미 finished 여도 무해)
  await supabase.from("matches").update({ status: "finished" }).eq("id", matchId);

  revalidateMatch(clubId, matchId);
  return {};
}

/**
 * 자체전 경기 결과 저장 (운영진). 2면 스코어 대신 팀별 점수(match_team_scores).
 * note·결과 존재 표시는 match_results 행을 재사용(our/opponent=0). 개인 기록은 saveResult 과 동일.
 * 권한은 RLS(can_manage_match)가 강제. 팀 점수·개인 기록 모두 전체 교체(delete→insert).
 */
export async function saveInternalResult(
  clubId: string,
  matchId: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = internalResultSchema.safeParse(values);
  if (!parsed.success) return { error: "입력값을 확인해주세요" };
  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 결과 헤더(note·존재 표시). 자체전은 our/opponent 미사용 → 0 고정.
  const { error: resErr } = await supabase.from("match_results").upsert(
    { match_id: matchId, our_score: 0, opponent_score: 0, note: v.note || null },
    { onConflict: "match_id" },
  );
  if (resErr) return { error: "결과를 저장하지 못했어요. 권한을 확인해주세요." };

  // 팀 최종 점수: 전체 교체 (쿼터 기록 시 이 값이 합계)
  await supabase.from("match_team_scores").delete().eq("match_id", matchId);
  const scoreRows = v.teamScores.map((t) => ({
    match_id: matchId,
    team: t.team,
    score: t.score,
  }));
  if (scoreRows.length > 0) {
    const { error } = await supabase.from("match_team_scores").insert(scoreRows);
    if (error) return { error: "팀 점수를 저장하지 못했어요." };
  }

  // 쿼터별 상세: 전체 교체 (쿼터 기록 안 쓰면 비움)
  await supabase.from("match_quarter_scores").delete().eq("match_id", matchId);
  const quarterRows = v.quarterScores.map((q) => ({
    match_id: matchId,
    quarter: q.quarter,
    team: q.team,
    score: q.score,
  }));
  if (quarterRows.length > 0) {
    const { error } = await supabase
      .from("match_quarter_scores")
      .insert(quarterRows);
    if (error) return { error: "쿼터 점수를 저장하지 못했어요." };
  }

  // 개인 기록 합계: 전체 교체. 0골 0어시는 저장 생략.
  await supabase.from("match_stats").delete().eq("match_id", matchId);
  const rows = v.stats
    .filter((s) => s.goals > 0 || s.assists > 0)
    .map((s) => ({
      match_id: matchId,
      user_id: s.userId,
      goals: s.goals,
      assists: s.assists,
    }));
  if (rows.length > 0) {
    const { error: statErr } = await supabase.from("match_stats").insert(rows);
    if (statErr) return { error: "기록을 저장하지 못했어요." };
  }

  // 쿼터별 개인 기록 상세: 전체 교체. 0골 0어시는 생략.
  await supabase.from("match_quarter_stats").delete().eq("match_id", matchId);
  const quarterStatRows = v.quarterStats
    .filter((s) => s.goals > 0 || s.assists > 0)
    .map((s) => ({
      match_id: matchId,
      user_id: s.userId,
      quarter: s.quarter,
      goals: s.goals,
      assists: s.assists,
    }));
  if (quarterStatRows.length > 0) {
    const { error } = await supabase
      .from("match_quarter_stats")
      .insert(quarterStatRows);
    if (error) return { error: "쿼터 기록을 저장하지 못했어요." };
  }

  await supabase.from("matches").update({ status: "finished" }).eq("id", matchId);

  revalidateMatch(clubId, matchId);
  return {};
}

/**
 * 자체전 팀 편성 저장 (운영진). 배정은 매번 전체 교체(delete→insert).
 * 권한은 RLS(can_manage_match)가 강제한다. team 0(미배정)은 저장 생략.
 */
export async function saveTeams(
  clubId: string,
  matchId: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = teamsSchema.safeParse(values);
  if (!parsed.success) return { error: "입력값을 확인해주세요" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("match_teams").delete().eq("match_id", matchId);
  const rows = parsed.data.assignments
    .filter((a) => a.team > 0)
    .map((a) => ({ match_id: matchId, user_id: a.userId, team: a.team }));
  if (rows.length > 0) {
    const { error } = await supabase.from("match_teams").insert(rows);
    if (error) return { error: "편성을 저장하지 못했어요. 권한을 확인해주세요." };
  }

  revalidateMatch(clubId, matchId);
  return {};
}

/** 매치 상태 변경 (운영진): 모집마감/재개·취소. RLS(can_manage_match)가 권한 강제. */
export async function setMatchStatus(
  clubId: string,
  matchId: string,
  status: string,
): Promise<ActionResult> {
  if (!SETTABLE.has(status)) return { error: "잘못된 상태입니다" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("matches")
    .update({ status })
    .eq("id", matchId);
  if (error) return { error: "상태를 변경하지 못했어요. 권한을 확인해주세요." };

  revalidateMatch(clubId, matchId);
  return {};
}

/**
 * 매치 삭제 (운영진). RLS(can_manage_match)가 권한 강제, cascade 로
 * 참석·결과·기록이 함께 삭제된다. 성공 시 목록으로 이동.
 */
export async function deleteMatch(clubId: string, matchId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("matches").delete().eq("id", matchId);
  if (error) {
    redirect(`/clubs/${clubId}/matches/${matchId}?error=delete`);
  }

  revalidatePath(`/clubs/${clubId}/matches`);
  redirect(`/clubs/${clubId}/matches`);
}
