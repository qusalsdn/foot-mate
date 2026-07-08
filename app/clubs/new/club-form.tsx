"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  MapPin,
  Shield,
  Text,
} from "lucide-react";

import { clubSchema, type ClubInput } from "@/lib/schemas/club";
import {
  SIDO_LIST,
  districtsOf,
  formatRegion,
} from "@/lib/constants/regions";
import { createClub } from "./actions";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const inputClass =
  "h-11 rounded-xl border-slate-900/10 bg-white/70 transition-colors focus-visible:border-[#84cc16] focus-visible:ring-[#84cc16]/25";

export function ClubForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<ClubInput>({
    resolver: zodResolver(clubSchema),
    defaultValues: { name: "", region: "", description: "" },
  });

  const description = form.watch("description") ?? "";

  // 지역: 시/도·구 종속 셀렉트. 두 값을 합쳐 폼의 region 필드에 반영한다.
  const [sido, setSido] = useState("");
  const [gu, setGu] = useState("");
  const districts = sido ? districtsOf(sido) : [];

  function handleSido(next: string) {
    setSido(next);
    setGu(""); // 시/도 바뀌면 구 초기화
    form.setValue("region", next ? formatRegion(next) : "");
  }
  function handleGu(next: string) {
    setGu(next);
    form.setValue("region", sido ? formatRegion(sido, next || null) : "");
  }

  async function onSubmit(values: ClubInput) {
    setServerError(null);
    const result = await createClub(values);
    // 성공 시 서버 액션이 리다이렉트하므로 여기 도달하면 에러 케이스
    if (result?.error) setServerError(result.error);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-slate-700">
                <Shield className="size-4 text-[#65a30d]" />
                클럽 이름
              </FormLabel>
              <FormControl>
                <Input placeholder="예: FC 강남" className={inputClass} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="region"
          render={() => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-slate-700">
                <MapPin className="size-4 text-[#65a30d]" />
                활동 지역
                <span className="text-xs font-normal text-slate-400">선택</span>
              </FormLabel>
              <FormControl>
                <div className="grid grid-cols-2 gap-2">
                  {/* 시/도 */}
                  <div className="relative">
                    <select
                      aria-label="시/도"
                      value={sido}
                      onChange={(e) => handleSido(e.target.value)}
                      className={`${inputClass} w-full appearance-none pl-3.5 pr-9 text-sm ${
                        sido ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      <option value="">시/도</option>
                      {SIDO_LIST.map((s) => (
                        <option key={s} value={s} className="text-slate-900">
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  </div>
                  {/* 구/군 (시/도 선택 후 활성) */}
                  <div className="relative">
                    <select
                      aria-label="구/군"
                      value={gu}
                      onChange={(e) => handleGu(e.target.value)}
                      disabled={districts.length === 0}
                      className={`${inputClass} w-full appearance-none pl-3.5 pr-9 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                        gu ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      <option value="">
                        {sido && districts.length === 0 ? "구/군 없음" : "구/군"}
                      </option>
                      {districts.map((d) => (
                        <option key={d} value={d} className="text-slate-900">
                          {d}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-slate-700">
                <Text className="size-4 text-[#65a30d]" />
                소개
                <span className="text-xs font-normal text-slate-400">선택</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="클럽을 한 줄로 소개해주세요"
                  rows={3}
                  className="resize-none rounded-xl border-slate-900/10 bg-white/70 transition-colors focus-visible:border-[#84cc16] focus-visible:ring-[#84cc16]/25"
                  {...field}
                />
              </FormControl>
              <div className="flex items-center justify-between">
                <FormMessage />
                <span className="ml-auto text-xs tabular-nums text-slate-400">
                  {description.length}/200
                </span>
              </div>
            </FormItem>
          )}
        />

        {serverError && (
          <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
            <AlertCircle className="size-4 shrink-0" />
            {serverError}
          </p>
        )}

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="group relative mt-1 h-12 w-full gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-[#bef264] to-[#84cc16] text-base font-semibold text-[#1a2e05] shadow-lg shadow-[#a3e635]/40 ring-1 ring-inset ring-white/50 transition-all hover:from-[#d9f99d] hover:to-[#a3e635] hover:not-disabled:-translate-y-0.5"
        >
          {form.formState.isSubmitting ? (
            "만드는 중…"
          ) : (
            <>
              클럽 만들기
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
