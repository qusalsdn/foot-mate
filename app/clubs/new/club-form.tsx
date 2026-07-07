"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, MapPin, Shield, Text } from "lucide-react";

import { clubSchema, type ClubInput } from "@/lib/schemas/club";
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
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-slate-700">
                <MapPin className="size-4 text-[#65a30d]" />
                활동 지역
                <span className="text-xs font-normal text-slate-400">선택</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="예: 서울 강남구" className={inputClass} {...field} />
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
          className="group relative mt-1 h-12 w-full gap-2 overflow-hidden rounded-2xl bg-[#84cc16] text-base font-semibold text-[#1a2e05] shadow-lg shadow-[#84cc16]/30 transition-all hover:bg-[#77b514] hover:not-disabled:-translate-y-0.5"
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
