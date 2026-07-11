import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MessageCircle, MessagesSquare, PenSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/date";
import {
  postCategoryLabel,
  postCategoryMeta,
  POST_CATEGORY_FILTERS,
} from "@/lib/constants/community";
import { PageBackBar } from "@/components/page-back-bar";

const MANAGER_ROLES = new Set(["president", "treasurer", "manager", "coach"]);

type PostRow = {
  id: string;
  category: string;
  title: string;
  content: string | null;
  created_at: string;
  author_id: string;
  profiles: { name: string | null; avatar_url: string | null } | null;
};

function PostCard({
  p,
  clubId,
  commentCount,
}: {
  p: PostRow;
  clubId: string;
  commentCount: number;
}) {
  const meta = postCategoryMeta(p.category);
  const name = p.profiles?.name ?? "축구인";
  return (
    <li>
      <Link href={`/clubs/${clubId}/community/${p.id}`} className="group block">
        <div className="relative flex flex-col gap-2.5 overflow-hidden rounded-2xl border border-slate-900/[0.06] bg-white/80 p-4 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[#84cc16]/40 hover:shadow-lg hover:shadow-[#84cc16]/10 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.badge}`}
                >
                  <meta.icon className="size-3" />
                  {postCategoryLabel(p.category)}
                </span>
                <h3 className="truncate text-base font-semibold text-slate-900">
                  {p.title}
                </h3>
              </div>
              {p.content && (
                <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-sm text-slate-500">
                  {p.content}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span className="font-medium text-slate-500">{name}</span>
            <span>·</span>
            <span>{formatRelative(p.created_at)}</span>
            {commentCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[#65a30d]">
                <MessageCircle className="size-3.5" />
                {commentCount}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { id } = await params;
  const { category: categoryParam } = await searchParams;
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

  // 소속 회원만 커뮤니티를 볼 수 있다 (RLS도 막지만 UX상 클럽 페이지로 되돌린다)
  if (membership?.status !== "active") redirect(`/clubs/${id}`);
  // 게스트는 조회·댓글만 — 글 작성은 정회원만 (RLS `post write`=is_full_member 와 일치)
  const canWritePost = membership.role !== "guest";

  // 필터: URL 임의값 차단 — 유효 카테고리만 신뢰
  const activeFilter =
    categoryParam && (POST_CATEGORY_FILTERS as readonly string[]).includes(categoryParam)
      ? categoryParam
      : null;

  let query = supabase
    .from("posts")
    .select("id, category, title, content, created_at, author_id, profiles(name, avatar_url)")
    .eq("club_id", id)
    .order("created_at", { ascending: false });
  if (activeFilter) query = query.eq("category", activeFilter);

  const { data: postData } = await query;
  const posts = (postData ?? []) as unknown as PostRow[];

  // 게시글별 댓글 수 집계
  const ids = posts.map((p) => p.id);
  const commentCount = new Map<string, number>();
  if (ids.length > 0) {
    const { data: cmts } = await supabase
      .from("comments")
      .select("post_id")
      .in("post_id", ids);
    for (const c of (cmts ?? []) as { post_id: string }[]) {
      commentCount.set(c.post_id, (commentCount.get(c.post_id) ?? 0) + 1);
    }
  }

  const filters = [
    { key: null as string | null, label: "전체" },
    ...POST_CATEGORY_FILTERS.map((c) => ({
      key: c as string | null,
      label: postCategoryLabel(c),
    })),
  ];

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
        <PageBackBar href={`/clubs/${id}`} label={club.name} userId={user.id} />

        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <MessagesSquare className="size-6 text-[#65a30d]" />
              커뮤니티
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              공지를 확인하고 자유롭게 이야기를 나눠요.
            </p>
          </div>
          {canWritePost && (
            <Link
              href={`/clubs/${id}/community/new`}
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-br from-[#bef264] to-[#84cc16] px-3.5 py-2 text-sm font-semibold text-[#1a2e05] shadow-lg shadow-[#a3e635]/40 ring-1 ring-inset ring-white/50 transition-all hover:-translate-y-0.5 hover:from-[#d9f99d] hover:to-[#a3e635] hover:shadow-[#a3e635]/50"
            >
              <PenSquare className="size-4" />
              글쓰기
            </Link>
          )}
        </div>

        {/* 카테고리 필터 (JS 없이 링크로 동작) */}
        <div className="mb-5 flex flex-wrap gap-2">
          {filters.map((f) => {
            const isActive = activeFilter === f.key;
            const href =
              f.key === null
                ? `/clubs/${id}/community`
                : `/clubs/${id}/community?category=${f.key}`;
            return (
              <Link
                key={f.label}
                href={href}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-[#84cc16]/30 bg-[#84cc16]/12 text-[#4d7c0f]"
                    : "border-slate-900/10 bg-white/70 text-slate-500 hover:bg-slate-900/[0.03]"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        {posts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-900/15 bg-white/60 px-6 py-14 text-center backdrop-blur-sm">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#84cc16]/12 text-[#4d7c0f]">
              <MessagesSquare className="size-7" />
            </span>
            <p className="mt-4 text-sm font-medium text-slate-600">
              아직 글이 없어요
            </p>
            <p className="mt-1 text-sm text-slate-400">
              첫 글을 남겨 이야기를 시작해보세요.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {posts.map((p) => (
              <PostCard
                key={p.id}
                p={p}
                clubId={id}
                commentCount={commentCount.get(p.id) ?? 0}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
