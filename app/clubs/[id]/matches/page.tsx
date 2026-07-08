import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  Clock,
  MapPin,
  Swords,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatKstDate, formatKstTime, kstYearMonth } from "@/lib/date";
import { getMatchView, matchTypeLabel } from "@/lib/constants/matches";
import { PageBackBar } from "@/components/page-back-bar";

type MatchRow = {
  id: string;
  title: string;
  match_date: string;
  type: string;
  opponent: string | null;
  location_name: string | null;
  capacity: number | null;
  fee: number;
  status: string;
};

const MANAGER_ROLES = new Set(["president", "treasurer", "manager", "coach"]);

function MatchCard({
  m,
  count,
  clubId,
  now,
}: {
  m: MatchRow;
  count: number;
  clubId: string;
  now: Date;
}) {
  const view = getMatchView(m.status, m.match_date, now);
  return (
    <li>
      <Link href={`/clubs/${clubId}/matches/${m.id}`} className="group block">
        <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-slate-900/[0.06] bg-white/80 p-4 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[#84cc16]/40 hover:shadow-lg hover:shadow-[#84cc16]/10 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-slate-900">
                  {m.title}
                </h3>
                <span className="shrink-0 rounded-full border border-slate-900/10 bg-slate-900/[0.04] px-2 py-0.5 text-xs font-semibold text-slate-500">
                  {matchTypeLabel(m.type)}
                </span>
              </div>
              {m.opponent && (
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                  <Swords className="size-3.5 text-[#65a30d]" />
                  vs {m.opponent}
                </p>
              )}
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${view.badge}`}
            >
              {view.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 text-[#65a30d]" />
              {formatKstDate(m.match_date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4 text-[#65a30d]" />
              {formatKstTime(m.match_date)}
            </span>
            {m.location_name && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 text-[#65a30d]" />
                {m.location_name}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4 text-[#65a30d]" />
              참석 {count}
              {m.capacity ? `/${m.capacity}` : ""}
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

export default async function MatchListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  // 소속 회원만 매치를 볼 수 있다 (RLS도 막지만 UX상 클럽 페이지로 되돌린다)
  if (membership?.status !== "active") redirect(`/clubs/${id}`);
  const canManage = MANAGER_ROLES.has(membership.role);

  const { data: matchData } = await supabase
    .from("matches")
    .select(
      "id, title, match_date, type, opponent, location_name, capacity, fee, status",
    )
    .eq("club_id", id)
    .order("match_date", { ascending: false });
  const matches = (matchData ?? []) as unknown as MatchRow[];

  // 참석 인원 집계 (확정/대기 분리) — 매치별 카운트
  const ids = matches.map((m) => m.id);
  const attendCount = new Map<string, number>();
  if (ids.length > 0) {
    const { data: att } = await supabase
      .from("match_attendances")
      .select("match_id, status, is_waitlist")
      .in("match_id", ids);
    for (const a of (att ?? []) as {
      match_id: string;
      status: string;
      is_waitlist: boolean;
    }[]) {
      if (a.status === "attending" && !a.is_waitlist) {
        attendCount.set(a.match_id, (attendCount.get(a.match_id) ?? 0) + 1);
      }
    }
  }

  // 표시 상태로 분류: 예정(모집중·마감, 시작 전)은 가까운 순,
  // 나머지(진행중·종료·취소)는 최근 순
  const now = new Date();
  const upcoming = matches
    .filter((m) => {
      const key = getMatchView(m.status, m.match_date, now).key;
      return key === "recruiting" || key === "closed";
    })
    .sort((a, b) => a.match_date.localeCompare(b.match_date));
  const past = matches.filter((m) => {
    const key = getMatchView(m.status, m.match_date, now).key;
    return key !== "recruiting" && key !== "closed";
  });

  // 지난 매치를 KST 기준 연 → 월로 그룹핑 (past는 이미 최근순 정렬이라 순서 보존).
  type MonthGroup = { month: number; matches: MatchRow[] };
  type YearGroup = { year: number; months: MonthGroup[] };
  const pastByYear: YearGroup[] = [];
  for (const m of past) {
    const { year, month } = kstYearMonth(m.match_date);
    let yg = pastByYear[pastByYear.length - 1];
    if (!yg || yg.year !== year) {
      yg = { year, months: [] };
      pastByYear.push(yg);
    }
    let mg = yg.months[yg.months.length - 1];
    if (!mg || mg.month !== month) {
      mg = { month, matches: [] };
      yg.months.push(mg);
    }
    mg.matches.push(m);
  }

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
        <PageBackBar href={`/clubs/${id}`} label={club.name} userId={user.id} />

        <div className="mb-7 flex items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <CalendarDays className="size-6 text-[#65a30d]" />
              매치
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              일정을 확인하고 참석 투표를 하세요.
            </p>
          </div>
          {canManage && (
            <Link
              href={`/clubs/${id}/matches/new`}
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-br from-[#bef264] to-[#84cc16] px-3.5 py-2 text-sm font-semibold text-[#1a2e05] shadow-lg shadow-[#a3e635]/40 ring-1 ring-inset ring-white/50 transition-all hover:-translate-y-0.5 hover:from-[#d9f99d] hover:to-[#a3e635] hover:shadow-[#a3e635]/50"
            >
              <CalendarPlus className="size-4" />
              매치 만들기
            </Link>
          )}
        </div>

        {matches.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-900/15 bg-white/60 px-6 py-14 text-center backdrop-blur-sm">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#84cc16]/12 text-[#4d7c0f]">
              <CalendarDays className="size-7" />
            </span>
            <p className="mt-4 text-sm font-medium text-slate-600">
              아직 등록된 매치가 없어요
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {canManage
                ? "첫 매치를 만들어 참석 투표를 시작해보세요."
                : "운영진이 매치를 등록하면 여기에 표시돼요."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <section>
                <h2 className="mb-3 px-1 text-sm font-bold text-slate-700">
                  예정된 매치{" "}
                  <span className="rounded-full bg-slate-900/[0.06] px-2 py-0.5 text-xs font-semibold text-slate-500">
                    {upcoming.length}
                  </span>
                </h2>
                <ul className="grid gap-3">
                  {upcoming.map((m) => (
                    <MatchCard
                      key={m.id}
                      m={m}
                      count={attendCount.get(m.id) ?? 0}
                      clubId={id}
                      now={now}
                    />
                  ))}
                </ul>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="mb-3 px-1 text-sm font-bold text-slate-700">
                  지난 매치{" "}
                  <span className="rounded-full bg-slate-900/[0.06] px-2 py-0.5 text-xs font-semibold text-slate-500">
                    {past.length}
                  </span>
                </h2>
                <div className="space-y-5">
                  {pastByYear.map((yg, yi) => (
                    <div key={yg.year}>
                      <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                        {yg.year}년
                      </h3>
                      <div className="space-y-1.5">
                        {yg.months.map((mg, mi) => (
                          <details
                            key={mg.month}
                            open={yi === 0 && mi === 0}
                            className="group/m"
                          >
                            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-900/[0.03] [&::-webkit-details-marker]:hidden">
                              <ChevronRight className="size-4 shrink-0 text-slate-400 transition-transform group-open/m:rotate-90" />
                              <span className="text-sm font-semibold text-slate-600">
                                {mg.month}월
                              </span>
                              <span className="rounded-full bg-slate-900/[0.06] px-2 py-0.5 text-xs font-semibold text-slate-500">
                                {mg.matches.length}
                              </span>
                            </summary>
                            <ul className="mt-2 grid gap-3 pl-1 opacity-90">
                              {mg.matches.map((m) => (
                                <MatchCard
                                  key={m.id}
                                  m={m}
                                  count={attendCount.get(m.id) ?? 0}
                                  clubId={id}
                                  now={now}
                                />
                              ))}
                            </ul>
                          </details>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
