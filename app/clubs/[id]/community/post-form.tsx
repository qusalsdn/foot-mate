"use client";

import { useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  FileText,
  ImagePlus,
  Loader2,
  Megaphone,
  Tag,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  postSchema,
  MAX_POST_IMAGES,
  type PostWriteCategory,
} from "@/lib/schemas/post";
import {
  POST_CATEGORY_LABELS,
  POST_IMAGE_BUCKET,
  postImageUrl,
  type PostCategory,
} from "@/lib/constants/community";
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
  // 갤러리 이미지 경로. RHF 가 소유해야 postSchema refine(갤러리 ≥1)이 제대로 검증된다.
  images: string[];
};

const inputClass =
  "h-11 rounded-xl border-slate-900/10 bg-white/70 transition-colors focus-visible:border-[#84cc16] focus-visible:ring-[#84cc16]/25";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB (버킷 제한과 동일)
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * 게시글 작성/수정 겸용 폼. postId 가 있으면 수정, 없으면 작성.
 * availableCategories: 역할에 따라 쓸 수 있는 카테고리(운영진=notice 포함). 1개면 셀렉트를 숨긴다.
 * category='gallery' 를 고르면 이미지 업로더가 나타나고 최소 1장이 필수(postSchema refine 과 동일).
 */
export function PostForm({
  clubId,
  postId,
  userId,
  availableCategories,
  initial,
}: {
  clubId: string;
  postId?: string;
  userId: string;
  availableCategories: PostWriteCategory[];
  initial?: Partial<PostFormValues>;
}) {
  const isEdit = !!postId;
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [serverError, setServerError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // 셀렉트 노출 여부 + 기본 카테고리. 공지 가능하면 공지, 아니면 첫 카테고리(자유).
  const showCategorySelect = availableCategories.length > 1;
  const defaultCategory = availableCategories.includes("notice")
    ? "notice"
    : (availableCategories[0] ?? "free");

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema) as unknown as Resolver<PostFormValues>,
    defaultValues: {
      category: defaultCategory,
      title: "",
      content: "",
      images: [],
      ...initial,
    },
  });

  const images = form.watch("images") ?? [];
  const imagesError = form.formState.errors.images?.message;

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // 같은 파일 재선택도 onChange 가 다시 뜨도록
    if (files.length === 0) return;

    setServerError(null);
    setUploadError(null);

    const room = MAX_POST_IMAGES - images.length;
    if (room <= 0) {
      setUploadError(`이미지는 최대 ${MAX_POST_IMAGES}장까지 올릴 수 있어요.`);
      return;
    }
    const picked = files.slice(0, room);

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of picked) {
        if (!ACCEPT.includes(file.type)) {
          setUploadError("JPG·PNG·WEBP·GIF 이미지만 올릴 수 있어요.");
          continue;
        }
        if (file.size > MAX_BYTES) {
          setUploadError("이미지는 5MB 이하만 올릴 수 있어요.");
          continue;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        // 경로 첫 세그먼트를 본인 uid 로 → Storage RLS 가 본인 폴더만 허용
        const rand = Math.random().toString(36).slice(2, 8);
        const path = `${userId}/${Date.now()}-${rand}.${ext}`;
        const { error } = await supabase.storage
          .from(POST_IMAGE_BUCKET)
          .upload(path, file, { contentType: file.type });
        if (error) {
          setUploadError("사진 업로드에 실패했어요. 다시 시도해주세요.");
          continue;
        }
        uploaded.push(path);
      }
      if (uploaded.length > 0) {
        form.setValue("images", [...images, ...uploaded], {
          shouldValidate: true,
        });
      }
    } finally {
      setUploading(false);
    }
  }

  function removeImage(path: string) {
    setUploadError(null);
    form.setValue(
      "images",
      images.filter((p) => p !== path),
      { shouldValidate: true },
    );
  }

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
        {showCategorySelect ? (
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
                      {availableCategories.map((c) => (
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
        ) : (
          // 선택지가 하나뿐(자유글)이면 안내 칩만 노출
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

        {/* 이미지 첨부 (선택 · 모든 카테고리 공통) */}
        <div className="grid gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <ImagePlus className="size-4 text-[#65a30d]" />
            사진
            <span className="text-xs font-normal text-slate-400">
              선택 · 최대 {MAX_POST_IMAGES}장 · 5MB 이하
            </span>
          </span>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {images.map((path) => (
              <div
                key={path}
                className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-slate-900/10"
              >
                {/* Storage CDN 이미지라 next/image 대신 일반 img 사용 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={postImageUrl(path)}
                  alt="첨부 사진"
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(path)}
                  title="사진 제거"
                  className="absolute right-1 top-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-slate-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}

            {images.length < MAX_POST_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-900/20 bg-white/60 text-slate-400 transition-colors hover:border-[#84cc16]/50 hover:text-[#4d7c0f] disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <ImagePlus className="size-5" />
                )}
                <span className="text-xs font-medium">
                  {uploading ? "업로드 중" : "추가"}
                </span>
              </button>
            )}
          </div>
          {(uploadError || imagesError) && (
            <p className="text-sm font-medium text-red-500">
              {uploadError ?? imagesError}
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT.join(",")}
            multiple
            onChange={handleFiles}
            className="hidden"
          />
        </div>

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
          disabled={form.formState.isSubmitting || uploading}
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
