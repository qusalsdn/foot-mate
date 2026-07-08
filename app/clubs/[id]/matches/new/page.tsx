import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MatchForm } from "../match-form";

const MANAGER_ROLES = new Set(["president", "treasurer", "manager", "coach"]);

export default async function NewMatchPage({
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

  // 회장·감독·코치만 매치 생성 (RLS도 막지만 UX상 목록으로 되돌린다)
  if (membership?.status !== "active" || !MANAGER_ROLES.has(membership.role)) {
    redirect(`/clubs/${id}/matches`);
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#f6f8f4] text-slate-900">
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

      <div className="relative mx-auto w-full max-w-lg px-4 py-8 sm:py-10">
        <Link
          href={`/clubs/${id}/matches`}
          className="group mb-6 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-900/5 hover:text-slate-800"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          매치 목록
        </Link>

        <div className="mb-7">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <CalendarPlus className="size-6 text-[#65a30d]" />
            매치 만들기
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {club.name}의 새 일정을 등록해요.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-900/[0.06] bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
          <MatchForm clubId={id} />
        </div>
      </div>
    </div>
  );
}
