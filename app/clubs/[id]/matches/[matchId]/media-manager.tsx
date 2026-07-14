"use client";

import { useRef, useState } from "react";
import { AlertCircle, ImagePlus, Loader2, Plus, Video, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  MATCH_IMAGE_BUCKET,
  MATCH_VIDEO_LABEL_PRESETS,
  MAX_MATCH_IMAGES,
  MAX_MATCH_VIDEOS,
  matchImageUrl,
  type MatchVideo,
} from "@/lib/constants/matches";
import { matchMediaSchema } from "@/lib/schemas/match";
import { saveMatchMedia } from "./actions";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB (버킷 제한과 동일)
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * 매치 사진·영상 관리 (운영진 전용). 상세 페이지의 "매치 관리" 섹션에 들어간다.
 * 업로더 패턴은 게시글 작성 폼(post-form.tsx)과 동일 — 본인 uid 폴더에 올리고 경로만 모은다.
 * 영상은 자체 저장 대신 외부 링크(유튜브 등)만 받는다. 저장은 saveMatchMedia 액션.
 */
export function MediaManager({
  clubId,
  matchId,
  initialImages,
  initialVideos,
}: {
  clubId: string;
  matchId: string;
  initialImages: string[];
  initialVideos: MatchVideo[];
}) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<string[]>(initialImages);
  const [videos, setVideos] = useState<MatchVideo[]>(initialVideos);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // 마지막 저장분과 달라졌는지 (저장 버튼 활성/문구용)
  const dirty =
    images.length !== initialImages.length ||
    images.some((p, i) => p !== initialImages[i]) ||
    videos.length !== initialVideos.length ||
    videos.some(
      (v, i) =>
        v.url.trim() !== (initialVideos[i]?.url ?? "") ||
        v.label.trim() !== (initialVideos[i]?.label ?? ""),
    );

  function updateVideo(index: number, patch: Partial<MatchVideo>) {
    setSaved(false);
    setVideos((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }
  function addVideo() {
    setSaved(false);
    setVideos((prev) => [...prev, { label: "", url: "" }]);
  }
  function removeVideo(index: number) {
    setSaved(false);
    setVideos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // 같은 파일 재선택도 onChange 가 다시 뜨도록
    if (files.length === 0) return;

    setError(null);
    setUploadError(null);

    const room = MAX_MATCH_IMAGES - images.length;
    if (room <= 0) {
      setUploadError(`사진은 최대 ${MAX_MATCH_IMAGES}장까지 올릴 수 있어요.`);
      return;
    }
    const picked = files.slice(0, room);

    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setUploadError("로그인이 필요해요.");
        return;
      }
      const uploaded: string[] = [];
      for (const file of picked) {
        if (!ACCEPT.includes(file.type)) {
          setUploadError("JPG·PNG·WEBP·GIF 이미지만 올릴 수 있어요.");
          continue;
        }
        if (file.size > MAX_BYTES) {
          setUploadError("사진은 5MB 이하만 올릴 수 있어요.");
          continue;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        // 경로 첫 세그먼트를 본인 uid 로 → Storage RLS 가 본인 폴더만 허용
        const rand = Math.random().toString(36).slice(2, 8);
        const path = `${uid}/${Date.now()}-${rand}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(MATCH_IMAGE_BUCKET)
          .upload(path, file, { contentType: file.type });
        if (upErr) {
          setUploadError("사진 업로드에 실패했어요. 다시 시도해주세요.");
          continue;
        }
        uploaded.push(path);
      }
      if (uploaded.length > 0) {
        setImages((prev) => [...prev, ...uploaded]);
        setSaved(false);
      }
    } finally {
      setUploading(false);
    }
  }

  function removeImage(path: string) {
    setUploadError(null);
    setSaved(false);
    setImages((prev) => prev.filter((p) => p !== path));
  }

  async function onSave() {
    setError(null);
    // url 이 빈 행은 저장 전 제거(라벨만 남은 미완성 행 무시). 나머지는 스키마가 검증.
    const cleanVideos = videos
      .map((v) => ({ label: v.label.trim(), url: v.url.trim() }))
      .filter((v) => v.url.length > 0);
    const parsed = matchMediaSchema.safeParse({ images, videos: cleanVideos });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력값을 확인해주세요");
      return;
    }
    setSaving(true);
    try {
      const result = await saveMatchMedia(clubId, matchId, parsed.data);
      if (result?.error) setError(result.error);
      else {
        setVideos(parsed.data.videos); // 정리된(빈 행 제거) 목록으로 동기화
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-900/[0.06] bg-white/60 p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
        <ImagePlus className="size-4 text-[#65a30d]" />
        사진·영상 링크
      </h3>

      {/* 사진 업로더 */}
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {images.map((path) => (
          <div
            key={path}
            className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-slate-900/10"
          >
            {/* Storage CDN 이미지라 next/image 대신 일반 img 사용 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={matchImageUrl(path)} alt="경기 사진" className="size-full object-cover" />
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

        {images.length < MAX_MATCH_IMAGES && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-900/20 bg-white/60 text-slate-400 transition-colors hover:border-[#84cc16]/50 hover:text-[#4d7c0f] disabled:opacity-60"
          >
            {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
            <span className="text-xs font-medium">{uploading ? "업로드 중" : "추가"}</span>
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400">사진 최대 {MAX_MATCH_IMAGES}장 · 5MB 이하</p>
      {uploadError && <p className="text-sm font-medium text-red-500">{uploadError}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT.join(",")}
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      {/* 영상 링크 목록 — 팀마다 방식이 달라(풀 영상 1개 vs 쿼터별 여러 개) 라벨+링크 행을 여러 개 */}
      <div className="grid gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <Video className="size-4 text-[#65a30d]" />
          영상 링크
          <span className="text-xs font-normal text-slate-400">선택 · 유튜브 등</span>
        </span>

        {videos.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              list="match-video-labels"
              placeholder="라벨"
              value={v.label}
              onChange={(e) => updateVideo(i, { label: e.target.value })}
              className="h-11 w-24 shrink-0 rounded-xl border border-slate-900/10 bg-white/70 px-3 text-sm outline-none transition-colors focus-visible:border-[#84cc16] focus-visible:ring-2 focus-visible:ring-[#84cc16]/25"
            />
            <input
              type="url"
              inputMode="url"
              placeholder="https://youtu.be/..."
              value={v.url}
              onChange={(e) => updateVideo(i, { url: e.target.value })}
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-900/10 bg-white/70 px-3 text-sm outline-none transition-colors focus-visible:border-[#84cc16] focus-visible:ring-2 focus-visible:ring-[#84cc16]/25"
            />
            <button
              type="button"
              onClick={() => removeVideo(i)}
              title="영상 제거"
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-900/10 bg-white/70 text-slate-400 transition-colors hover:border-red-300 hover:text-red-500"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        <datalist id="match-video-labels">
          {MATCH_VIDEO_LABEL_PRESETS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>

        {videos.length < MAX_MATCH_VIDEOS && (
          <button
            type="button"
            onClick={addVideo}
            className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-slate-900/20 bg-white/60 px-3.5 py-2 text-sm font-medium text-slate-500 transition-colors hover:border-[#84cc16]/50 hover:text-[#4d7c0f]"
          >
            <Plus className="size-4" />
            영상 추가
          </button>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      )}

      <Button
        type="button"
        onClick={onSave}
        disabled={saving || uploading || (!dirty && !saved)}
        className="h-11 w-full rounded-2xl bg-gradient-to-br from-[#bef264] to-[#84cc16] text-sm font-semibold text-[#1a2e05] shadow-lg shadow-[#a3e635]/40 ring-1 ring-inset ring-white/50 transition-all hover:from-[#d9f99d] hover:to-[#a3e635] hover:not-disabled:-translate-y-0.5"
      >
        {saving ? "저장 중…" : saved && !dirty ? "저장됨" : "사진·영상 저장"}
      </Button>
    </div>
  );
}
