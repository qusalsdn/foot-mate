import { notFound, redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { utcIsoToKstInput } from "@/lib/date";
import { MatchForm, type MatchFormValues } from "../../match-form";
import { PageBackBar } from "@/components/page-back-bar";

const MANAGER_ROLES = new Set(["president", "treasurer", "manager", "coach"]);

export default async function EditMatchPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const { id, matchId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("club_members")
    .select("role, status")
    .eq("club_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  // 회장·감독·코치만 수정 (RLS도 막지만 UX상 상세로 되돌린다)
  if (membership?.status !== "active" || !MANAGER_ROLES.has(membership.role)) {
    redirect(`/clubs/${id}/matches/${matchId}`);
  }

  const { data: match } = await supabase
    .from("matches")
    .select(
      "id, club_id, title, match_date, vote_deadline, type, opponent, location_name, capacity, fee",
    )
    .eq("id", matchId)
    .single();
  if (!match || match.club_id !== id) notFound();

  const initial: MatchFormValues = {
    title: match.title,
    matchDate: utcIsoToKstInput(match.match_date),
    voteDeadline: match.vote_deadline
      ? utcIsoToKstInput(match.vote_deadline)
      : "",
    type: match.type,
    opponent: match.opponent ?? "",
    locationName: match.location_name ?? "",
    capacity: match.capacity != null ? String(match.capacity) : "",
    fee: match.fee ? String(match.fee) : "",
  };

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
        <PageBackBar
          href={`/clubs/${id}/matches/${matchId}`}
          label="매치로 돌아가기"
          userId={user.id}
        />

        <div className="mb-7">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <Pencil className="size-6 text-[#65a30d]" />
            매치 수정
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            일정 정보를 변경해요. 참석·결과는 그대로 유지돼요.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-900/[0.06] bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
          <MatchForm clubId={id} matchId={matchId} initial={initial} />
        </div>
      </div>
    </div>
  );
}
