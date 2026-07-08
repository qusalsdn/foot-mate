import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { CalendarDays, ChevronRight, Clock, Compass, LogOut, MapPin, Plus, Search, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { roleLabel } from "@/lib/constants/roles";
import { formatKstDate, formatKstTime } from "@/lib/date";
import { SIDO_LIST, districtsOf, formatRegion, parseRegion, sidoOrder } from "@/lib/constants/regions";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { InstallPrompt } from "@/components/pwa/install-prompt";

type Club = {
  id: string;
  name: string;
  region: string | null;
  description: string | null;
};

// 클럽 이름 → 안정적인 파스텔 그라디언트 (id 해시 기반)
const AVATAR_GRADIENTS = [
  "from-[#a3e635] to-[#22c55e]",
  "from-[#34d399] to-[#0ea5e9]",
  "from-[#facc15] to-[#84cc16]",
  "from-[#38bdf8] to-[#6366f1]",
  "from-[#fb923c] to-[#f43f5e]",
  "from-[#c084fc] to-[#6366f1]",
];

function gradientFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

function ClubAvatar({ id, name, size = "md" }: { id: string; name: string; size?: "md" | "lg" }) {
  const dim = size === "lg" ? "size-12 text-lg" : "size-10 text-base";
  return (
    <span
      className={`flex ${dim} shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradientFor(id)} font-bold text-white shadow-sm`}
    >
      {name.trim().charAt(0) || "⚽"}
    </span>
  );
}

// 역할별 뱃지 색 (회장·총무 = 라임 강조, 나머지는 중립)
const ROLE_BADGE: Record<string, string> = {
  president: "border-[#84cc16]/30 bg-[#84cc16]/10 text-[#4d7c0f]",
  treasurer: "border-[#84cc16]/30 bg-[#84cc16]/10 text-[#4d7c0f]",
};

type UpcomingMatch = {
  id: string;
  club_id: string;
  title: string;
  match_date: string;
  status: string;
};
type MyVote = { status: string; is_waitlist: boolean };

// 내 참석 응답 뱃지 (미투표 = 라임 강조로 투표 넛지)
function VoteBadge({ vote }: { vote?: MyVote }) {
  let label: string;
  let cls: string;
  if (!vote) {
    label = "미투표";
    cls = "border-[#84cc16]/40 bg-[#84cc16]/10 text-[#4d7c0f]";
  } else if (vote.status === "attending" && vote.is_waitlist) {
    label = "대기";
    cls = "border-amber-500/25 bg-amber-500/10 text-amber-600";
  } else if (vote.status === "attending") {
    label = "참석";
    cls = "border-[#84cc16]/50 bg-[#84cc16] text-[#1a2e05]";
  } else if (vote.status === "maybe") {
    label = "미정";
    cls = "border-slate-900/10 bg-slate-900/[0.04] text-slate-500";
  } else {
    label = "불참";
    cls = "border-red-500/25 bg-red-500/[0.08] text-red-500";
  }
  return <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string; sido?: string; gu?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  // 시/도·구는 상수에 존재하는 값만 신뢰 (URL 임의값·필터 주입 방지)
  const sidoParam = (sp.sido ?? "").trim();
  const sido = (SIDO_LIST as readonly string[]).includes(sidoParam) ? sidoParam : "";
  const guParam = (sp.gu ?? "").trim();
  const gu = sido && districtsOf(sido).includes(guParam) ? guParam : "";
  const hasFilter = q !== "" || sido !== "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("name, avatar_url").eq("id", user.id).single();

  // 내가 속한 클럽 (활성 회원)
  const { data: memberships } = await supabase
    .from("club_members")
    .select("role, clubs(id, name, region, description)")
    .eq("user_id", user.id)
    .eq("status", "active");

  const myClubs = (memberships ?? []) as unknown as Array<{
    role: string;
    clubs: Club | null;
  }>;
  const myClubIds = new Set(myClubs.map((m) => m.clubs?.id));

  // 다가오는 매치: 내가 속한 모든 클럽의 예정(모집중·마감) & 미래 경기, 가까운 순 4개
  const activeClubIds = myClubs.map((m) => m.clubs?.id).filter((v): v is string => !!v);
  const clubNameById = new Map(myClubs.map((m) => [m.clubs?.id, m.clubs?.name] as const));
  let upcomingMatches: UpcomingMatch[] = [];
  const myVotes = new Map<string, MyVote>();
  if (activeClubIds.length > 0) {
    const { data: um } = await supabase
      .from("matches")
      .select("id, club_id, title, match_date, status")
      .in("club_id", activeClubIds)
      .in("status", ["scheduled", "closed"])
      .gte("match_date", new Date().toISOString())
      .order("match_date", { ascending: true })
      .limit(4);
    upcomingMatches = (um ?? []) as unknown as UpcomingMatch[];

    if (upcomingMatches.length > 0) {
      // 내 응답만 조회해 매치별로 매핑 (미투표 넛지용)
      const { data: votes } = await supabase
        .from("match_attendances")
        .select("match_id, status, is_waitlist")
        .eq("user_id", user.id)
        .in(
          "match_id",
          upcomingMatches.map((m) => m.id),
        );
      for (const v of (votes ?? []) as {
        match_id: string;
        status: string;
        is_waitlist: boolean;
      }[]) {
        myVotes.set(v.match_id, {
          status: v.status,
          is_waitlist: v.is_waitlist,
        });
      }
    }
  }

  // 지역 필터 칩: 전체 클럽(내 클럽 포함)의 지역을 시/도·구로 파싱해 노출
  const { data: regionRows } = await supabase.from("clubs").select("region").not("region", "is", null);
  const parsedRegions = ((regionRows ?? []) as { region: string | null }[])
    .map((r) => r.region?.trim())
    .filter((r): r is string => !!r)
    .map(parseRegion);
  // 존재하는 시/도 (표준 순서)
  const presentSido = Array.from(new Set(parsedRegions.map((r) => r.sido))).sort((a, b) => sidoOrder(a) - sidoOrder(b));
  // 선택된 시/도에 존재하는 구 (해당 시/도 정의 순서)
  const presentGu = sido ? districtsOf(sido).filter((d) => parsedRegions.some((r) => r.sido === sido && r.gu === d)) : [];

  // 둘러보기: 검색어(이름) + 지역 필터. 없으면 최근 생성순.
  let clubsQuery = supabase
    .from("clubs")
    .select("id, name, region, description")
    .order("created_at", { ascending: false })
    .limit(24);
  // ilike 값은 URL 인코딩되어 안전하게 전달됨 (필터 구문 주입 걱정 없음)
  if (q) clubsQuery = clubsQuery.ilike("name", `%${q}%`);
  if (sido && gu) {
    clubsQuery = clubsQuery.eq("region", formatRegion(sido, gu));
  } else if (sido) {
    // "서울"(구 미지정)과 "서울 …"(구 지정) 모두 포함
    clubsQuery = clubsQuery.ilike("region", `${sido}%`);
  }
  const { data: allClubs } = await clubsQuery;

  // 검색·지역 필터가 걸리면 내 클럽도 포함(전체에서 검색), 기본 화면에서만 내 클럽 숨김
  const discover = ((allClubs ?? []) as Club[]).filter((c) => hasFilter || !myClubIds.has(c.id));

  const displayName = (profile as { name?: string } | null)?.name ?? "축구인";
  const avatarUrl = (profile as { avatar_url?: string } | null)?.avatar_url;

  // 검색어/시/도/구를 합쳐 둘러보기 링크 생성 (빈 값은 생략)
  const discoverHref = (next: { q?: string; sido?: string; gu?: string }) => {
    const params = new URLSearchParams();
    const nq = next.q ?? q;
    const ns = next.sido ?? sido;
    // 시/도가 바뀌면 구는 무효 → next.sido가 오면 gu는 명시값만 사용
    const ng = next.sido !== undefined ? (next.gu ?? "") : (next.gu ?? gu);
    if (nq) params.set("q", nq);
    if (ns) params.set("sido", ns);
    if (ns && ng) params.set("gu", ng);
    const s = params.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#f6f8f4] text-slate-900">
      {/* 배경: 떠다니는 그라디언트 오브 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,#a3e635_0%,transparent_65%)] opacity-25 blur-3xl [animation:footmate-drift_16s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-40 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,#34d399_0%,transparent_65%)] opacity-[0.18] blur-3xl [animation:footmate-drift_20s_ease-in-out_infinite_reverse]"
      />
      {/* 배경: 미세한 그리드 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(#0f172a0d_1px,transparent_1px),linear-gradient(90deg,#0f172a0d_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_top,#000_20%,transparent_70%)]"
      />

      <div className="relative mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
        {/* 상단 바 */}
        <header className="mb-8 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/app-icon-192.png"
              alt="foot-mate"
              width={38}
              height={38}
              priority
              className="rounded-xl shadow-sm ring-1 ring-slate-900/10"
            />
            <span className="text-lg font-bold tracking-tight">Foot Mate</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell userId={user.id} />
            <Link
              href="/me"
              title="내 프로필"
              className="rounded-full outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#84cc16]/50"
            >
              {avatarUrl ? (
                // 카카오/Storage CDN 호스트가 유동적이라 next/image 대신 일반 img 사용
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  width={36}
                  height={36}
                  referrerPolicy="no-referrer"
                  className="size-9 rounded-full object-cover ring-1 ring-slate-900/10"
                />
              ) : (
                <span className="flex size-9 items-center justify-center rounded-full bg-[#84cc16]/15 text-sm font-bold text-[#4d7c0f]">
                  {displayName.charAt(0)}
                </span>
              )}
            </Link>
            <form action="/auth/signout" method="post">
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                title="로그아웃"
                className="size-9 rounded-full text-slate-400 hover:bg-slate-900/5 hover:text-slate-700"
              >
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </header>

        {/* PWA 설치 유도 (안드로이드/데스크톱 버튼 · iOS 안내) */}
        <InstallPrompt />

        {/* 인사말 */}
        <div className="mb-8">
          <p className="text-sm text-slate-500">안녕하세요,</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
            {displayName}님 <span className="text-[#65a30d]">⚽</span>
          </h1>
        </div>

        {/* 다가오는 매치 (있을 때만) */}
        {upcomingMatches.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <CalendarDays className="size-5 text-[#65a30d]" />
              다가오는 매치
            </h2>
            <ul className="grid gap-3">
              {upcomingMatches.map((m) => (
                <li key={m.id}>
                  <Link href={`/clubs/${m.club_id}/matches/${m.id}`} className="group block">
                    <div className="flex items-center gap-3.5 rounded-2xl border border-slate-900/[0.06] bg-white/80 p-3.5 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[#84cc16]/40 hover:shadow-lg hover:shadow-[#84cc16]/10 sm:p-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#84cc16]/12 text-[#4d7c0f]">
                        <CalendarDays className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-400">{clubNameById.get(m.club_id) ?? "내 클럽"}</p>
                        <p className="truncate text-sm font-semibold text-slate-900">{m.title}</p>
                        <p className="mt-0.5 flex items-center gap-x-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3" />
                            {formatKstDate(m.match_date)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatKstTime(m.match_date)}
                          </span>
                        </p>
                      </div>
                      <VoteBadge vote={myVotes.get(m.id)} />
                      <ChevronRight className="size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#65a30d]" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 내 클럽 */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Users className="size-5 text-[#65a30d]" />내 클럽
              {myClubs.length > 0 && (
                <span className="rounded-full bg-slate-900/[0.06] px-2 py-0.5 text-xs font-semibold text-slate-500">
                  {myClubs.length}
                </span>
              )}
            </h2>
            <Link
              href="/clubs/new"
              className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#bef264] to-[#84cc16] px-3.5 py-2 text-sm font-semibold text-[#1a2e05] shadow-lg shadow-[#a3e635]/40 ring-1 ring-inset ring-white/50 transition-all hover:-translate-y-0.5 hover:from-[#d9f99d] hover:to-[#a3e635] hover:shadow-[#a3e635]/50"
            >
              <Plus className="size-4 transition-transform group-hover:rotate-90" />
              클럽 만들기
            </Link>
          </div>

          {myClubs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-900/15 bg-white/60 px-6 py-12 text-center backdrop-blur-sm">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#84cc16]/12 text-[#4d7c0f]">
                <Users className="size-7" />
              </span>
              <p className="mt-4 text-sm font-medium text-slate-600">아직 소속된 클럽이 없어요</p>
              <p className="mt-1 text-sm text-slate-400">클럽을 만들거나 아래에서 찾아보세요.</p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {myClubs.map((m) =>
                m.clubs ? (
                  <li key={m.clubs.id}>
                    <Link href={`/clubs/${m.clubs.id}`} className="group block">
                      <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-900/[0.06] bg-white/80 p-4 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[#84cc16]/40 hover:shadow-lg hover:shadow-[#84cc16]/10">
                        <ClubAvatar id={m.clubs.id} name={m.clubs.name} size="lg" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-base font-semibold">{m.clubs.name}</h3>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                                ROLE_BADGE[m.role] ?? "border-slate-900/10 bg-slate-900/[0.04] text-slate-500"
                              }`}
                            >
                              {roleLabel(m.role)}
                            </span>
                          </div>
                          {m.clubs.region && (
                            <p className="mt-1 flex items-center gap-1 text-sm text-slate-400">
                              <MapPin className="size-3.5" />
                              {m.clubs.region}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          )}
        </section>

        {/* 클럽 둘러보기 */}
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Compass className="size-5 text-[#65a30d]" />
              클럽 둘러보기
            </h2>
            {hasFilter && (
              <Link
                href="/"
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-600"
              >
                <X className="size-3.5" />
                필터 초기화
              </Link>
            )}
          </div>

          {/* 검색 (이름) — JS 없이 동작하는 GET 폼 */}
          <form method="get" className="relative mb-3">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="클럽 이름 검색"
              className="h-11 w-full rounded-2xl border border-slate-900/[0.08] bg-white/80 pl-10 pr-4 text-sm shadow-sm outline-none backdrop-blur-xl transition-colors placeholder:text-slate-400 focus:border-[#84cc16]/60 focus:ring-2 focus:ring-[#84cc16]/20"
            />
            {sido && <input type="hidden" name="sido" value={sido} />}
            {sido && gu && <input type="hidden" name="gu" value={gu} />}
          </form>

          {/* 지역 필터 칩 — 1단계: 시/도 */}
          {presentSido.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              <Link
                href={discoverHref({ sido: "" })}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  !sido
                    ? "border-[#84cc16]/40 bg-[#84cc16]/15 text-[#4d7c0f]"
                    : "border-slate-900/[0.08] bg-white/70 text-slate-500 hover:bg-slate-900/5"
                }`}
              >
                전체
              </Link>
              {presentSido.map((s) => (
                <Link
                  key={s}
                  href={discoverHref({ sido: s })}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    sido === s
                      ? "border-[#84cc16]/40 bg-[#84cc16]/15 text-[#4d7c0f]"
                      : "border-slate-900/[0.08] bg-white/70 text-slate-500 hover:bg-slate-900/5"
                  }`}
                >
                  <MapPin className="size-3" />
                  {s}
                </Link>
              ))}
            </div>
          )}

          {/* 지역 필터 칩 — 2단계: 구/군 (시/도 선택 시) */}
          {sido && presentGu.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2 border-l-2 border-[#84cc16]/30 pl-3">
              <Link
                href={discoverHref({ sido, gu: "" })}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  !gu
                    ? "border-[#84cc16]/40 bg-[#84cc16]/15 text-[#4d7c0f]"
                    : "border-slate-900/[0.08] bg-white/70 text-slate-500 hover:bg-slate-900/5"
                }`}
              >
                {sido} 전체
              </Link>
              {presentGu.map((d) => (
                <Link
                  key={d}
                  href={discoverHref({ sido, gu: d })}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    gu === d
                      ? "border-[#84cc16]/40 bg-[#84cc16]/15 text-[#4d7c0f]"
                      : "border-slate-900/[0.08] bg-white/70 text-slate-500 hover:bg-slate-900/5"
                  }`}
                >
                  {d}
                </Link>
              ))}
            </div>
          )}
          {!(sido && presentGu.length > 0) && <div className="mb-5" />}

          {discover.length === 0 ? (
            <p className="rounded-2xl border border-slate-900/[0.06] bg-white/60 px-5 py-8 text-center text-sm text-slate-400 backdrop-blur-sm">
              {hasFilter ? "조건에 맞는 클럽이 없어요." : "둘러볼 다른 클럽이 없어요."}
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {discover.map((c) => (
                <li key={c.id}>
                  <Link href={`/clubs/${c.id}`} className="group block h-full">
                    <div className="flex h-full flex-col rounded-2xl border border-slate-900/[0.06] bg-white/80 p-4 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[#84cc16]/40 hover:shadow-lg hover:shadow-[#84cc16]/10">
                      <div className="flex items-center gap-3">
                        <ClubAvatar id={c.id} name={c.name} />
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold">{c.name}</h3>
                          {c.region && (
                            <p className="flex items-center gap-1 text-xs text-slate-400">
                              <MapPin className="size-3" />
                              {c.region}
                            </p>
                          )}
                        </div>
                      </div>
                      {c.description && <p className="mt-3 line-clamp-2 text-sm text-slate-500">{c.description}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
