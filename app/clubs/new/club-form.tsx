"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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

export function ClubForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<ClubInput>({
    resolver: zodResolver(clubSchema),
    defaultValues: { name: "", region: "", description: "" },
  });

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
              <FormLabel>클럽 이름</FormLabel>
              <FormControl>
                <Input placeholder="예: FC 강남" {...field} />
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
              <FormLabel>활동 지역</FormLabel>
              <FormControl>
                <Input placeholder="예: 서울 강남구" {...field} />
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
              <FormLabel>소개</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="클럽을 한 줄로 소개해주세요"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {serverError && <p className="text-destructive text-sm">{serverError}</p>}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "만드는 중…" : "클럽 만들기"}
        </Button>
      </form>
    </Form>
  );
}
