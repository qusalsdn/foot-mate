import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Ban, CalendarDays, Clock, Hourglass, ImageIcon, MapPin, Pencil, Settings2, Swords, Trophy, Users, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatKstDate, formatKstTime } from "@/lib/date";
import { getMatchView, matchImageUrl, matchTypeLabel, parseMatchVideos, TEAM_STYLES, teamLabel } from "@/lib/constants/matches";
import { PageBackBar } from "@/components/page-back-bar";
import { AttendancePanel } from "./attendance-panel";
import { ResultEditor, type EditablePlayer } from "./result-editor";
import { TeamEditor, TeamGroups, type TeamPlayer } from "./team-editor";
import { MatchManage } from "./match-manage";
import { MediaManager } from "./media-manager";
import { MatchVideos } from "./match-videos";
import { MatchMap } from "@/components/map/match-map";

const MANAGER_ROLES = new Set(["president", "treasurer", "manager", "coach"]);

type Profile = { name: string | null; avatar_url: string | null };
type Attendance = {
  user_id: string;
  status: string;
  is_waitlist: boolean;
  responded_at: string;
  profiles: Profile | null;
};

function Roster({
  title,
  rows,
  accent,
  withRank,
  muted,
  clubId,
  canLink,
}: {
  title: string;
  rows: Attendance[];
  accent: string;
  withRank?: boolean;
  muted?: boolean;
  clubId: string;
  // 정회원 뷰어에게만 프로필로 링크 (게스트는 회원 조회 차단)
  canLink?: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-bold text-slate-500">
        <span className={`size-2 rounded-full ${accent}`} />
        {title}
        <span className="text-slate-400">{rows.length}</span>
      </h3>
      <ul className="flex flex-wrap gap-2">
        {rows.map((a, i) => {
          const person = (
            <>
              <Avatar profile={a.profiles} />
              <span className="text-sm font-medium text-slate-700">{a.profiles?.name ?? "축구인"}</span>
            </>
          );
          return (
            <li
              key={a.user_id}
              className={`inline-flex items-center gap-2 rounded-full border border-slate-900/[0.06] py-1 pl-1 pr-3 shadow-sm backdrop-blur-xl transition-colors ${muted ? "bg-white/40 opacity-60" : "bg-white/70"} ${canLink ? "hover:border-[#84cc16]/40" : ""}`}
            >
              {withRank && <span className="ml-1 w-4 text-center text-xs font-bold tabular-nums text-slate-400">{i + 1}</span>}
              {canLink ? (
                <Link href={`/clubs/${clubId}/members/${a.user_id}`} className="inline-flex items-center gap-2">
                  {person}
                </Link>
              ) : (
                person
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Avatar({ profile }: { profile: Profile | null }) {
  const name = profile?.name ?? "축구인";
  if (profile?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt={name}
        referrerPolicy="no-referrer"
        className="size-8 shrink-0 rounded-full object-cover ring-1 ring-slate-900/10"
      />
    );
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#84cc16]/15 text-xs font-bold text-[#4d7c0f]">
      {name.charAt(0)}
    </span>
  );
}

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; matchId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, matchId } = await params;
  const { error: errorParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 서로 독립인 3개 조회를 한 번에 (클럽 · 내 멤버십 · 매치). 가드는 아래에서 순서대로.
  const [{ data: club }, { data: membership }, { data: match }] = await Promise.all([
    supabase.from("clubs").select("id, name").eq("id", id).single(),
    supabase.from("club_members").select("role, status").eq("club_id", id).eq("user_id", user.id).maybeSingle(),
    supabase
      .from("matches")
      .select("id, club_id, title, match_date, vote_deadline, type, opponent, location_name, location_lat, location_lng, capacity, fee, status, images, videos")
      .eq("id", matchId)
      .single(),
  ]);
  if (!club) notFound();
  if (membership?.status !== "active") redirect(`/clubs/${id}`);
  const canManage = MANAGER_ROLES.has(membership.role);
  // 라우트의 클럽과 매치의 클럽이 다르면 404 (URL 조작 방지)
  if (!match || match.club_id !== id) notFound();

  const [
    { data: attData },
    { data: result },
    { data: statData },
    { data: memberData },
    { data: teamData },
    { data: teamScoreData },
    { data: teamDefData },
    { data: quarterScoreData },
    { data: quarterStatData },
  ] = await Promise.all([
    supabase
      .from("match_attendances")
      .select("user_id, status, is_waitlist, responded_at, profiles(name, avatar_url)")
      .eq("match_id", matchId)
      .order("responded_at", { ascending: true }),
    supabase.from("match_results").select("our_score, opponent_score, note").eq("match_id", matchId).maybeSingle(),
    supabase.from("match_stats").select("user_id, goals, assists, profiles(name, avatar_url)").eq("match_id", matchId),
    // 미투표 계산용 활성 회원 명단. RLS상 정회원만 전체가 보이고(게스트는 자기 행만),
    // 게스트는 아래에서 미투표 섹션 자체를 숨긴다.
    supabase.from("club_members").select("user_id, role, profiles(name, avatar_url)").eq("club_id", id).eq("status", "active"),
    // 자체전 팀 편성. 자체전이 아니면 조회해도 빈 결과라 무해.
    supabase.from("match_teams").select("user_id, team").eq("match_id", matchId),
    // 자체전 팀별 점수. 외부 경기는 빈 결과.
    supabase.from("match_team_scores").select("team, score").eq("match_id", matchId),
    // 팀 정의(이름). 생성/수정 시 선언. 2개 이상이면 팀 경기.
    supabase.from("match_team_defs").select("team, name").eq("match_id", matchId),
    // 쿼터별 팀 점수(있으면 쿼터 기록). 없으면 단일 점수만.
    supabase.from("match_quarter_scores").select("quarter, team, score").eq("match_id", matchId),
    // 쿼터별 개인 기록.
    supabase.from("match_quarter_stats").select("quarter, user_id, goals, assists").eq("match_id", matchId),
  ]);

  const attendances = attData ?? [];
  const stats = statData ?? [];
  const members = memberData ?? [];
  const teamRows = teamData ?? [];
  const teamScoreRows = teamScoreData ?? [];
  const teamDefRows = teamDefData ?? [];
  const quarterScoreRows = quarterScoreData ?? [];
  const quarterStatRows = quarterStatData ?? [];

  const attending = attendances.filter((a) => a.status === "attending" && !a.is_waitlist);
  const waitlist = attendances.filter((a) => a.status === "attending" && a.is_waitlist);
  const maybeList = attendances.filter((a) => a.status === "maybe");
  const absentList = attendances.filter((a) => a.status === "absent");

  // 미투표: 응답이 없는 정회원. 게스트는 로스터를 못 보므로(RLS) 섹션 자체를 숨기고,
  // 목록에서도 게스트는 제외한다(초대제라 클럽 전체 미투표로 세면 오해).
  const isFullMember = membership.role !== "guest";
  const votedIds = new Set(attendances.map((a) => a.user_id));
  const notVoted: Attendance[] = isFullMember
    ? members
        .filter((m) => m.role !== "guest" && !votedIds.has(m.user_id))
        .map((m) => ({
          user_id: m.user_id,
          status: "none",
          is_waitlist: false,
          responded_at: "",
          profiles: m.profiles,
        }))
        .sort((a, b) => (a.profiles?.name ?? "").localeCompare(b.profiles?.name ?? "", "ko"))
    : [];

  const myAtt = attendances.find((a) => a.user_id === user.id) ?? null;
  const myChoice =
    myAtt?.status === "attending"
      ? "attending"
      : myAtt?.status === "maybe"
        ? "maybe"
        : myAtt?.status === "absent"
          ? "absent"
          : null;

  const now = new Date();
  const view = getMatchView(match.status, match.match_date, now);
  // 투표 마감 시각 경과 여부 (수동 마감과 별개)
  const deadlinePassed = match.vote_deadline != null && new Date(match.vote_deadline) <= now;
  const started = new Date(match.match_date) <= now;
  // 투표 가능: 모집중 & 마감시각 이전 & 킥오프 이전
  const votable = match.status === "scheduled" && !deadlinePassed && !started;
  const capacityFull = match.capacity != null && attending.length >= match.capacity;
  // 지금 '참석' 누르면 대기자 편입되는지 (이미 확정 참석이면 아님)
  const willWaitlist = capacityFull && !(myAtt?.status === "attending" && !myAtt.is_waitlist);

  const hasResult = !!result;
  const isCanceled = match.status === "canceled";

  // 사진·영상 (운영진이 붙임, 활성 회원 전원 열람)
  const matchImages = match.images ?? [];
  const matchVideos = parseMatchVideos(match.videos);
  const hasMedia = matchImages.length > 0 || matchVideos.length > 0;

  // 결과 입력용 참석자(확정) — 기존 기록 프리필
  const statByUser = new Map(stats.map((s) => [s.user_id, s]));
  const players: EditablePlayer[] = attending.map((a) => {
    const s = statByUser.get(a.user_id);
    return {
      userId: a.user_id,
      name: a.profiles?.name ?? "축구인",
      avatarUrl: a.profiles?.avatar_url ?? null,
      goals: s?.goals ?? 0,
      assists: s?.assists ?? 0,
    };
  });

  // 읽기용 득점자(골/도움 기록이 있는 사람) — 골 많은 순
  const scorers = [...stats]
    .filter((s) => s.goals > 0 || s.assists > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists);

  // 팀 = 매치 생성/수정 시 선언된 정의(이름).
  // - 자체전(internal): team 1..N = 내부 팀. 참석자를 배정.
  // - 친선전(friendly): team 1 = 우리팀 + team 2.. = 상대팀. 배정 없음.
  // - 리그(league): 정의 없음(우리:상대 텍스트).
  const isInternal = match.type === "internal";
  const isFriendly = match.type === "friendly";
  const teamDefs = [...teamDefRows].sort((a, b) => a.team - b.team);
  const teamNames = new Map(teamDefs.map((d) => [d.team, d.name]));
  const teams = teamDefs.map((d) => ({ team: d.team, name: d.name }));
  // 팀 모드 = 결과를 팀별 점수로 기록(자체전·친선전). 리그는 우리:상대 2면 스코어.
  const teamMode = (isInternal || isFriendly) && teams.length >= 2;
  // 친선전 상대팀 이름(우리팀=team1 제외) — 히어로 표시용
  const opponentNames = isFriendly ? teamDefs.filter((d) => d.team > 1).map((d) => d.name) : [];
  const opponentText = isFriendly ? opponentNames.join(", ") : match.opponent || "";

  const teamByUser = new Map(teamRows.map((t) => [t.user_id, t.team]));
  const teamPlayers: TeamPlayer[] = attending.map((a) => ({
    userId: a.user_id,
    name: a.profiles?.name ?? "축구인",
    avatarUrl: a.profiles?.avatar_url ?? null,
    team: teamByUser.get(a.user_id) ?? 0,
  }));
  const hasAssignment = teamRows.length > 0;

  // 우리:상대 1팀 스코어 라벨(팀 모드가 아닐 때만 사용).
  const homeLabel = club.name;
  const awayLabel = match.opponent || "상대팀";

  // 팀별 결과 입력 대상: 정의된 팀 + 기존 점수 프리필.
  const scoreByTeam = new Map(teamScoreRows.map((r) => [r.team, r.score]));
  const editorTeams = teams.map((t) => ({
    team: t.team,
    name: t.name,
    score: scoreByTeam.get(t.team) ?? 0,
  }));
  // 결과 표시용 순위: 저장된 팀 점수 내림차순(이름 붙여서).
  const standings = [...teamScoreRows]
    .map((r) => ({ ...r, name: teamNames.get(r.team) ?? teamLabel(r.team) }))
    .sort((a, b) => b.score - a.score);
  // 승패 판정: 2팀은 승/무/패, 3팀 이상은 순위(공동 순위 = 무승부 성격).
  const isTwoTeamResult = standings.length === 2;
  const maxScore = standings.length > 0 ? standings[0].score : 0;
  const minScore = standings.length > 0 ? standings[standings.length - 1].score : 0;
  // tone: win(승/1위)·lose(패)·draw(무)·neutral(중위 순위)
  const BADGE_CLS: Record<string, string> = {
    win: "border-[#84cc16]/40 bg-[#84cc16]/15 text-[#4d7c0f]",
    lose: "border-red-500/20 bg-red-500/[0.07] text-red-500",
    draw: "border-slate-900/12 bg-slate-900/[0.05] text-slate-500",
    neutral: "border-slate-900/12 bg-slate-900/[0.05] text-slate-500",
  };
  // 우리팀(친선전 team 1) 행 배경 = 우리 결과 색. 승만 라임, 패는 빨강이라 착시 없음.
  const OUR_ROW_CLS: Record<string, string> = {
    win: "border-[#84cc16]/30 bg-[#84cc16]/[0.08]",
    lose: "border-red-500/25 bg-red-500/[0.07]",
    draw: "border-slate-900/15 bg-slate-900/[0.06]",
    neutral: "border-slate-900/15 bg-slate-900/[0.06]",
  };
  function resultBadge(score: number): { text: string; tone: string } {
    if (isTwoTeamResult) {
      if (maxScore === minScore) return { text: "무", tone: "draw" };
      if (score === maxScore) return { text: "승", tone: "win" };
      return { text: "패", tone: "lose" };
    }
    const rank = 1 + standings.filter((x) => x.score > score).length;
    return { text: `${rank}위`, tone: rank === 1 ? "win" : "neutral" };
  }
  // 쿼터별 상세(있을 때만 표시). 합계는 teamScoreRows 사용.
  const quarterCount = quarterScoreRows.length > 0 ? Math.max(...quarterScoreRows.map((q) => q.quarter)) : 0;
  const quarterScoreMap = new Map(quarterScoreRows.map((q) => [`${q.quarter}-${q.team}`, q.score]));

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#f6f8f4] text-slate-900">
      {/* 배경 장식 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,#a3e635_0%,transparent_65%)] opacity-25 blur-3xl [animation:footmate-drift_16s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-40 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,#34d399_0%,transparent_65%)] opacity-[0.18] blur-3xl [animation:footmate-drift_20s_ease-in-out_infinite_reverse]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(#0f172a0d_1px,transparent_1px),linear-gradient(90deg,#0f172a0d_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_top,#000_20%,transparent_70%)]"
      />

      <div className="relative mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
        <PageBackBar href={`/clubs/${id}/matches`} label="매치 목록" userId={user.id} />

        {errorParam === "delete" && (
          <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm font-medium text-red-600">
            매치를 삭제하지 못했어요. 권한을 확인하거나 잠시 후 다시 시도해 주세요.
          </div>
        )}

        {/* 히어로: 매치 정보 */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-900/[0.06] bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-900/10 bg-slate-900/[0.04] px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                  {matchTypeLabel(match.type)}
                </span>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${view.badge}`}>{view.label}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{match.title}</h1>
              {opponentText && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-500">
                  <Swords className="size-4 text-[#65a30d]" />
                  vs {opponentText}
                </p>
              )}
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <CalendarDays className="size-4 shrink-0 text-[#65a30d]" />
              {formatKstDate(match.match_date)}
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="size-4 shrink-0 text-[#65a30d]" />
              {formatKstTime(match.match_date)}
            </div>
            {match.location_name && (
              <div className="col-span-2 flex items-center gap-2 text-slate-600">
                <MapPin className="size-4 shrink-0 text-[#65a30d]" />
                {match.location_name}
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-600">
              <Users className="size-4 shrink-0 text-[#65a30d]" />
              참석 {attending.length}
              {match.capacity ? ` / ${match.capacity}명` : "명"}
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Wallet className="size-4 shrink-0 text-[#65a30d]" />
              {match.fee > 0 ? `${match.fee.toLocaleString()}원` : "참가비 없음"}
            </div>
            {match.vote_deadline && (
              <div className={`col-span-2 flex items-center gap-2 ${deadlinePassed ? "text-red-500" : "text-slate-600"}`}>
                <Hourglass className="size-4 shrink-0 text-[#65a30d]" />
                투표 마감 {formatKstDate(match.vote_deadline)} {formatKstTime(match.vote_deadline)}
                {deadlinePassed && <span className="font-semibold">· 마감됨</span>}
              </div>
            )}
          </dl>

          {/* 좌표가 있으면 지도 미리보기 + 카카오맵 외부 링크(SDK 없이도 동작) */}
          {match.location_lat != null && match.location_lng != null && (
            <div className="mt-4 grid gap-2">
              <MatchMap
                lat={match.location_lat}
                lng={match.location_lng}
                name={match.location_name ?? "경기 장소"}
              />
              <div className="flex gap-2">
                <a
                  href={`https://map.kakao.com/link/map/${encodeURIComponent(match.location_name ?? "경기 장소")},${match.location_lat},${match.location_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-900/10 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-[#84cc16]/40 hover:text-[#4d7c0f]"
                >
                  <MapPin className="size-3.5" />
                  카카오맵에서 열기
                </a>
                <a
                  href={`https://map.kakao.com/link/to/${encodeURIComponent(match.location_name ?? "경기 장소")},${match.location_lat},${match.location_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-900/10 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-[#84cc16]/40 hover:text-[#4d7c0f]"
                >
                  <MapPin className="size-3.5" />
                  길찾기
                </a>
              </div>
            </div>
          )}
        </div>

        {isCanceled && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-sm font-medium text-red-500">
            <Ban className="size-4" />이 매치는 취소되었어요.
          </div>
        )}

        {/* 경기 결과 (있으면 모두에게 표시) */}
        {hasResult && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-slate-900/[0.06] bg-white/80 p-6 shadow-sm backdrop-blur-xl">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
              <Trophy className="size-4 text-[#65a30d]" />
              경기 결과
            </h2>
            {teamMode ? (
              <>
                {standings.length > 0 && (
                  <ul className="space-y-2">
                    {standings.map((s) => {
                      const r = resultBadge(s.score);
                      // 우리팀 = 친선전의 team 1(우리 클럽). 자체전엔 우리팀 개념 없음.
                      const isOurTeam = isFriendly && s.team === 1;
                      return (
                        <li
                          key={s.team}
                          className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 ${
                            isOurTeam ? OUR_ROW_CLS[r.tone] : "border-slate-900/[0.06] bg-white/60"
                          }`}
                        >
                          <span className={`size-2.5 rounded-full ${TEAM_STYLES[s.team].dot}`} />
                          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-semibold text-slate-700">
                            <span className="truncate">{s.name}</span>
                            {isOurTeam && (
                              <span className="shrink-0 rounded-full bg-slate-900/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                                우리팀
                              </span>
                            )}
                          </span>
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${BADGE_CLS[r.tone]}`}>{r.text}</span>
                          <span className="text-2xl font-bold tabular-nums text-slate-900">{s.score}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* 쿼터별 상세 (있을 때만) */}
                {quarterCount > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full border-separate border-spacing-1.5 text-sm">
                      <thead>
                        <tr>
                          <th />
                          {Array.from({ length: quarterCount }, (_, i) => i + 1).map((q) => (
                            <th key={q} className="w-9 text-center text-xs font-semibold text-slate-400">
                              {q}Q
                            </th>
                          ))}
                          <th className="w-9 text-center text-xs font-semibold text-slate-500">합계</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map((t) => (
                          <tr key={t.team}>
                            <td className="pr-1">
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                <span className={`size-2 shrink-0 rounded-full ${TEAM_STYLES[t.team].dot}`} />
                                <span className="max-w-20 truncate">{t.name}</span>
                              </span>
                            </td>
                            {Array.from({ length: quarterCount }, (_, i) => i + 1).map((q) => (
                              <td key={q} className="text-center tabular-nums text-slate-500">
                                {quarterScoreMap.get(`${q}-${t.team}`) ?? 0}
                              </td>
                            ))}
                            <td className="text-center font-bold tabular-nums text-slate-900">{scoreByTeam.get(t.team) ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center gap-5">
                <span className="max-w-32 flex-1 truncate text-right text-sm font-semibold text-slate-600">{homeLabel}</span>
                <span className="flex items-center gap-2 text-3xl font-bold tabular-nums">
                  <span className={result!.our_score >= result!.opponent_score ? "text-[#4d7c0f]" : "text-slate-400"}>
                    {result!.our_score}
                  </span>
                  <span className="text-slate-300">:</span>
                  <span className={result!.opponent_score > result!.our_score ? "text-slate-700" : "text-slate-400"}>
                    {result!.opponent_score}
                  </span>
                </span>
                <span className="max-w-32 flex-1 truncate text-left text-sm font-semibold text-slate-600">{awayLabel}</span>
              </div>
            )}
            {result!.note && (
              <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-900/[0.03] px-4 py-2.5 text-sm text-slate-500">
                {result!.note}
              </p>
            )}

            {scorers.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {scorers.map((s) => (
                  <li key={s.user_id} className="flex items-center gap-2.5 rounded-xl bg-white/60 px-3 py-2">
                    <Avatar profile={s.profiles} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                      {s.profiles?.name ?? "축구인"}
                    </span>
                    <span className="flex items-center gap-2 text-xs font-semibold">
                      {s.goals > 0 && (
                        <span className="rounded-full bg-[#84cc16]/15 px-2 py-0.5 text-[#4d7c0f]">⚽ {s.goals}</span>
                      )}
                      {s.assists > 0 && (
                        <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-sky-600">👟 {s.assists}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* 경기 사진·영상 (운영진이 붙임, 활성 회원 전원 열람) */}
        {hasMedia && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-slate-900/[0.06] bg-white/80 p-6 shadow-sm backdrop-blur-xl">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
              <ImageIcon className="size-4 text-[#65a30d]" />
              경기 사진·영상
            </h2>

            {matchVideos.length > 0 && <MatchVideos videos={matchVideos} />}

            {matchImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {matchImages.map((path) => (
                  <a
                    key={path}
                    href={matchImageUrl(path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-slate-900/10"
                  >
                    {/* Storage CDN 이미지라 next/image 대신 일반 img 사용 */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={matchImageUrl(path)}
                      alt="경기 사진"
                      loading="lazy"
                      className="size-full object-cover transition-transform group-hover:scale-105"
                    />
                  </a>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 참석 투표 */}
        {!isCanceled && (
          <section className="mt-6">
            <h2 className="mb-3 px-1 text-sm font-bold text-slate-700">내 참석</h2>
            <AttendancePanel clubId={id} matchId={matchId} myStatus={myChoice} votable={votable} willWaitlist={willWaitlist} />
          </section>
        )}

        {/* 참석 명단 */}
        <section className="mt-6 space-y-4 rounded-3xl border border-slate-900/[0.06] bg-white/60 p-5 backdrop-blur-xl">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Users className="size-4 text-[#65a30d]" />
            참석 현황
          </h2>
          {attendances.length === 0 && notVoted.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">아직 참석 응답이 없어요.</p>
          ) : (
            <>
              <Roster title="참석" rows={attending} accent="bg-[#84cc16]" clubId={id} canLink={isFullMember} />
              <Roster title="대기" rows={waitlist} accent="bg-amber-400" withRank clubId={id} canLink={isFullMember} />
              <Roster title="미정" rows={maybeList} accent="bg-slate-300" clubId={id} canLink={isFullMember} />
              <Roster title="불참" rows={absentList} accent="bg-red-400" clubId={id} canLink={isFullMember} />
              <Roster title="미투표" rows={notVoted} accent="border border-dashed border-slate-400 bg-transparent" muted clubId={id} canLink={isFullMember} />
            </>
          )}
        </section>

        {/* 팀 배정 (자체전만). 운영진(활성 매치)은 배정 편집 카드, 그 외엔 읽기 전용.
            친선전은 우리팀 vs 상대팀이라 개인 배정이 없다(결과에서 팀별 점수만). */}
        {isInternal &&
          teams.length >= 2 &&
          (canManage && !isCanceled ? (
            <TeamEditor clubId={id} matchId={matchId} teams={teams} players={teamPlayers} hasAssignment={hasAssignment} />
          ) : hasAssignment ? (
            <section className="mt-6 space-y-4 rounded-3xl border border-slate-900/[0.06] bg-white/80 p-6 shadow-sm backdrop-blur-xl">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Users className="size-4 text-[#65a30d]" />팀 편성
              </h2>
              <TeamGroups teams={teams} players={teamPlayers} />
            </section>
          ) : null)}

        {/* 운영진 전용: 결과 입력 + 매치 관리 */}
        {canManage && (
          <section className="mt-8 space-y-4 rounded-3xl border border-slate-900/[0.08] bg-white/70 p-5 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Settings2 className="size-4 text-[#65a30d]" />
                매치 관리
                <span className="text-xs font-normal text-slate-400">운영진</span>
              </h2>
              <Link
                href={`/clubs/${id}/matches/${matchId}/edit`}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-900/10 bg-white/70 px-3.5 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:border-[#84cc16]/40 hover:text-[#4d7c0f]"
              >
                <Pencil className="size-3.5" />
                정보 수정
              </Link>
            </div>
            {!isCanceled && (
              <ResultEditor
                clubId={id}
                matchId={matchId}
                mode={teamMode ? "internal" : "external"}
                homeLabel={homeLabel}
                awayLabel={awayLabel}
                teams={editorTeams}
                quarterScores={quarterScoreRows}
                quarterStats={quarterStatRows.map((q) => ({
                  quarter: q.quarter,
                  userId: q.user_id,
                  goals: q.goals,
                  assists: q.assists,
                }))}
                players={players}
                hasResult={hasResult}
                defaultOur={result?.our_score ?? 0}
                defaultOpponent={result?.opponent_score ?? 0}
                defaultNote={result?.note ?? ""}
              />
            )}
            {!isCanceled && (
              <MediaManager
                clubId={id}
                matchId={matchId}
                initialImages={matchImages}
                initialVideos={matchVideos}
              />
            )}
            <MatchManage clubId={id} matchId={matchId} status={match.status} />
          </section>
        )}
      </div>
    </div>
  );
}
