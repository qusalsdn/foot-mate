import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CalendarDays,
  Goal,
  Handshake,
  Pencil,
  Phone,
  Trophy,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { roleLabel, ROLE_BADGE } from "@/lib/constants/roles";
import { formatKst } from "@/lib/date";
import { PageBackBar } from "@/components/page-back-bar";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string; userId: string }>;
}) {
  const { id, userId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isSelf = userId === user.id;

  // 뷰어가 이 클럽 정회원인지 확인 (게스트·비회원은 회원 명단 비공개 규칙과 동일하게 차단)
  const { data: myMembership } = await supabase
    .from("club_members")
    .select("role, status")
    .eq("club_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  const iAmFullMember =
    myMembership?.status === "active" && myMembership.role !== "guest";
  if (!iAmFullMember) notFound();

  // 대상 회원 (이 클럽 활성 회원이어야 함)
  const { data: target } = await supabase
    .from("club_members")
    .select("role, joined_at")
    .eq("club_id", id)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!target) notFound();

  const { data: club } = await supabase
    .from("clubs")
    .select("name")
    .eq("id", id)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, phone, avatar_url, created_at")
    .eq("id", userId)
    .single();

  const name = profile?.name ?? "축구인";

  // 이 클럽에서의 활동 통계 (골·도움 합계, 참석 매치 수)
  const { data: statRows } = await supabase
    .from("match_stats")
    .select("goals, assists, matches!inner(club_id)")
    .eq("user_id", userId)
    .eq("matches.club_id", id);
  const goals = (statRows ?? []).reduce((s, r) => s + (r.goals ?? 0), 0);
  const assists = (statRows ?? []).reduce((s, r) => s + (r.assists ?? 0), 0);

  const { count: attended } = await supabase
    .from("match_attendances")
    .select("match_id, matches!inner(club_id)", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "attending")
    .eq("matches.club_id", id);

  const stats = [
    { label: "참석 매치", value: attended ?? 0, icon: Trophy },
    { label: "골", value: goals, icon: Goal },
    { label: "도움", value: assists, icon: Handshake },
  ];

  return (
    <div className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-[#f6f8f4] px-5 py-10 text-slate-900">
      {/* 배경: 떠다니는 그라디언트 오브 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,#a3e635_0%,transparent_65%)] opacity-30 blur-3xl [animation:footmate-drift_16s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,#34d399_0%,transparent_65%)] opacity-20 blur-3xl [animation:footmate-drift_20s_ease-in-out_infinite_reverse]"
      />
      {/* 배경: 미세한 그리드 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(#0f172a0d_1px,transparent_1px),linear-gradient(90deg,#0f172a0d_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_72%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,#f6f8f4_0%,transparent_22%,transparent_78%,#f6f8f4_100%)]"
      />

      <div className="relative w-full max-w-lg">
        <PageBackBar href={`/clubs/${id}`} label="클럽으로" userId={user.id} />

        {/* 프로필 카드 */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-900/[0.06] bg-white/80 p-7 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.2)] backdrop-blur-xl sm:p-9">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-9 top-0 h-px bg-gradient-to-r from-transparent via-[#84cc16]/70 to-transparent"
          />

          <div className="flex flex-col items-center text-center">
            {profile?.avatar_url ? (
              // 카카오 CDN 호스트가 유동적이라 next/image 대신 일반 img 사용
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={name}
                referrerPolicy="no-referrer"
                className="size-24 rounded-full object-cover ring-2 ring-slate-900/10 ring-offset-2 ring-offset-white"
              />
            ) : (
              <span className="flex size-24 items-center justify-center rounded-full bg-[#84cc16]/15 text-3xl font-bold text-[#4d7c0f]">
                {name.charAt(0)}
              </span>
            )}

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
              {name}
              {isSelf && (
                <span className="ml-1.5 align-middle text-sm font-normal text-slate-400">
                  (나)
                </span>
              )}
            </h1>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  ROLE_BADGE[target.role] ??
                  "border-slate-900/10 bg-slate-900/[0.04] text-slate-500"
                }`}
              >
                {roleLabel(target.role)}
              </span>
              {club && (
                <span className="text-xs text-slate-400">{club.name}</span>
              )}
            </div>

            {isSelf && (
              <Link
                href="/me"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-900/10 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[#84cc16]/40 hover:text-[#4d7c0f]"
              >
                <Pencil className="size-3.5" />
                내 프로필 수정
              </Link>
            )}
          </div>

          {/* 활동 통계 */}
          <div className="mt-7 grid grid-cols-3 gap-2.5">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center gap-1 rounded-2xl border border-slate-900/[0.06] bg-white/70 py-4 shadow-sm"
              >
                <s.icon className="size-4 text-[#65a30d]" />
                <span className="text-xl font-bold tabular-nums text-slate-900">
                  {s.value}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* 상세 정보 */}
          <dl className="mt-6 space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-900/[0.06] bg-white/70 px-4 py-3 shadow-sm">
              <Phone className="size-4 shrink-0 text-[#65a30d]" />
              <dt className="text-sm text-slate-400">연락처</dt>
              <dd className="ml-auto min-w-0 truncate text-sm font-medium text-slate-700">
                {profile?.phone ? (
                  <a
                    href={`tel:${profile.phone}`}
                    className="hover:text-[#4d7c0f] hover:underline"
                  >
                    {profile.phone}
                  </a>
                ) : (
                  <span className="text-slate-400">미등록</span>
                )}
              </dd>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-900/[0.06] bg-white/70 px-4 py-3 shadow-sm">
              <CalendarDays className="size-4 shrink-0 text-[#65a30d]" />
              <dt className="text-sm text-slate-400">가입일</dt>
              <dd className="ml-auto text-sm font-medium text-slate-700">
                {formatKst(target.joined_at, "yyyy년 M월 d일")}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
