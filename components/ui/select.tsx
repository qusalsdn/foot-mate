"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 앱 팔레트(라임/글래스)에 맞춘 Select. Base UI Select 위에 얇게 감쌌다.
 * shadcn `add` 로 받으면 회색 `--primary` 토큰이 딸려오므로(프로젝트 컨벤션은 하드코딩 팔레트)
 * 직접 스타일링해 홈·클럽·매치 폼과 통일한다. 네이티브 <select> 대체용.
 */
function Select(props: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root {...props} />;
}

/** 닫힌 상태 버튼. className 으로 크기(h-11 폼 / h-8 알약 등)를 호출부에서 조절. */
function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-11 w-full cursor-pointer select-none items-center justify-between gap-2 rounded-xl border border-slate-900/10 bg-white/70 pl-3.5 pr-3 text-sm text-slate-900 outline-none transition-colors",
        "focus-visible:border-[#84cc16] focus-visible:ring-2 focus-visible:ring-[#84cc16]/25",
        "data-[popup-open]:border-[#84cc16] data-[popup-open]:ring-2 data-[popup-open]:ring-[#84cc16]/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-red-400 aria-invalid:ring-2 aria-invalid:ring-red-400/20",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="flex shrink-0 text-slate-400">
        <ChevronDown className="size-4" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

/** 선택값 표시. placeholder 는 미선택 시 노출(색 조절 위해 노드로 넘김). */
function SelectValue(
  props: React.ComponentProps<typeof SelectPrimitive.Value>,
) {
  return <SelectPrimitive.Value {...props} />;
}

/** 열린 목록 팝업(글래스 카드). 트리거 너비(--anchor-width)에 맞춰 최소폭 고정. */
function SelectContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Popup>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        sideOffset={6}
        alignItemWithTrigger={false}
        className="z-50 outline-none"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "max-h-[min(22rem,var(--available-height))] min-w-[var(--anchor-width)] overflow-y-auto rounded-2xl border border-slate-900/[0.06] bg-white p-1.5 text-sm text-slate-900 shadow-xl shadow-slate-900/10 outline-none",
            // scale(줌)만 애니메이션 — 팝업이 끝까지 불투명이라 뒤의 움직이는 blur 오브를
            // 재합성하지 않는다. opacity 페이드를 쓰면 반투명 구간에서 닫힘이 버벅임.
            "origin-[var(--transform-origin)] transition-transform duration-150 ease-out data-[ending-style]:scale-95 data-[starting-style]:scale-95",
            className,
          )}
          {...props}
        >
          {children}
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

/** 선택 항목. 하이라이트=라임 배경, 선택=라임 텍스트 + 체크 표시. */
function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pl-3 pr-8 outline-none",
        "data-[highlighted]:bg-[#84cc16]/12 data-[highlighted]:text-[#3f6212]",
        "data-[selected]:font-semibold data-[selected]:text-[#4d7c0f]",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2.5 flex">
        <Check className="size-4 text-[#65a30d]" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
};
