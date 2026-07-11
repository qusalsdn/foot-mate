import { notFound, redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatKst, formatRelative } from "@/lib/date";
import { postCategoryLabel, postCategoryMeta } from "@/lib/constants/community";
import { PageBackBar } from "@/components/page-back-bar";
import { CommentForm } from "./comment-form";
import { PostMenu, CommentDeleteButton } from "./post-menu";

const CAN_MANAGE_ROLES = new Set(["president", "treasurer"]);

type PostRow = {
  id: string;
  category: string;
  title: string;
  content: string | null;
  created_at: string;
  author_id: string;
  profiles: { name: string | null; avatar_url: string | null } | null;
};

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles: { name: string | null; avatar_url: string | null } | null;
};

function Avatar({
  name,
  url,
  size = "size-9",
}: {
  name: string;
  url: string | null;
  size?: string;
}) {
  if (url) {
    return (
      // 카카오 CDN 호스트가 유동적이라 next/image 대신 일반 img 사용
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        referrerPolicy="no-referrer"
        className={`${size} shrink-0 rounded-full object-cover ring-1 ring-slate-900/10`}
      />
    );
  }
  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[#84cc16]/15 text-sm font-bold text-[#4d7c0f]`}
    >
      {name.charAt(0)}
    </span>
  );
}

export default async function PostDetailPage({
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
  if (membership?.status !== "active") redirect(`/clubs/${id}`);
  const canManage = CAN_MANAGE_ROLES.has(membership.role);

  const { data: postData } = await supabase
    .from("posts")
    .select("id, category, title, content, created_at, author_id, profiles(name, avatar_url)")
    .eq("id", postId)
    .eq("club_id", id)
    .maybeSingle();
  if (!postData) notFound();
  const post = postData as unknown as PostRow;

  const { data: commentData } = await supabase
    .from("comments")
    .select("id, content, created_at, author_id, profiles(name, avatar_url)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  const comments = (commentData ?? []) as unknown as CommentRow[];

  const meta = postCategoryMeta(post.category);
  const authorName = post.profiles?.name ?? "축구인";
  const canEditPost = post.author_id === user.id || canManage;

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

      <div className="relative mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
        <PageBackBar
          href={`/clubs/${id}/community`}
          label="커뮤니티"
          userId={user.id}
        />

        {/* 글 카드 */}
        <article className="overflow-hidden rounded-3xl border border-slate-900/[0.06] bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badge}`}
            >
              <meta.icon className="size-3" />
              {postCategoryLabel(post.category)}
            </span>
            {canEditPost && <PostMenu clubId={id} postId={post.id} />}
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            {post.title}
          </h1>

          <div className="mt-3 flex items-center gap-2.5">
            <Avatar name={authorName} url={post.profiles?.avatar_url ?? null} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-700">
                {authorName}
              </p>
              <p className="text-xs text-slate-400">
                {formatKst(post.created_at)}
              </p>
            </div>
          </div>

          {post.content && (
            <p className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">
              {post.content}
            </p>
          )}
        </article>

        {/* 댓글 */}
        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 px-1 text-sm font-bold text-slate-700">
            <MessageCircle className="size-4 text-[#65a30d]" />
            댓글
            <span className="rounded-full bg-slate-900/[0.06] px-2 py-0.5 text-xs font-semibold text-slate-500">
              {comments.length}
            </span>
          </h2>

          {comments.length > 0 && (
            <ul className="mb-4 grid gap-2.5">
              {comments.map((c) => {
                const name = c.profiles?.name ?? "축구인";
                const canDelete = c.author_id === user.id || canManage;
                return (
                  <li
                    key={c.id}
                    className="flex items-start gap-3 rounded-2xl border border-slate-900/[0.06] bg-white/70 px-4 py-3 shadow-sm backdrop-blur-xl"
                  >
                    <Avatar
                      name={name}
                      url={c.profiles?.avatar_url ?? null}
                      size="size-8"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-700">
                          {name}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">
                          {formatRelative(c.created_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-600">
                        {c.content}
                      </p>
                    </div>
                    {canDelete && (
                      <CommentDeleteButton
                        clubId={id}
                        postId={post.id}
                        commentId={c.id}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="rounded-2xl border border-slate-900/[0.06] bg-white/80 p-4 shadow-sm backdrop-blur-xl">
            <CommentForm clubId={id} postId={post.id} />
          </div>
        </section>
      </div>
    </div>
  );
}
