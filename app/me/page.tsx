import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, UserCog } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export default async function MyProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, phone, avatar_url")
    .eq("id", user.id)
    .single();

  const p = (profile ?? {}) as {
    name?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
  };

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
      {/* 배경: 위·아래 페이드 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,#f6f8f4_0%,transparent_22%,transparent_78%,#f6f8f4_100%)]"
      />

      <div className="relative w-full max-w-lg">
        <Link
          href="/"
          className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          홈으로
        </Link>

        {/* 카드 */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-900/[0.06] bg-white/80 p-7 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.2)] backdrop-blur-xl sm:p-9">
          {/* 카드 상단 하이라이트 라인 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-9 top-0 h-px bg-gradient-to-r from-transparent via-[#84cc16]/70 to-transparent"
          />

          {/* 헤더 */}
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#84cc16]/30 bg-[#84cc16]/[0.08] px-3 py-1 text-xs font-semibold text-[#4d7c0f]">
              <UserCog className="size-3.5" />
              내 프로필
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
              내 정보 수정
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              프로필 사진·이름·연락처를 관리해요.
            </p>
          </div>

          <ProfileForm
            userId={user.id}
            initialName={p.name ?? ""}
            initialPhone={p.phone ?? ""}
            initialAvatarUrl={p.avatar_url ?? null}
          />
        </div>
      </div>
    </div>
  );
}
