import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  Clock,
  Hourglass,
  MapPin,
  Pencil,
  Settings2,
  Swords,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatKstDate, formatKstTime } from "@/lib/date";
import { getMatchView, matchTypeLabel } from "@/lib/constants/matches";
import { AttendancePanel } from "./attendance-panel";
import { ResultEditor, type EditablePlayer } from "./result-editor";
import { MatchManage } from "./match-manage";

const MANAGER_ROLES = new Set(["president", "treasurer", "manager", "coach"]);

type Profile = { name: string | null; avatar_url: string | null };
type Attendance = {
  user_id: string;
  status: string;
  is_waitlist: boolean;
  responded_at: string;
  profiles: Profile | null;
};
type StatRow = {
  user_id: string;
  goals: number;
  assists: number;
  profiles: Profile | null;
};
type Member = {
  user_id: string;
  role: string;
  profiles: Profile | null;
};

function Roster({
  title,
  rows,
  accent,
  withRank,
  muted,
}: {
  title: string;
  rows: Attendance[];
  accent: string;
  withRank?: boolean;
  muted?: boolean;
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
        {rows.map((a, i) => (
          <li
            key={a.user_id}
            className={`inline-flex items-center gap-2 rounded-full border border-slate-900/[0.06] py-1 pl-1 pr-3 shadow-sm backdrop-blur-xl ${muted ? "bg-white/40 opacity-60" : "bg-white/70"}`}
          >
            {withRank && (
              <span className="ml-1 w-4 text-center text-xs font-bold tabular-nums text-slate-400">
                {i + 1}
              </span>
            )}
            <Avatar profile={a.profiles} />
            <span className="text-sm font-medium text-slate-700">
              {a.profiles?.name ?? "축구인"}
            </span>
          </li>
        ))}
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

  const { data: club } = await supabase
    .from("clubs")
    .select("id, name")
    .eq("id", id)
    .single();
  if (!club) notFound();

  const { data: membership } = await supabase
    .from("club_members")
    .select("role, status")
    .eq("club_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membership?.status !== "active") redirect(`/clubs/${id}`);
  const canManage = MANAGER_ROLES.has(membership.role);

  const { data: match } = await supabase
    .from("matches")
    .select(
      "id, club_id, title, match_date, vote_deadline, type, opponent, location_name, capacity, fee, status",
    )
    .eq("id", matchId)
    .single();
  // 라우트의 클럽과 매치의 클럽이 다르면 404 (URL 조작 방지)
  if (!match || match.club_id !== id) notFound();

  const [{ data: attData }, { data: result }, { data: statData }, { data: memberData }] =
    await Promise.all([
      supabase
        .from("match_attendances")
        .select("user_id, status, is_waitlist, responded_at, profiles(name, avatar_url)")
        .eq("match_id", matchId)
        .order("responded_at", { ascending: true }),
      supabase
        .from("match_results")
        .select("our_score, opponent_score, note")
        .eq("match_id", matchId)
        .maybeSingle(),
      supabase
        .from("match_stats")
        .select("user_id, goals, assists, profiles(name, avatar_url)")
        .eq("match_id", matchId),
      // 미투표 계산용 활성 회원 명단. RLS상 정회원만 전체가 보이고(게스트는 자기 행만),
      // 게스트는 아래에서 미투표 섹션 자체를 숨긴다.
      supabase
        .from("club_members")
        .select("user_id, role, profiles(name, avatar_url)")
        .eq("club_id", id)
        .eq("status", "active"),
    ]);

  const attendances = (attData ?? []) as unknown as Attendance[];
  const stats = (statData ?? []) as unknown as StatRow[];
  const members = (memberData ?? []) as unknown as Member[];

  const attending = attendances.filter(
    (a) => a.status === "attending" && !a.is_waitlist,
  );
  const waitlist = attendances.filter(
    (a) => a.status === "attending" && a.is_waitlist,
  );
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
        .sort((a, b) =>
          (a.profiles?.name ?? "").localeCompare(b.profiles?.name ?? "", "ko"),
        )
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
  const deadlinePassed =
    match.vote_deadline != null && new Date(match.vote_deadline) <= now;
  const started = new Date(match.match_date) <= now;
  // 투표 가능: 모집중 & 마감시각 이전 & 킥오프 이전
  const votable = match.status === "scheduled" && !deadlinePassed && !started;
  const capacityFull =
    match.capacity != null && attending.length >= match.capacity;
  // 지금 '참석' 누르면 대기자 편입되는지 (이미 확정 참석이면 아님)
  const willWaitlist =
    capacityFull && !(myAtt?.status === "attending" && !myAtt.is_waitlist);

  const hasResult = !!result;
  const isCanceled = match.status === "canceled";

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
        <Link
          href={`/clubs/${id}/matches`}
          className="group mb-6 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-900/5 hover:text-slate-800"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          매치 목록
        </Link>

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
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${view.badge}`}
                >
                  {view.label}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {match.title}
              </h1>
              {match.opponent && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-500">
                  <Swords className="size-4 text-[#65a30d]" />
                  vs {match.opponent}
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
              <div
                className={`col-span-2 flex items-center gap-2 ${deadlinePassed ? "text-red-500" : "text-slate-600"}`}
              >
                <Hourglass className="size-4 shrink-0 text-[#65a30d]" />
                투표 마감 {formatKstDate(match.vote_deadline)}{" "}
                {formatKstTime(match.vote_deadline)}
                {deadlinePassed && (
                  <span className="font-semibold">· 마감됨</span>
                )}
              </div>
            )}
          </dl>
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
            <div className="flex items-center justify-center gap-5">
              <span className="max-w-32 flex-1 truncate text-right text-sm font-semibold text-slate-600">
                {club.name}
              </span>
              <span className="flex items-center gap-2 text-3xl font-bold tabular-nums">
                <span
                  className={
                    result!.our_score >= result!.opponent_score
                      ? "text-[#4d7c0f]"
                      : "text-slate-400"
                  }
                >
                  {result!.our_score}
                </span>
                <span className="text-slate-300">:</span>
                <span
                  className={
                    result!.opponent_score > result!.our_score
                      ? "text-slate-700"
                      : "text-slate-400"
                  }
                >
                  {result!.opponent_score}
                </span>
              </span>
              <span className="max-w-32 flex-1 truncate text-left text-sm font-semibold text-slate-600">
                {match.opponent || "상대팀"}
              </span>
            </div>
            {result!.note && (
              <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-900/[0.03] px-4 py-2.5 text-sm text-slate-500">
                {result!.note}
              </p>
            )}

            {scorers.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {scorers.map((s) => (
                  <li
                    key={s.user_id}
                    className="flex items-center gap-2.5 rounded-xl bg-white/60 px-3 py-2"
                  >
                    <Avatar profile={s.profiles} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                      {s.profiles?.name ?? "축구인"}
                    </span>
                    <span className="flex items-center gap-2 text-xs font-semibold">
                      {s.goals > 0 && (
                        <span className="rounded-full bg-[#84cc16]/15 px-2 py-0.5 text-[#4d7c0f]">
                          ⚽ {s.goals}
                        </span>
                      )}
                      {s.assists > 0 && (
                        <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-sky-600">
                          👟 {s.assists}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* 참석 투표 */}
        {!isCanceled && (
          <section className="mt-6">
            <h2 className="mb-3 px-1 text-sm font-bold text-slate-700">
              내 참석
            </h2>
            <AttendancePanel
              clubId={id}
              matchId={matchId}
              myStatus={myChoice}
              votable={votable}
              willWaitlist={willWaitlist}
            />
          </section>
        )}

        {/* 참석 명단 */}
        <section className="mt-6 space-y-4 rounded-3xl border border-slate-900/[0.06] bg-white/60 p-5 backdrop-blur-xl">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Users className="size-4 text-[#65a30d]" />
            참석 현황
          </h2>
          {attendances.length === 0 && notVoted.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              아직 참석 응답이 없어요.
            </p>
          ) : (
            <>
              <Roster
                title="참석"
                rows={attending}
                accent="bg-[#84cc16]"
              />
              <Roster
                title="대기"
                rows={waitlist}
                accent="bg-amber-400"
                withRank
              />
              <Roster title="미정" rows={maybeList} accent="bg-slate-300" />
              <Roster title="불참" rows={absentList} accent="bg-red-400" />
              <Roster
                title="미투표"
                rows={notVoted}
                accent="border border-dashed border-slate-400 bg-transparent"
                muted
              />
            </>
          )}
        </section>

        {/* 운영진 전용: 결과 입력 + 매치 관리 */}
        {canManage && (
          <section className="mt-8 space-y-4 rounded-3xl border border-slate-900/[0.08] bg-white/70 p-5 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Settings2 className="size-4 text-[#65a30d]" />
                매치 관리
                <span className="text-xs font-normal text-slate-400">
                  운영진
                </span>
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
                clubName={club.name}
                opponent={match.opponent}
                players={players}
                hasResult={hasResult}
                defaultOur={result?.our_score ?? 0}
                defaultOpponent={result?.opponent_score ?? 0}
                defaultNote={result?.note ?? ""}
              />
            )}
            <MatchManage clubId={id} matchId={matchId} status={match.status} />
          </section>
        )}
      </div>
    </div>
  );
}
