"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Camera,
  Check,
  Loader2,
  Phone,
  Trash2,
  User,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { profileSchema, type ProfileInput } from "@/lib/schemas/profile";
import { updateProfile } from "./actions";
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

const inputClass =
  "h-11 rounded-xl border-slate-900/10 bg-white/70 transition-colors focus-visible:border-[#84cc16] focus-visible:ring-[#84cc16]/25";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB (버킷 제한과 동일)
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ProfileForm({
  userId,
  initialName,
  initialPhone,
  initialAvatarUrl,
}: {
  userId: string;
  initialName: string;
  initialPhone: string;
  initialAvatarUrl: string | null;
}) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: initialName, phone: initialPhone },
  });

  // 아바타 미설정 시 이니셜 표시용 (club-form과 동일하게 상단에서 구독)
  const nameValue = form.watch("name") ?? "";

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // 같은 파일 재선택도 onChange가 다시 뜨도록 값 초기화
    e.target.value = "";
    if (!file) return;

    setServerError(null);
    setSaved(false);

    if (!ACCEPT.includes(file.type)) {
      setServerError("JPG·PNG·WEBP·GIF 이미지만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setServerError("이미지는 2MB 이하만 올릴 수 있어요.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      // 경로 첫 세그먼트를 본인 uid 로 → Storage RLS가 본인 폴더만 허용
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (error) {
        setServerError("사진 업로드에 실패했어요. 다시 시도해주세요.");
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(publicUrl);
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: ProfileInput) {
    setServerError(null);
    setSaved(false);
    const result = await updateProfile({ ...values, avatarUrl });
    if (result?.error) {
      setServerError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        {/* 아바타 */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {avatarUrl ? (
              // 카카오/Storage CDN 호스트가 유동적이라 next/image 대신 일반 img 사용
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="프로필 사진"
                width={96}
                height={96}
                referrerPolicy="no-referrer"
                className="size-24 rounded-full object-cover ring-2 ring-white shadow-md"
              />
            ) : (
              <span className="flex size-24 items-center justify-center rounded-full bg-[#84cc16]/15 text-3xl font-bold text-[#4d7c0f] ring-2 ring-white shadow-md">
                {(nameValue || "축").charAt(0)}
              </span>
            )}

            {/* 사진 변경 버튼 */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="사진 변경"
              className="absolute -bottom-1 -right-1 flex size-9 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#bef264] to-[#84cc16] text-[#1a2e05] shadow-md ring-2 ring-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
            </button>
          </div>

          {avatarUrl && (
            <button
              type="button"
              onClick={() => {
                setAvatarUrl(null);
                setSaved(false);
              }}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-red-500"
            >
              <Trash2 className="size-3.5" />
              사진 제거
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT.join(",")}
            onChange={handleFile}
            className="hidden"
          />
        </div>

        {/* 이름 */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-slate-700">
                <User className="size-4 text-[#65a30d]" />
                이름
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="이름 또는 닉네임"
                  className={inputClass}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 휴대폰 */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-slate-700">
                <Phone className="size-4 text-[#65a30d]" />
                휴대폰
                <span className="text-xs font-normal text-slate-400">선택</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="010-1234-5678"
                  className={inputClass}
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
        {saved && !serverError && (
          <p className="flex items-center gap-2 rounded-xl border border-[#84cc16]/30 bg-[#84cc16]/[0.08] px-3.5 py-2.5 text-sm font-medium text-[#4d7c0f]">
            <Check className="size-4 shrink-0" />
            저장했어요.
          </p>
        )}

        <Button
          type="submit"
          disabled={form.formState.isSubmitting || uploading}
          className="group relative mt-1 h-12 w-full gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-[#bef264] to-[#84cc16] text-base font-semibold text-[#1a2e05] shadow-lg shadow-[#a3e635]/40 ring-1 ring-inset ring-white/50 transition-all hover:from-[#d9f99d] hover:to-[#a3e635] hover:not-disabled:-translate-y-0.5"
        >
          {form.formState.isSubmitting ? "저장 중…" : "저장하기"}
        </Button>
      </form>
    </Form>
  );
}
