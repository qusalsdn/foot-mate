"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export type MentionMember = {
  userId: string;
  name: string;
  avatarUrl: string | null;
};

/**
 * `@` 멘션 자동완성이 붙은 텍스트에어리어.
 *
 * - 캐럿 바로 앞의 `@질의` 토큰을 감지해 멤버 후보 드롭다운을 띄운다.
 * - 후보를 고르면 본문엔 `@이름`(사람이 읽는 텍스트)을 넣고, 실제 대상 user_id 는
 *   내부에서 추적해 onMentionsChange 로 부모에 알린다(이름이 유일하지 않아 id 로 특정).
 * - 본문에서 `@이름` 이 사라지면 그 멘션은 자동으로 대상에서 빠진다(입력했다 지운 경우 방어).
 * - members 가 비면(예: 게스트는 회원목록 접근 불가) 드롭다운이 뜨지 않고 평범한 입력창이 된다.
 *
 * 값(value)은 부모(RHF)가 제어한다. 멘션 목록은 이벤트 시점마다 계산해 emit 한다(effect 미사용).
 */
export function MentionTextarea({
  value,
  onChange,
  onBlur,
  onMentionsChange,
  members,
  name,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  onMentionsChange: (userIds: string[]) => void;
  members: MentionMember[];
  name?: string;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // 선택된 멘션(누적). 본문 존재 여부로 유효분만 걸러 emit 한다.
  const selectedRef = useRef<MentionMember[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [startIdx, setStartIdx] = useState(0);
  const [highlight, setHighlight] = useState(0);
  // 삽입 후 캐럿 복원용 (렌더 후 setSelectionRange)
  const [caret, setCaret] = useState<number | null>(null);

  const q = query.trim().toLowerCase();
  const matches =
    open && members.length > 0
      ? members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 6)
      : [];

  useLayoutEffect(() => {
    if (caret != null && ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(caret, caret);
      setCaret(null);
    }
  }, [caret]);

  function emit(text: string, sel: MentionMember[]) {
    const ids = Array.from(
      new Set(
        sel.filter((s) => text.includes(`@${s.name}`)).map((s) => s.userId),
      ),
    );
    onMentionsChange(ids);
  }

  /** 캐럿 앞 `@질의` 토큰 감지 → 드롭다운 상태 갱신. */
  function refreshMention() {
    const el = ref.current;
    if (!el || members.length === 0) {
      setOpen(false);
      return;
    }
    const pos = el.selectionStart ?? 0;
    const upto = el.value.slice(0, pos);
    // @ 는 문자열 시작 또는 공백 뒤에서만 (이메일 등 오탐 방지). 질의는 공백/@ 제외 0~30자.
    const m = upto.match(/(?:^|\s)@([^\s@]{0,30})$/);
    if (m) {
      setStartIdx(pos - m[1].length - 1);
      setQuery(m[1]);
      setHighlight(0);
      setOpen(true);
    } else {
      setOpen(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    onChange(next);
    emit(next, selectedRef.current);
    refreshMention();
  }

  function selectMember(member: MentionMember) {
    const el = ref.current;
    const pos = el?.selectionStart ?? value.length;
    const before = value.slice(0, startIdx);
    const after = value.slice(pos);
    const token = `@${member.name} `;
    const next = before + token + after;
    onChange(next);
    setCaret((before + token).length);

    const nextSel = [...selectedRef.current, member];
    selectedRef.current = nextSel;
    setOpen(false);
    emit(next, nextSel);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      selectMember(matches[Math.min(highlight, matches.length - 1)]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        name={name}
        value={value}
        placeholder={placeholder}
        className={className}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={refreshMention}
        onKeyUp={(e) => {
          // 방향키/클릭으로 캐럿만 이동했을 때도 토큰 상태를 다시 계산
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
            refreshMention();
          }
        }}
        onBlur={() => {
          // blur 시 드롭다운을 닫되, 항목 클릭(mousedown)이 먼저 처리되도록 살짝 지연
          window.setTimeout(() => setOpen(false), 120);
          onBlur?.();
        }}
      />

      {open && matches.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1 max-h-60 w-full max-w-xs overflow-auto rounded-xl border border-slate-900/[0.08] bg-white p-1 shadow-xl"
        >
          {matches.map((m, i) => (
            <li key={m.userId}>
              <button
                type="button"
                // onMouseDown(preventDefault)로 textarea blur 전에 선택을 확정
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectMember(m);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  i === highlight ? "bg-[#84cc16]/12" : "hover:bg-slate-900/[0.03]"
                }`}
              >
                {m.avatarUrl ? (
                  // 카카오 CDN 호스트가 유동적이라 next/image 대신 일반 img 사용
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.avatarUrl}
                    alt={m.name}
                    referrerPolicy="no-referrer"
                    className="size-7 shrink-0 rounded-full object-cover ring-1 ring-slate-900/10"
                  />
                ) : (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#84cc16]/15 text-xs font-bold text-[#4d7c0f]">
                    {m.name.charAt(0)}
                  </span>
                )}
                <span className="truncate text-sm font-medium text-slate-700">
                  {m.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
