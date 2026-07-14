"use client";

import { useState } from "react";
import { Film, Play } from "lucide-react";
import { youtubeEmbedUrl, type MatchVideo } from "@/lib/constants/matches";

/**
 * 매치 영상 뷰어 (활성 회원 전원). 팀마다 방식이 달라(풀 영상 1개 vs 쿼터별 여러 개)
 * 여러 개면 라벨 칩으로 하나를 골라 재생한다(여러 iframe 을 쌓아 화면이 길어지는 것 방지).
 * 유튜브면 임베드, 아니면 새 탭 링크 칩.
 */
export function MatchVideos({ videos }: { videos: MatchVideo[] }) {
  const [active, setActive] = useState(0);
  if (videos.length === 0) return null;

  const current = videos[Math.min(active, videos.length - 1)] ?? videos[0];
  const embed = youtubeEmbedUrl(current.url);

  return (
    <div className="mb-4">
      {/* 라벨 칩 선택 (영상 2개 이상일 때만) */}
      {videos.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {videos.map((v, i) => {
            const on = i === active;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  on
                    ? "border-[#84cc16]/40 bg-[#84cc16]/15 text-[#4d7c0f]"
                    : "border-slate-900/10 bg-white/70 text-slate-500 hover:border-[#84cc16]/30"
                }`}
              >
                <Play className="size-3" />
                {v.label || `영상 ${i + 1}`}
              </button>
            );
          })}
        </div>
      )}

      {embed ? (
        <div className="overflow-hidden rounded-2xl bg-slate-900/[0.04] ring-1 ring-slate-900/[0.06]">
          <div className="relative aspect-video">
            <iframe
              // key 로 소스 교체 시 iframe 을 재마운트(칩 전환이 확실히 반영되도록)
              key={current.url}
              src={embed}
              title={current.label || "경기 영상"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 size-full"
            />
          </div>
        </div>
      ) : (
        // 유튜브가 아닌 링크는 임베드 대신 새 탭 링크로
        <a
          href={current.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-900/10 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-[#84cc16]/40 hover:text-[#4d7c0f]"
        >
          <Play className="size-4 text-[#65a30d]" />
          {current.label || "경기 영상"} 보기
          <Film className="size-3.5 text-slate-400" />
        </a>
      )}
    </div>
  );
}
