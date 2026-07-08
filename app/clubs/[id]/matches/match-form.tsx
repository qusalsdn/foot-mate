"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CalendarClock,
  ChevronDown,
  Hourglass,
  MapPin,
  Swords,
  Tag,
  Users,
  Wallet,
} from "lucide-react";

import { matchSchema } from "@/lib/schemas/match";
import { MATCH_TYPE_LABELS, MATCH_TYPES } from "@/lib/constants/matches";
import { createMatch, updateMatch } from "./actions";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// 폼 값은 전부 문자열(입력 그대로). 숫자 강제·검증은 zod(matchSchema)가 담당.
export type MatchFormValues = {
  title: string;
  matchDate: string;
  voteDeadline: string;
  type: string;
  opponent: string;
  locationName: string;
  capacity: string;
  fee: string;
};

const EMPTY: MatchFormValues = {
  title: "",
  matchDate: "",
  voteDeadline: "",
  type: "internal",
  opponent: "",
  locationName: "",
  capacity: "",
  fee: "",
};

const inputClass =
  "h-11 rounded-xl border-slate-900/10 bg-white/70 transition-colors focus-visible:border-[#84cc16] focus-visible:ring-[#84cc16]/25";

/** 매치 생성/수정 겸용 폼. matchId 가 있으면 수정, 없으면 생성. */
export function MatchForm({
  clubId,
  matchId,
  initial,
}: {
  clubId: string;
  matchId?: string;
  initial?: Partial<MatchFormValues>;
}) {
  const isEdit = !!matchId;
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<MatchFormValues>({
    // 폼은 문자열 값, 스키마 출력은 숫자 → 타입만 어긋나므로 캐스팅 (런타임 검증은 동일)
    resolver: zodResolver(matchSchema) as unknown as Resolver<MatchFormValues>,
    defaultValues: { ...EMPTY, ...initial },
  });

  async function onSubmit(values: MatchFormValues) {
    setServerError(null);
    // 서버 액션이 matchSchema로 재검증(문자열→숫자 coerce)한다
    const result = isEdit
      ? await updateMatch(clubId, matchId!, values)
      : await createMatch(clubId, values);
    if (result?.error) setServerError(result.error);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-slate-700">
                <Tag className="size-4 text-[#65a30d]" />
                제목
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="예: 수요일 저녁 자체전"
                  className={inputClass}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="matchDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-slate-700">
                <CalendarClock className="size-4 text-[#65a30d]" />
                일시
              </FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  className={`${inputClass} [color-scheme:light]`}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="voteDeadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-slate-700">
                <Hourglass className="size-4 text-[#65a30d]" />
                투표 마감
                <span className="text-xs font-normal text-slate-400">
                  선택 · 비우면 수동 마감
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  className={`${inputClass} [color-scheme:light]`}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-slate-700">
                <Swords className="size-4 text-[#65a30d]" />
                유형
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <select
                    {...field}
                    className={`${inputClass} w-full appearance-none pl-3.5 pr-9 text-sm text-slate-900`}
                  >
                    {MATCH_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {MATCH_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="opponent"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-slate-700">
                <Swords className="size-4 text-[#65a30d]" />
                상대팀
                <span className="text-xs font-normal text-slate-400">
                  선택 · 자체전이면 비움
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="예: FC 서초"
                  className={inputClass}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="locationName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-slate-700">
                <MapPin className="size-4 text-[#65a30d]" />
                장소
                <span className="text-xs font-normal text-slate-400">선택</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="예: 잠실종합운동장 보조구장"
                  className={inputClass}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5 text-slate-700">
                  <Users className="size-4 text-[#65a30d]" />
                  정원
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    placeholder="무제한"
                    className={inputClass}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fee"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5 text-slate-700">
                  <Wallet className="size-4 text-[#65a30d]" />
                  참가비
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1000}
                    placeholder="0"
                    className={inputClass}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {serverError && (
          <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
            <AlertCircle className="size-4 shrink-0" />
            {serverError}
          </p>
        )}

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="mt-1 h-12 w-full rounded-2xl bg-[#84cc16] text-base font-semibold text-[#1a2e05] shadow-lg shadow-[#84cc16]/30 transition-all hover:bg-[#77b514] hover:not-disabled:-translate-y-0.5"
        >
          {form.formState.isSubmitting
            ? "저장 중…"
            : isEdit
              ? "수정 완료"
              : "매치 등록"}
        </Button>
      </form>
    </Form>
  );
}
