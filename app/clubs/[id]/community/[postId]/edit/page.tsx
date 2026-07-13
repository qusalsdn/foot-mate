import { notFound, redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "../../post-form";
import { PageBackBar } from "@/components/page-back-bar";

const MANAGER_ROLES = new Set(["president", "treasurer", "manager", "coach"]);
const CAN_MANAGE_ROLES = new Set(["president", "treasurer"]);

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string; postId: string }>;
}) {
  const { id, postId } = await params;
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
  if (membership?.status !== "active") redirect(`/clubs/${id}/community`);

  const { data: postData } = await supabase
    .from("posts")
    .select("id, category, title, content, author_id, images")
    .eq("id", postId)
    .eq("club_id", id)
    .maybeSingle();
  if (!postData) notFound();
  const post = postData;

  // 수정 권한: 작성자 본인 또는 회장·총무 (RLS `post own` 과 동일 기준)
  const canEdit =
    post.author_id === user.id || CAN_MANAGE_ROLES.has(membership.role);
  if (!canEdit) redirect(`/clubs/${id}/community/${postId}`);

  // 쓸 수 있는 카테고리: 공지는 운영진만, 나머지는 자유. 사진은 어느 글에나 첨부.
  const availableCategories = MANAGER_ROLES.has(membership.role)
    ? (["notice", "free"] as const)
    : (["free"] as const);

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
          href={`/clubs/${id}/community/${postId}`}
          label="글로 돌아가기"
          userId={user.id}
        />

        <div className="mb-7">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <Pencil className="size-6 text-[#65a30d]" />
            글 수정
          </h1>
        </div>

        <div className="rounded-3xl border border-slate-900/[0.06] bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
          <PostForm
            clubId={id}
            postId={postId}
            userId={user.id}
            availableCategories={[...availableCategories]}
            initial={{
              category: post.category,
              title: post.title,
              content: post.content ?? "",
              images: post.images ?? [],
            }}
          />
        </div>
      </div>
    </div>
  );
}
