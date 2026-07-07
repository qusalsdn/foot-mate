import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { roleLabel } from "@/lib/constants/roles";
import { joinClub } from "./actions";
import { DeleteClubButton } from "./delete-club-button";
import { Button } from "@/components/ui/button";

// 클럽 이름 → 안정적인 파스텔 그라디언트 (id 해시 기반) — 홈 화면과 동일 팔레트
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

// 역할별 뱃지 색 (회장·총무 = 라임 강조, 나머지는 중립)
const ROLE_BADGE: Record<string, string> = {
  president: "border-[#84cc16]/30 bg-[#84cc16]/10 text-[#4d7c0f]",
  treasurer: "border-[#84cc16]/30 bg-[#84cc16]/10 text-[#4d7c0f]",
};

// 로스터 정렬용 역할 우선순위
const ROLE_ORDER: Record<string, number> = {
  president: 0,
  treasurer: 1,
  manager: 2,
  coach: 3,
  member: 4,
  guest: 5,
};

type RosterRow = {
  role: string;
  user_id: string;
  profiles: { name: string | null; avatar_url: string | null } | null;
};

// 곧 추가될 기능 미리보기 타일
const FEATURES = [
  { icon: CalendarDays, label: "매치", desc: "일정·참석 투표" },
  { icon: Wallet, label: "회비", desc: "정산·미납 관리" },
  { icon: MessageSquare, label: "커뮤니티", desc: "게시판·댓글" },
  { icon: Users, label: "회원", desc: "명단·역할" },
];

