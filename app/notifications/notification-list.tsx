"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { formatRelative } from "@/lib/date";
import { notificationMeta } from "@/lib/constants/notifications";
import { NotificationItem } from "./notification-item";
import { loadMoreNotifications } from "./actions";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

/**
 * 서버 첫 페이지(initial, 최신 window)를 클라 목록에 병합한다.
 * - initial 에만 있는 신규 알림 → 맨 위(최신)에 붙인다.
 * - 이미 목록에 있는 항목 → initial 의 read_at 으로 갱신(읽음 동기화).
 * - 목록에만 있는 과거 페이지 항목 → 그대로 보존.
 * 덕분에 "더 보기"로 펼친 상태에서 새 알림이 와도 경계 항목이 사라지지 않는다.
 */
function mergeInitial(
  current: NotificationRow[],
  initial: NotificationRow[],
): NotificationRow[] {
  const inInitial = new Map(initial.map((n) => [n.id, n]));
  const existingIds = new Set(current.map((n) => n.id));
  const updated = current.map((n) => inInitial.get(n.id) ?? n);
  const fresh = initial.filter((n) => !existingIds.has(n.id));
  return [...fresh, ...updated];
}

/**
 * 알림 목록 + "더 보기"(커서 페이지네이션).
 * 목록 상태는 클라가 소유하고, realtime router.refresh() 로 갱신된 서버 첫 페이지를
 * 렌더 중에 병합한다(effect 없이 처리 → set-state-in-effect 회피).
 */
export function NotificationList({
  initial,
  initialHasMore,
}: {
  initial: NotificationRow[];
  initialHasMore: boolean;
}) {
  const [items, setItems] = useState<NotificationRow[]>(initial);
  // "더 보기"를 한 번이라도 부른 뒤의 hasMore. null 이면 서버 initialHasMore 를 따른다.
  const [extraHasMore, setExtraHasMore] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();

  // initial 이 바뀌면(새 알림·읽음 처리) 렌더 중에 병합. content 기반 key 로 불필요한 병합 방지.
  const initialKey = initial.map((n) => `${n.id}:${n.read_at ?? ""}`).join("|");
  const [seenKey, setSeenKey] = useState(initialKey);
  if (initialKey !== seenKey) {
    setSeenKey(initialKey);
    setItems((cur) => mergeInitial(cur, initial));
  }

  const hasMore = extraHasMore ?? initialHasMore;

  function handleRead(id: string) {
    setItems((cur) =>
      cur.map((n) =>
        n.id === id && !n.read_at
          ? { ...n, read_at: new Date().toISOString() }
          : n,
      ),
    );
  }

  function handleLoadMore() {
    const last = items[items.length - 1];
    if (!last) return;
    startTransition(async () => {
      const res = await loadMoreNotifications({
        createdAt: last.created_at,
        id: last.id,
      });
      setItems((cur) => {
        const seen = new Set(cur.map((n) => n.id));
        return [...cur, ...res.items.filter((n) => !seen.has(n.id))];
      });
      setExtraHasMore(res.hasMore);
    });
  }

  return (
    <>
      <ul className="grid gap-2">
        {items.map((n) => {
          const meta = notificationMeta(n.type);
          const Icon = meta.icon;
          const unread = !n.read_at;
          return (
            <li key={n.id}>
              <NotificationItem
                id={n.id}
                link={n.link}
                unread={unread}
                onRead={handleRead}
              >
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

      {hasMore && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={pending}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-900/10 bg-white/70 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-white disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin text-[#65a30d]" />}
            더 보기
          </button>
        </div>
      )}
    </>
  );
}
