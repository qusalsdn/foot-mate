import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Compass, LogOut, MapPin, Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { roleLabel } from "@/lib/constants/roles";
import { Button } from "@/components/ui/button";

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

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, avatar_url")
    .eq("id", user.id)
    .single();

  // 내가 속한 클럽 (활성 회원)
  const { data: memberships } = await supabase
    .from("club_members")
    .select("role, clubs(id, name, region, description)")
    .eq("user_id", user.id)
    .eq("status", "active");

  // 둘러보기: 최근 생성된 클럽
  const { data: allClubs } = await supabase
    .from("clubs")
    .select("id, name, region, description")
    .order("created_at", { ascending: false })
    .limit(12);

  const myClubs = (memberships ?? []) as unknown as Array<{
    role: string;
    clubs: Club | null;
  }>;
  const myClubIds = new Set(myClubs.map((m) => m.clubs?.id));
  const discover = ((allClubs ?? []) as Club[]).filter(
    (c) => !myClubIds.has(c.id),
  );

  const displayName = (profile as { name?: string } | null)?.name ?? "축구인";
  const avatarUrl = (profile as { avatar_url?: string } | null)?.avatar_url;

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
            <span className="text-lg font-bold tracking-tight">
              foot<span className="text-[#65a30d]">-</span>mate
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {avatarUrl ? (
              // 카카오 CDN 호스트가 유동적이라 next/image 대신 일반 img 사용
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

        {/* 인사말 */}
        <div className="mb-8">
          <p className="text-sm text-slate-500">안녕하세요,</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
            {displayName}님 <span className="text-[#65a30d]">⚽</span>
          </h1>
        </div>

        {/* 내 클럽 */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Users className="size-5 text-[#65a30d]" />
              내 클럽
              {myClubs.length > 0 && (
                <span className="rounded-full bg-slate-900/[0.06] px-2 py-0.5 text-xs font-semibold text-slate-500">
                  {myClubs.length}
                </span>
              )}
            </h2>
            <Link
              href="/clubs/new"
              className="group inline-flex items-center gap-1.5 rounded-full bg-[#84cc16] px-3.5 py-2 text-sm font-semibold text-[#1a2e05] shadow-md shadow-[#84cc16]/30 transition-all hover:-translate-y-0.5 hover:bg-[#77b514]"
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
              <p className="mt-4 text-sm font-medium text-slate-600">
                아직 소속된 클럽이 없어요
              </p>
              <p className="mt-1 text-sm text-slate-400">
                클럽을 만들거나 아래에서 찾아보세요.
              </p>
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
                            <h3 className="truncate text-base font-semibold">
                              {m.clubs.name}
                            </h3>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                                ROLE_BADGE[m.role] ??
                                "border-slate-900/10 bg-slate-900/[0.04] text-slate-500"
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
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Compass className="size-5 text-[#65a30d]" />
            클럽 둘러보기
          </h2>
          {discover.length === 0 ? (
            <p className="rounded-2xl border border-slate-900/[0.06] bg-white/60 px-5 py-8 text-center text-sm text-slate-400 backdrop-blur-sm">
              둘러볼 다른 클럽이 없어요.
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
                      {c.description && (
                        <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                          {c.description}
                        </p>
                      )}
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
