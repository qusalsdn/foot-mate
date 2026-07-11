"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Send } from "lucide-react";

import { commentSchema } from "@/lib/schemas/post";
import { createComment } from "../actions";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type CommentFormValues = { content: string };

/** 댓글 작성 폼. 성공 시 입력을 비운다(목록은 서버 revalidate로 갱신). */
export function CommentForm({
  clubId,
  postId,
}: {
  clubId: string;
  postId: string;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema) as unknown as Resolver<CommentFormValues>,
    defaultValues: { content: "" },
  });

  async function onSubmit(values: CommentFormValues) {
    setServerError(null);
    const result = await createComment(clubId, postId, values);
    if (result?.error) {
      setServerError(result.error);
      return;
    }
    form.reset({ content: "" });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-2.5">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="댓글을 남겨보세요"
                  className="min-h-20 rounded-xl border-slate-900/10 bg-white/70 px-3.5 py-3 transition-colors focus-visible:border-[#84cc16] focus-visible:ring-[#84cc16]/25"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {serverError && (
          <p className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="size-4 shrink-0" />
            {serverError}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="h-10 rounded-xl bg-[#84cc16] px-5 text-sm font-semibold text-[#1a2e05] shadow-md shadow-[#84cc16]/30 transition-all hover:bg-[#77b514] hover:not-disabled:-translate-y-0.5"
          >
            <Send className="size-4" />
            {form.formState.isSubmitting ? "등록 중…" : "댓글 등록"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
