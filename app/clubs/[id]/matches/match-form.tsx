"use client";

import { useState } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CalendarClock,
  Hourglass,
  MapPin,
  Plus,
  Swords,
  Tag,
  Users,
  Users2,
  Wallet,
  X,
} from "lucide-react";

import { matchSchema } from "@/lib/schemas/match";
import { MATCH_TYPE_LABELS, MATCH_TYPES } from "@/lib/constants/matches";
import { createMatch, updateMatch } from "./actions";
import { LocationPicker } from "./location-picker";
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
import { DateTimeField } from "@/components/ui/datetime-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// 폼 값은 전부 문자열(입력 그대로). 숫자 강제·검증은 zod(matchSchema)가 담당.
export type MatchFormValues = {
  title: string;
  matchDate: string;
  voteDeadline: string;
  type: string;
  opponent: string;
  locationName: string;
  // 카카오맵 장소 검색으로 채우는 좌표(문자열, "" = 미설정)
  locationLat: string;
  locationLng: string;
  capacity: string;
  fee: string;
  // 팀 정의(이름). 자체전 기본 2팀, 친선전은 선택, 리그는 없음.
  teams: { name: string }[];
};

const EMPTY: MatchFormValues = {
  title: "",
  matchDate: "",
  voteDeadline: "",
  type: "internal",
  opponent: "",
  locationName: "",
  locationLat: "",
  locationLng: "",
  capacity: "",
  fee: "",
  // 기본 유형이 자체전이라 2팀으로 시작
  teams: [{ name: "1팀" }, { name: "2팀" }],
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
  const teamsArray = useFieldArray({ control: form.control, name: "teams" });
  const type = form.watch("type");
  const teamsError = form.formState.errors.teams as
    | { message?: string; root?: { message?: string } }
    | undefined;
  // 자체전=내부 팀(2~4), 친선전=상대팀(1~3, 우리팀 자동)
  const isInternalType = type === "internal";
  const teamWord = isInternalType ? "팀" : "상대팀";
  const maxTeams = isInternalType ? 4 : 3;
  const minTeams = isInternalType ? 2 : 1;

  // 유형 변경 시 입력 정리:
  // - 자체전: 상대팀 비움 + 내부 팀 2개 기본
  // - 친선전: 상대팀 비움(리스트로 받음) + 상대팀 1칸 기본(우리팀은 자동)
  // - 리그: 팀 목록 비움(상대팀은 텍스트)
  function handleTypeChange(next: string) {
    if (next === "internal") {
      form.setValue("opponent", "");
      teamsArray.replace([{ name: "1팀" }, { name: "2팀" }]);
    } else if (next === "friendly") {
      form.setValue("opponent", "");
      teamsArray.replace([{ name: "" }]);
    } else {
      // league
      teamsArray.replace([]);
    }
  }

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
                <DateTimeField
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  placeholder="경기 일시 선택"
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
                <DateTimeField
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  placeholder="마감 일시 선택"
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
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    handleTypeChange(v as string);
                  }}
                >
                  <SelectTrigger onBlur={field.onBlur}>
                    <SelectValue placeholder="유형 선택">
                      {(v: string) => MATCH_TYPE_LABELS[v as keyof typeof MATCH_TYPE_LABELS]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {MATCH_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {MATCH_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 상대팀(단일 텍스트): 리그에서만. 친선전은 아래 상대팀 리스트로 받음 */}
        {type === "league" && (
          <FormField
            control={form.control}
            name="opponent"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5 text-slate-700">
                  <Swords className="size-4 text-[#65a30d]" />
                  상대팀
                  <span className="text-xs font-normal text-slate-400">
                    선택
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
        )}

        {/* 자체전=내부 팀 목록 / 친선전=상대팀 목록(우리팀 자동). 리그는 위 단일 상대팀 */}
        {type !== "league" && (
          <div className="grid gap-2.5">
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Users2 className="size-4 text-[#65a30d]" />
              {teamWord}
              <span className="text-xs font-normal text-slate-400">
                {isInternalType
                  ? "우리 인원을 2~4팀으로 나눠요"
                  : "우리팀은 자동 포함 · 상대팀 1~3개"}
              </span>
            </div>

            {/* 친선전: 우리팀 자동 포함 안내 칩 */}
            {!isInternalType && (
              <div className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-slate-900/[0.06] bg-white/60 px-3 py-2 text-sm font-semibold text-slate-500">
                <span className="size-2 rounded-full bg-sky-500" />
                우리팀
                <span className="text-xs font-normal text-slate-400">
                  자동 포함
                </span>
              </div>
            )}

            {teamsArray.fields.length > 0 && (
              <div className="grid gap-2">
                {teamsArray.fields.map((f, i) => {
                  const nameErr = (
                    form.formState.errors.teams as unknown as
                      | Array<{ name?: { message?: string } }>
                      | undefined
                  )?.[i]?.name?.message;
                  return (
                    <div key={f.id} className="grid gap-1">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#84cc16]/15 text-xs font-bold text-[#4d7c0f]">
                          {i + 1}
                        </span>
                        <Input
                          placeholder={
                            isInternalType
                              ? `${i + 1}팀 이름`
                              : `상대팀 ${i + 1} 이름`
                          }
                          className={`${inputClass} flex-1`}
                          {...form.register(`teams.${i}.name` as const)}
                        />
                        <button
                          type="button"
                          onClick={() => teamsArray.remove(i)}
                          disabled={teamsArray.fields.length <= minTeams}
                          aria-label={`${teamWord} ${i + 1} 삭제`}
                          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-900/10 bg-white/70 text-slate-400 transition-colors hover:text-red-500 disabled:pointer-events-none disabled:opacity-35"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      {nameErr && (
                        <p className="pl-8 text-xs text-red-600">{nameErr}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {teamsArray.fields.length < maxTeams && (
              <button
                type="button"
                onClick={() => teamsArray.append({ name: "" })}
                className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-[#84cc16]/40 bg-[#84cc16]/[0.06] px-3.5 py-2 text-sm font-semibold text-[#4d7c0f] transition-colors hover:bg-[#84cc16]/12"
              >
                <Plus className="size-4" />
                {teamWord} 추가
              </button>
            )}

            {(teamsError?.message || teamsError?.root?.message) && (
              <p className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="size-3.5 shrink-0" />
                {teamsError.message ?? teamsError.root?.message}
              </p>
            )}
          </div>
        )}

        <FormItem>
          <FormLabel className="flex items-center gap-1.5 text-slate-700">
            <MapPin className="size-4 text-[#65a30d]" />
            장소
            <span className="text-xs font-normal text-slate-400">
              선택 · 검색하면 지도에 표시돼요
            </span>
          </FormLabel>
          <LocationPicker
            value={{
              name: form.watch("locationName"),
              lat: form.watch("locationLat"),
              lng: form.watch("locationLng"),
            }}
            onChange={(v) => {
              // 세 값을 먼저 모두 세팅한 뒤 한 번에 검증한다. 각 setValue마다
              // shouldValidate를 켜면 중간 단계(lat만 채워진 반쪽 상태)의 refine 에러가
              // locationLat 슬롯에 심긴 뒤 뒤 필드 검증이 그걸 못 지워 stale 에러로 남는다.
              form.setValue("locationName", v.name);
              form.setValue("locationLat", v.lat);
              form.setValue("locationLng", v.lng);
              form.trigger(["locationName", "locationLat", "locationLng"]);
            }}
          />
          {(form.formState.errors.locationName?.message ||
            form.formState.errors.locationLat?.message) && (
            <p className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="size-3.5 shrink-0" />
              {form.formState.errors.locationName?.message ??
                form.formState.errors.locationLat?.message}
            </p>
          )}
        </FormItem>

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
          className="mt-1 h-12 w-full rounded-2xl bg-gradient-to-br from-[#bef264] to-[#84cc16] text-base font-semibold text-[#1a2e05] shadow-lg shadow-[#a3e635]/40 ring-1 ring-inset ring-white/50 transition-all hover:from-[#d9f99d] hover:to-[#a3e635] hover:not-disabled:-translate-y-0.5"
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
