"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, MapPin, Search, X } from "lucide-react";
import { useKakaoLoader } from "@/components/map/use-kakao-loader";
import { Input } from "@/components/ui/input";

export type LocationValue = { name: string; lat: string; lng: string };

const inputClass =
  "h-11 rounded-xl border-slate-900/10 bg-white/70 transition-colors focus-visible:border-[#84cc16] focus-visible:ring-[#84cc16]/25";

function toNum(v: string): number {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * 매치 장소 입력 + 카카오맵 장소 검색 피커.
 *
 * - 이름은 자유 입력(기존 동작 유지). 검색어로 카카오 장소 검색 → 결과 선택 시 이름·좌표 동시 설정.
 * - 좌표가 있으면 지도 미리보기 + 드래그로 위치 미세조정(좌표 갱신). "위치 지우기"로 좌표만 제거.
 * - 키 미설정/로드 실패 시 검색·지도 없이 이름 입력만 노출(폼은 그대로 동작).
 *
 * value 계약은 폼(문자열 값)과 동일 — 좌표도 문자열("" = 미설정). 숫자 검증은 matchSchema 담당.
 */
export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
}) {
  const { ready, error } = useKakaoLoader();
  const [results, setResults] = useState<
    kakao.maps.services.PlacesSearchResultItem[] | null
  >(null);
  const [searching, setSearching] = useState(false);
  const [noResult, setNoResult] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<kakao.maps.Map | null>(null);
  const markerObj = useRef<kakao.maps.Marker | null>(null);
  // 카카오 이벤트 핸들러(dragend)의 stale closure 방지용 최신 값 참조.
  // ref 갱신은 렌더 중이 아니라 effect에서(react-hooks/refs 규칙).
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  });

  const lat = toNum(value.lat);
  const lng = toNum(value.lng);
  const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lng);

  function runSearch() {
    if (!ready || !window.kakao) return;
    const keyword = value.name.trim();
    if (!keyword) return;
    setSearching(true);
    setNoResult(false);
    const places = new window.kakao.maps.services.Places();
    places.keywordSearch(keyword, (data, status) => {
      setSearching(false);
      if (status === window.kakao.maps.services.Status.OK && data.length > 0) {
        setResults(data.slice(0, 8));
      } else {
        setResults(null);
        setNoResult(true);
      }
    });
  }

  function pick(p: kakao.maps.services.PlacesSearchResultItem) {
    onChange({ name: p.place_name, lat: p.y, lng: p.x });
    setResults(null);
    setNoResult(false);
  }

  function clearCoords() {
    onChange({ ...value, lat: "", lng: "" });
  }

  // 좌표 있으면 지도 생성/갱신, 없으면 refs 리셋(컨테이너는 언마운트됨)
  useEffect(() => {
    if (!ready || !window.kakao) return;
    if (!hasCoords) {
      mapObj.current = null;
      markerObj.current = null;
      return;
    }
    const { kakao } = window;
    const pos = new kakao.maps.LatLng(lat, lng);
    if (!mapObj.current && mapRef.current) {
      mapObj.current = new kakao.maps.Map(mapRef.current, {
        center: pos,
        level: 4,
      });
      markerObj.current = new kakao.maps.Marker({
        position: pos,
        map: mapObj.current,
        draggable: true,
      });
      kakao.maps.event.addListener(markerObj.current, "dragend", () => {
        const p = markerObj.current!.getPosition();
        onChangeRef.current({
          ...valueRef.current,
          lat: String(p.getLat()),
          lng: String(p.getLng()),
        });
      });
    } else if (mapObj.current && markerObj.current) {
      mapObj.current.setCenter(pos);
      markerObj.current.setPosition(pos);
    }
  }, [ready, hasCoords, lat, lng]);

  return (
    <div className="grid gap-2">
      <div className="relative">
        <div className="flex gap-2">
          <Input
            placeholder="예: 잠실종합운동장 보조구장"
            className={`${inputClass} flex-1`}
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
            }}
          />
          {ready && !error && (
            <button
              type="button"
              onClick={runSearch}
              disabled={searching || !value.name.trim()}
              aria-label="장소 검색"
              className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-[#84cc16]/40 bg-[#84cc16]/[0.06] px-3.5 text-sm font-semibold text-[#4d7c0f] transition-colors hover:bg-[#84cc16]/12 disabled:pointer-events-none disabled:opacity-40"
            >
              {searching ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              검색
            </button>
          )}
        </div>

        {/* 검색 결과 드롭다운: 움직이는 블러 위 재합성 방지 위해 불투명 배경 */}
        {results && results.length > 0 && (
          <ul className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-900/10 bg-white shadow-lg">
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => pick(p)}
                  className="flex w-full cursor-pointer items-start gap-2 border-b border-slate-900/[0.05] px-3.5 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[#84cc16]/[0.08]"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[#65a30d]" />
                  <span className="grid">
                    <span className="text-sm font-medium text-slate-800">
                      {p.place_name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {p.road_address_name || p.address_name}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {noResult && (
        <p className="text-xs text-slate-400">
          검색 결과가 없어요. 이름은 그대로 저장돼요.
        </p>
      )}

      {error && (
        <p className="text-xs text-slate-400">
          지도 검색을 사용할 수 없어 이름만 저장돼요.
        </p>
      )}

      {hasCoords && (
        <div className="grid gap-1.5">
          <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-slate-900/[0.06] bg-slate-100">
            <div ref={mapRef} className="size-full" />
          </div>
          <div className="flex items-center justify-between px-0.5">
            <span className="text-xs text-slate-400">
              핀을 드래그해 위치를 조정할 수 있어요
            </span>
            <button
              type="button"
              onClick={clearCoords}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-red-500"
            >
              <X className="size-3.5" />
              위치 지우기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