export default async function ClubDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, region, description, join_policy")
    .eq("id", id)
    .single();
  if (!club) notFound();

  const { data: membership } = await supabase
    .from("club_members")
    .select("role, status")
    .eq("club_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const isActiveMember = membership?.status === "active";
  const isPending = membership?.status === "pending";
  const isFullMember = isActiveMember && membership?.role !== "guest";
  const isOwner = isActiveMember && membership?.role === "president";
  const isOpenJoin = club.join_policy === "open";
  const joinClubWithId = joinClub.bind(null, id);

  // 정회원만 로스터 조회 가능 (RLS: is_full_member). 게스트·비회원은 빈 결과.
  let roster: RosterRow[] = [];
  if (isFullMember) {
    const { data } = await supabase
      .from("club_members")
      .select("role, user_id, profiles(name, avatar_url)")
      .eq("club_id", id)
      .eq("status", "active");
    roster = ((data ?? []) as unknown as RosterRow[]).sort(
      (a, b) =>
        (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9),
    );
  }

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

      <div className="relative mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
        {/* 뒤로가기 */}
        <Link
          href="/"
          className="group mb-6 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-900/5 hover:text-slate-800"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          홈으로
        </Link>

        {errorParam === "delete" && (
          <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm font-medium text-red-600">
            클럽을 삭제하지 못했어요. 권한을 확인하거나 잠시 후 다시 시도해 주세요.
          </div>
        )}

        {/* 히어로 카드 */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-900/[0.06] bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
          {/* 카드 상단 그라디언트 액센트 */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 -top-24 h-40 bg-gradient-to-br ${gradientFor(club.id)} opacity-20 blur-2xl`}
          />
          <div className="relative flex items-start gap-4 sm:gap-5">
            <span
              className={`flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradientFor(club.id)} text-2xl font-bold text-white shadow-md sm:size-20 sm:text-3xl`}
            >
              {club.name.trim().charAt(0) || "⚽"}
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {club.name}
                </h1>
                {isActiveMember && membership && (
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      ROLE_BADGE[membership.role] ??
                      "border-slate-900/10 bg-slate-900/[0.04] text-slate-500"
                    }`}
                  >
                    내 역할 · {roleLabel(membership.role)}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                {club.region && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-4 text-[#65a30d]" />
                    {club.region}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="size-4 text-[#65a30d]" />
                  {isOpenJoin ? "누구나 가입" : "승인제 가입"}
                </span>
                {isFullMember && roster.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-4 text-[#65a30d]" />
                    회원 {roster.length}명
                  </span>
                )}
              </div>
            </div>
          </div>

          {club.description && (
            <p className="relative mt-5 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-600">
              {club.description}
            </p>
          )}

          {/* 가입 상태별 액션 */}
          <div className="relative mt-6">
            {!membership && (
              <form action={joinClubWithId}>
                <Button
                  type="submit"
                  className="h-11 w-full rounded-2xl bg-[#84cc16] text-[15px] font-semibold text-[#1a2e05] shadow-md shadow-[#84cc16]/30 transition-all hover:-translate-y-0.5 hover:bg-[#77b514] sm:w-auto sm:px-8"
                >
                  {isOpenJoin ? "가입하기" : "가입 신청"}
                </Button>
                {!isOpenJoin && (
                  <p className="mt-2 text-xs text-slate-400">
                    신청 후 운영진 승인이 필요해요.
                  </p>
                )}
              </form>
            )}
            {isPending && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-[#84cc16]/25 bg-[#84cc16]/[0.07] px-4 py-3 text-sm text-[#4d7c0f]">
                <span className="relative flex size-2.5 shrink-0">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#84cc16] opacity-60" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-[#84cc16]" />
                </span>
                가입 신청됨 — 운영진 승인을 기다리는 중이에요.
              </div>
            )}
            {isActiveMember && (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-[#84cc16]/25 bg-[#84cc16]/[0.07] px-4 py-2.5 text-sm font-medium text-[#4d7c0f]">
                <ShieldCheck className="size-4" />
                이 클럽의 멤버입니다
              </div>
            )}
          </div>
        </div>

        {/* 회원 명단 (정회원만) */}
        {isFullMember && roster.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 flex items-center gap-2 px-1 text-sm font-bold text-slate-700">
              <Users className="size-4 text-[#65a30d]" />
              회원
              <span className="rounded-full bg-slate-900/[0.06] px-2 py-0.5 text-xs font-semibold text-slate-500">
                {roster.length}
              </span>
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {roster.map((m) => {
                const name = m.profiles?.name ?? "축구인";
                const avatar = m.profiles?.avatar_url;
                return (
                  <li
                    key={m.user_id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-900/[0.06] bg-white/70 px-3.5 py-2.5 shadow-sm backdrop-blur-xl"
                  >
                    {avatar ? (
                      // 카카오 CDN 호스트가 유동적이라 next/image 대신 일반 img 사용
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatar}
                        alt={name}
                        referrerPolicy="no-referrer"
                        className="size-9 shrink-0 rounded-full object-cover ring-1 ring-slate-900/10"
                      />
                    ) : (
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#84cc16]/15 text-sm font-bold text-[#4d7c0f]">
                        {name.charAt(0)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                      {name}
                    </span>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                        ROLE_BADGE[m.role] ??
                        "border-slate-900/10 bg-slate-900/[0.04] text-slate-500"
                      }`}
                    >
                      {roleLabel(m.role)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* 곧 추가될 기능 미리보기 */}
        <section className="mt-6">
          <h2 className="mb-3 px-1 text-sm font-bold text-slate-700">
            클럽 기능{" "}
            <span className="font-medium text-slate-400">· 곧 추가돼요</span>
          </h2>
          <ul className="grid grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <li
                key={f.label}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-900/[0.1] bg-white/50 px-4 py-3.5 backdrop-blur-sm"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#84cc16]/12 text-[#4d7c0f]">
                  <f.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700">
                    {f.label}
                  </p>
                  <p className="truncate text-xs text-slate-400">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 위험 구역 (회장 전용) */}
        {isOwner && (
          <section className="mt-8">
            <div className="flex flex-col gap-3 rounded-2xl border border-red-500/15 bg-red-500/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-700">클럽 삭제</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  클럽과 모든 데이터가 영구 삭제돼요. 되돌릴 수 없어요.
                </p>
              </div>
              <DeleteClubButton clubId={club.id} clubName={club.name} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
