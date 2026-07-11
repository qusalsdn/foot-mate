"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, FileText, Megaphone, Tag } from "lucide-react";

import { postSchema, POST_WRITE_CATEGORIES } from "@/lib/schemas/post";
import { POST_CATEGORY_LABELS, type PostCategory } from "@/lib/constants/community";
import { createPost, updatePost } from "./actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PostFormValues = {
  category: string;
  title: string;
  content: string;
};

const inputClass =
  "h-11 rounded-xl border-slate-900/10 bg-white/70 transition-colors focus-visible:border-[#84cc16] focus-visible:ring-[#84cc16]/25";

/**
 * 게시글 작성/수정 겸용 폼. postId 가 있으면 수정, 없으면 작성.
 * canPostNotice(운영진)만 공지 카테고리 선택지가 보인다 — 비운영진은 자유글로 고정(RLS도 강제).
 */
export function PostForm({
  clubId,
  postId,
  canPostNotice,
  initial,
}: {
  clubId: string;
  postId?: string;
  canPostNotice: boolean;
  initial?: Partial<PostFormValues>;
}) {
  const isEdit = !!postId;
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema) as unknown as Resolver<PostFormValues>,
    defaultValues: {
      // 운영진은 공지를 기본값으로(작성 폼에 카테고리 셀렉트 노출).
      // 비운영진은 공지 작성이 RLS로 막히므로 자유글로 고정한다.
      // 수정 시엔 아래 ...initial 이 기존 카테고리로 덮어쓴다.
      category: canPostNotice ? "notice" : "free",
      title: "",
      content: "",
      ...initial,
    },
  });

  async function onSubmit(values: PostFormValues) {
    setServerError(null);
    const result = isEdit
      ? await updatePost(clubId, postId!, values)
      : await createPost(clubId, values);
    if (result?.error) setServerError(result.error);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        {canPostNotice && (
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5 text-slate-700">
                  <Tag className="size-4 text-[#65a30d]" />
                  카테고리
                </FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger onBlur={field.onBlur}>
                      <SelectValue placeholder="카테고리 선택">
                        {(v: string) =>
                          POST_CATEGORY_LABELS[v as PostCategory] ?? v
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {POST_WRITE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {POST_CATEGORY_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* 비운영진은 공지 선택지가 없으므로 자유글 안내 칩만 노출 */}
        {!canPostNotice && (
          <div className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-slate-900/[0.06] bg-white/60 px-3 py-2 text-sm font-semibold text-slate-500">
            <Megaphone className="size-4 text-slate-400" />
            자유글
            <span className="text-xs font-normal text-slate-400">
              공지는 운영진만 작성해요
            </span>
          </div>
        )}

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
                  placeholder="제목을 입력하세요"
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
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-slate-700">
                <FileText className="size-4 text-[#65a30d]" />
                내용
                <span className="text-xs font-normal text-slate-400">선택</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="내용을 입력하세요"
                  className="min-h-40 rounded-xl border-slate-900/10 bg-white/70 px-3.5 py-3 transition-colors focus-visible:border-[#84cc16] focus-visible:ring-[#84cc16]/25"
                  {...field}
                />
              </FormControl>
              <FormMessage />
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
          className="mt-1 h-12 w-full rounded-2xl bg-gradient-to-br from-[#bef264] to-[#84cc16] text-base font-semibold text-[#1a2e05] shadow-lg shadow-[#a3e635]/40 ring-1 ring-inset ring-white/50 transition-all hover:from-[#d9f99d] hover:to-[#a3e635] hover:not-disabled:-translate-y-0.5"
        >
          {form.formState.isSubmitting
            ? "저장 중…"
            : isEdit
              ? "수정 완료"
              : "글 등록"}
        </Button>
      </form>
    </Form>
  );
}
