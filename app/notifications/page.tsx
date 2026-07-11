import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/date";
import { notificationMeta } from "@/lib/constants/notifications";
import { NotificationsRealtime } from "@/components/notifications-realtime";
import { NotificationItem } from "./notification-item";
import { markAllNotificationsRead } from "./actions";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const notis = data ?? [];
  const unreadCount = notis.filter((n) => !n.read_at).length;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#f6f8f4] text-slate-900">
      {/* 배경 장식 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,#a3e635_0%,transparent_65%)] opacity-25 blur-3xl [animation:footmate-drift_16s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(#0f172a0d_1px,transparent_1px),linear-gradient(90deg,#0f172a0d_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_top,#000_20%,transparent_70%)]"
      />

      <NotificationsRealtime userId={user.id} />
      <div className="relative mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
        <Link
          href="/"
          className="group mb-6 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-900/5 hover:text-slate-800"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          홈
        </Link>

        <div className="mb-7 flex items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <Bell className="size-6 text-[#65a30d]" />
              알림
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {unreadCount > 0
                ? `안읽은 알림 ${unreadCount}개`
                : "새 알림이 오면 여기에 표시돼요."}
            </p>
          </div>
          {unreadCount > 0 && (
            <form action={markAllNotificationsRead}>
              <button
                type="submit"
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-slate-900/10 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-white"
              >
                <CheckCheck className="size-4 text-[#65a30d]" />
                모두 읽음
              </button>
            </form>
          )}
        </div>

        {notis.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-900/15 bg-white/60 px-6 py-14 text-center backdrop-blur-sm">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#84cc16]/12 text-[#4d7c0f]">
              <Bell className="size-7" />
            </span>
            <p className="mt-4 text-sm font-medium text-slate-600">
              아직 알림이 없어요
            </p>
            <p className="mt-1 text-sm text-slate-400">
              회비·매치 등 소식이 생기면 여기로 와요.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2">
            {notis.map((n) => {
              const meta = notificationMeta(n.type);
              const Icon = meta.icon;
              const unread = !n.read_at;
              return (
                <li key={n.id}>
                  <NotificationItem id={n.id} link={n.link} unread={unread}>
                    <div
                      className={`flex items-start gap-3 rounded-2xl border p-4 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#84cc16]/10 ${
                        unread
                          ? "border-[#84cc16]/30 bg-white/90"
                          : "border-slate-900/[0.06] bg-white/60"
                      }`}
                    >
                      <span
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${meta.accent}`}
                      >
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm ${
                            unread
                              ? "font-semibold text-slate-900"
                              : "font-medium text-slate-600"
                          }`}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="mt-0.5 truncate text-sm text-slate-400">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-slate-400">
                          {formatRelative(n.created_at)}
                        </p>
                      </div>
                      {unread && (
                        <span
                          aria-hidden
                          className="mt-1.5 size-2 shrink-0 rounded-full bg-[#84cc16]"
                        />
                      )}
                    </div>
                  </NotificationItem>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
