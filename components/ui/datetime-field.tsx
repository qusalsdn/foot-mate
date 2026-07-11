"use client";

import * as React from "react";
import { Popover } from "@base-ui/react/popover";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ko } from "date-fns/locale";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * 날짜+시간 선택 필드. 네이티브 <input type="datetime-local"> 대체용.
 *
 * 값 계약은 네이티브와 동일: "yyyy-MM-ddTHH:mm" KST 벽시계 문자열(빈 값=미선택).
 * 스키마(matchSchema)·서버 액션(kstInputToUtcIso)이 이 문자열을 그대로 소비하므로
 * 폼/검증/타임존 로직을 하나도 바꾸지 않는다. Date 필드는 항상 로컬 프레임에서
 * 만들고 읽어 벽시계 숫자가 tz와 무관 → SSR/CSR 하이드레이션도 안전하다.
 */

const MINUTE_STEP = 5;
const DEFAULT_HOUR = 19; // 미선택 상태에서 날짜부터 고르면 붙는 기본 시각(저녁 경기 가정)
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const pad2 = (n: number) => String(n).padStart(2, "0");

type Parsed = { date: Date; hour: number; minute: number };

/** "yyyy-MM-ddTHH:mm" → 로컬 프레임 Date + 시/분. 형식이 어긋나면 null. */
function parseValue(value: string): Parsed | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  return { date: new Date(y, mo - 1, d), hour: h, minute: mi };
}

/** 로컬 Date + 시/분 → "yyyy-MM-ddTHH:mm" 벽시계 문자열. */
function compose(date: Date, hour: number, minute: number): string {
  return `${format(date, "yyyy-MM-dd")}T${pad2(hour)}:${pad2(minute)}`;
}

function minuteOptions(current: number | null): number[] {
  const set = new Set<number>();
  for (let m = 0; m < 60; m += MINUTE_STEP) set.add(m);
  if (current != null) set.add(current); // 기존 값이 5분 배수가 아니어도 보존
  return [...set].sort((a, b) => a - b);
}

