"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CalendarRange, Check, Wallet } from "lucide-react";

import { chargeMonthlySchema } from "@/lib/schemas/finance";
import { formatPeriod, formatWon } from "@/lib/constants/finance";
import { chargeMonthlyDues } from "./actions";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// 폼 값은 문자열(입력 그대로). 숫자 강제·검증은 zod(chargeMonthlySchema)가 담당.
type ChargeFormValues = { period: string; amount: string };

const inputClass =
  "h-11 rounded-xl border-slate-900/10 bg-white/70 transition-colors focus-visible:border-[#84cc16] focus-visible:ring-[#84cc16]/25";

/** 월회비 일괄 부과 폼 (회장·총무 전용). 활성 정회원 전원에게 미납 항목을 생성한다. */
export function ChargeForm({ clubId, defaultPeriod }: { clubId: string; defaultPeriod: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<{ created: number; skipped: number } | null>(null);
  const form = useForm<ChargeFormValues>({
    resolver: zodResolver(chargeMonthlySchema) as unknown as Resolver<ChargeFormValues>,
    defaultValues: { period: defaultPeriod, amount: "" },
  });

  async function onSubmit(values: ChargeFormValues) {
    setServerError(null);
    setDone(null);
    const result = await chargeMonthlyDues(clubId, values);
    if ("error" in result) {
      setServerError(result.error);
      return;
    }
    setDone({ created: result.created, skipped: result.skipped });
    form.resetField("amount");
  }

  const amount = Number(form.watch("amount")) || 0;
  const period = form.watch("period");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="period"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5 text-slate-700">
                  <CalendarRange className="size-4 text-[#65a30d]" />
                  기간
                </FormLabel>
                <FormControl>
                  <Input type="month" className={`${inputClass} [color-scheme:light]`} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5 text-slate-700">
                  <Wallet className="size-4 text-[#65a30d]" />
                  1인당 회비
                </FormLabel>
                <FormControl>
                  <Input type="number" inputMode="numeric" min={1} placeholder="예: 30000" className={inputClass} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <p className="px-1 text-xs text-slate-400">
          {formatPeriod(period) ?? "기간"} 월회비로 <b className="font-semibold text-slate-500">활성 회원 전원(게스트 제외)</b>
          에게 <b className="font-semibold text-[#4d7c0f]">{amount > 0 ? formatWon(amount) : "—"}</b> 미납 항목을 만듭니다. 이미
          부과된 회원은 건너뜁니다.
        </p>

        {serverError && (
          <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
            <AlertCircle className="size-4 shrink-0" />
            {serverError}
          </p>
        )}
        {done && (
          <p className="flex items-center gap-2 rounded-xl border border-[#84cc16]/30 bg-[#84cc16]/[0.08] px-3.5 py-2.5 text-sm text-[#4d7c0f]">
            <Check className="size-4 shrink-0" />
            {done.created > 0 ? `${done.created}명에게 부과했어요.` : "새로 부과할 회원이 없어요."}
            {done.skipped > 0 && ` (${done.skipped}명 중복 제외)`}
          </p>
        )}

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="h-12 w-full rounded-2xl bg-gradient-to-br from-[#bef264] to-[#84cc16] text-base font-semibold text-[#1a2e05] shadow-lg shadow-[#a3e635]/40 ring-1 ring-inset ring-white/50 transition-all hover:from-[#d9f99d] hover:to-[#a3e635] hover:not-disabled:-translate-y-0.5"
        >
          {form.formState.isSubmitting ? "부과 중…" : "월회비 부과"}
        </Button>
      </form>
    </Form>
  );
}
