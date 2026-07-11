import { notFound, redirect } from "next/navigation";
import { PenSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "../post-form";
import { PageBackBar } from "@/components/page-back-bar";

const MANAGER_ROLES = new Set(["president", "treasurer", "manager", "coach"]);

export default async function NewPostPage({
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

  // 소속 회원만 글을 쓸 수 있다 (RLS도 막지만 UX상 커뮤니티로 되돌린다)
  if (membership?.status !== "active") redirect(`/clubs/${id}/community`);
  // 게스트는 글 작성 불가 — 조회·댓글만 (RLS `post write`=is_full_member 와 일치)
  if (membership.role === "guest") redirect(`/clubs/${id}/community`);
  // 공지는 운영진(회장·총무·감독·코치)만 — RLS `post write` 와 동일 기준
  const canPostNotice = MANAGER_ROLES.has(membership.role);

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
          href={`/clubs/${id}/community`}
          label="커뮤니티"
          userId={user.id}
        />

        <div className="mb-7">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <PenSquare className="size-6 text-[#65a30d]" />
            글쓰기
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {club.name}에 새 글을 남겨요.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-900/[0.06] bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
          <PostForm clubId={id} canPostNotice={canPostNotice} />
        </div>
      </div>
    </div>
  );
}