export type DateTimeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function DateTimeField({
  value,
  onChange,
  onBlur,
  placeholder = "날짜·시간 선택",
  disabled,
  className,
  id,
  name,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
}: DateTimeFieldProps) {
  const parsed = parseValue(value);
  const [open, setOpen] = React.useState(false);
  // 열려 있는 달(뷰). 값이 있으면 그 달, 없으면 이번 달에서 시작.
  const [viewMonth, setViewMonth] = React.useState<Date>(
    () => parsed?.date ?? new Date(),
  );

  // 팝오버 열 때 현재 값의 달로 뷰를 맞춘다.
  function handleOpenChange(next: boolean) {
    if (next) setViewMonth(parseValue(value)?.date ?? new Date());
    else onBlur?.();
    setOpen(next);
  }

  function pickDay(day: Date) {
    const hour = parsed?.hour ?? DEFAULT_HOUR;
    const minute = parsed?.minute ?? 0;
    onChange(compose(day, hour, minute));
  }

  function setHour(hour: number) {
    const base = parsed?.date ?? new Date();
    onChange(compose(base, hour, parsed?.minute ?? 0));
  }

  function setMinute(minute: number) {
    const base = parsed?.date ?? new Date();
    onChange(compose(base, parsed?.hour ?? DEFAULT_HOUR, minute));
  }

  function clear(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
  }

  const gridStart = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const display = parsed
    ? format(
        new Date(
          parsed.date.getFullYear(),
          parsed.date.getMonth(),
          parsed.date.getDate(),
          parsed.hour,
          parsed.minute,
        ),
        "yyyy. M. d (EEE) a h:mm",
        { locale: ko },
      )
    : null;

  const minutes = minuteOptions(parsed?.minute ?? null);

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <div className={cn("relative", className)}>
        <Popover.Trigger
          id={id}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
          className={cn(
            "flex h-11 w-full cursor-pointer select-none items-center gap-2 rounded-xl border border-slate-900/10 bg-white/70 pl-3.5 pr-10 text-left text-sm outline-none transition-colors",
            "focus-visible:border-[#84cc16] focus-visible:ring-2 focus-visible:ring-[#84cc16]/25",
            "data-[popup-open]:border-[#84cc16] data-[popup-open]:ring-2 data-[popup-open]:ring-[#84cc16]/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "aria-invalid:border-red-400 aria-invalid:ring-2 aria-invalid:ring-red-400/20",
          )}
        >
          <CalendarClock className="size-4 shrink-0 text-[#65a30d]" />
          <span
            className={cn("truncate", display ? "text-slate-900" : "text-slate-400")}
          >
            {display ?? placeholder}
          </span>
        </Popover.Trigger>

        {/* 지우기 버튼: 트리거와 형제(중첩 아님)로 두고 이벤트 전파를 막아 팝오버가 안 열리게 */}
        {parsed && !disabled && (
          <button
            type="button"
            onClick={clear}
            aria-label="선택 지우기"
            className="absolute right-2.5 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-600"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* RHF 등록용: 값 자체는 위 onChange 로 흐르고, 폼 직렬화 대비 히든 인풋 유지 */}
      {name && <input type="hidden" name={name} value={value} />}

      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start" className="z-50 outline-none">
          <Popover.Popup
            className={cn(
              "w-[var(--anchor-width)] min-w-[17rem] rounded-2xl border border-slate-900/[0.06] bg-white p-3 text-slate-900 shadow-xl shadow-slate-900/10 outline-none",
              // scale(줌)만 애니메이션 — 끝까지 불투명 유지 → 뒤 blur 오브 재합성 없음(버벅임 회피).
              "origin-[var(--transform-origin)] transition-transform duration-150 ease-out data-[ending-style]:scale-95 data-[starting-style]:scale-95",
            )}
          >
            {/* 월 네비게이션 */}
            <div className="mb-2 flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, -1))}
                aria-label="이전 달"
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-[#84cc16]/12 hover:text-[#4d7c0f]"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-sm font-semibold text-slate-800">
                {format(viewMonth, "yyyy년 M월", { locale: ko })}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                aria-label="다음 달"
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-[#84cc16]/12 hover:text-[#4d7c0f]"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((w, i) => (
                <div
                  key={w}
                  className={cn(
                    "flex h-8 items-center justify-center text-xs font-medium",
                    i === 0 ? "text-red-400" : i === 6 ? "text-sky-400" : "text-slate-400",
                  )}
                >
                  {w}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((day) => {
                const selected = parsed && isSameDay(day, parsed.date);
                const outside = !isSameMonth(day, viewMonth);
                const today = isToday(day);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => pickDay(day)}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-lg text-sm transition-colors",
                      "cursor-pointer hover:bg-[#84cc16]/12",
                      outside ? "text-slate-300" : "text-slate-700",
                      today && !selected && "font-semibold text-[#4d7c0f]",
                      selected &&
                        "bg-[#84cc16] font-semibold text-[#1a2e05] hover:bg-[#84cc16]",
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            {/* 시각 선택 */}
            <div className="mt-3 flex items-center gap-2 border-t border-slate-900/[0.06] pt-3">
              <Clock className="size-4 shrink-0 text-[#65a30d]" />
              <Select
                value={parsed ? String(parsed.hour) : null}
                onValueChange={(v) => setHour(Number(v))}
              >
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue
                    placeholder={<span className="text-slate-400">시</span>}
                  >
                    {(v: string) => `${Number(v)}시`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, h) => (
                    <SelectItem key={h} value={String(h)}>
                      {h}시
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={parsed ? String(parsed.minute) : null}
                onValueChange={(v) => setMinute(Number(v))}
              >
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue
                    placeholder={<span className="text-slate-400">분</span>}
                  >
                    {(v: string) => `${pad2(Number(v))}분`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {pad2(m)}분
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
