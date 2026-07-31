// foot-mate iOS 스플래시(apple-touch-startup-image) 생성 — 세로(portrait) 전용.
// 실행: pnpm gen:splash   (deps: sharp — devDependencies)
//
// iOS는 manifest를 읽지 않아 Android처럼 스플래시를 자동 합성해주지 않는다. `apple-touch-startup-image`
// link의 media 쿼리가 기기와 "정확히" 매칭될 때만 이미지를 띄우고, 매칭이 없으면 흰 화면으로 폴백한다.
// → 기기(뷰포트 pt × DPR)별 이미지를 전부 만들어 둔다.
//
// 산출물: public/splash/splash-{물리px}.png + lib/constants/splash.ts(link 배열, layout.tsx가 import).
// PNG·TS 모두 산출물이니 직접 편집하지 말고 이 파일을 고쳐 재실행할 것.
// 로고 마크는 gen-icons.mjs·gen-og.mjs와 동일하게 유지한다.
import sharp from "sharp";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "splash");
const CONST = join(ROOT, "lib", "constants", "splash.ts");

// --- 대상 기기 (세로 기준 CSS 뷰포트 pt + DPR). 같은 pt라도 DPR이 다르면 별도 항목(XR/11 vs XS Max). ---
const DEVICES = [
  // iPhone
  { w: 375, h: 667, dpr: 2, note: "iPhone 8 · SE 2·3" },
  { w: 414, h: 736, dpr: 3, note: "iPhone 8 Plus" },
  { w: 375, h: 812, dpr: 3, note: "iPhone X·XS·11 Pro · 12/13 mini" },
  { w: 414, h: 896, dpr: 2, note: "iPhone XR · 11" },
  { w: 414, h: 896, dpr: 3, note: "iPhone XS Max · 11 Pro Max" },
  { w: 390, h: 844, dpr: 3, note: "iPhone 12·13·14 · 16e·17e" },
  { w: 393, h: 852, dpr: 3, note: "iPhone 14 Pro · 15·15 Pro · 16" },
  { w: 402, h: 874, dpr: 3, note: "iPhone 16 Pro · 17·17 Pro" },
  { w: 420, h: 912, dpr: 3, note: "iPhone Air" },
  { w: 428, h: 926, dpr: 3, note: "iPhone 12/13 Pro Max · 14 Plus" },
  { w: 430, h: 932, dpr: 3, note: "iPhone 14 Pro Max · 15 Plus·15 Pro Max · 16 Plus" },
  { w: 440, h: 956, dpr: 3, note: "iPhone 16 Pro Max · 17 Pro Max" },
  // iPad
  { w: 744, h: 1133, dpr: 2, note: "iPad mini 6·7" },
  { w: 768, h: 1024, dpr: 2, note: "iPad 9.7 · mini 5" },
  { w: 810, h: 1080, dpr: 2, note: "iPad 7·8·9" },
  { w: 820, h: 1180, dpr: 2, note: "iPad 10 · Air 10.9/11" },
  { w: 834, h: 1112, dpr: 2, note: "iPad Pro 10.5" },
  { w: 834, h: 1194, dpr: 2, note: "iPad Pro 11 (2018~2022)" },
  { w: 834, h: 1210, dpr: 2, note: "iPad Pro 11 (M4~)" },
  { w: 1024, h: 1366, dpr: 2, note: "iPad Pro 12.9 · Air 13" },
  { w: 1032, h: 1376, dpr: 2, note: "iPad Pro 13 (M4~)" },
];

const FONT = "'Apple SD Gothic Neo','Noto Sans KR',sans-serif";

// 순백 타일 배지(512 좌표계 모티브를 size로 축소 배치) — gen-og.mjs와 동일
const badge = (x, y, size) => {
  const s = size / 512;
  return `<g transform="translate(${x},${y}) scale(${s})">
    <rect width="512" height="512" rx="112" fill="#ffffff"/>
    <path d="M100,330 Q160,40 220,330" fill="none" stroke="url(#arc)" stroke-width="40" stroke-linecap="round"/>
    <path d="M220,330 Q280,170 340,330" fill="none" stroke="url(#arc)" stroke-width="40" stroke-linecap="round"/>
    <circle cx="382" cy="230" r="28" fill="#65a30d"/>
    <rect x="4" y="4" width="504" height="504" rx="108" fill="none" stroke="#0f172a" stroke-opacity="0.08" stroke-width="6"/>
  </g>`;
};

// ⚠️ 레이아웃은 "Android(Chrome) 합성 스플래시와 동일하게 보이도록" 맞춘 것이다.
// Chrome은 manifest의 background_color를 평면으로 깔고 아이콘을 화면 중앙, 그 아래에 name을 그린다
// (이미지를 지정할 방법이 없다 = Android를 iOS에 맞출 순 없다). 그래서 iOS 이미지를 그쪽에 맞췄다:
// 평면 배경(오브·그리드 없음) + 중앙 배지 + 앱 이름 한 줄. 부제·하단 라인·그림자를 넣으면 두 화면이 갈린다.
// viewBox는 pt(CSS px), width/height는 물리 px → 기기별로 벡터가 그대로 스케일된다.
const splashSvg = (w, h, dpr) => {
  const badgeSize = Math.min(w * 0.24, 132); // Chrome 스플래시 아이콘 크기 비율
  const nameSize = Math.min(w * 0.042, 20);
  const gap = nameSize * 1.3;
  const cx = w / 2;
  const blockTop = h / 2 - (badgeSize + gap + nameSize) / 2;

  return `<svg width="${w * dpr}" height="${h * dpr}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="arc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#84cc16"/><stop offset="1" stop-color="#4d7c0f"/></linearGradient>
  </defs>

  <rect width="${w}" height="${h}" fill="#f6f8f4"/>
  ${badge(cx - badgeSize / 2, blockTop, badgeSize)}
  <text x="${cx}" y="${blockTop + badgeSize + gap + nameSize * 0.8}" text-anchor="middle" font-family="${FONT}" font-size="${nameSize}" font-weight="500" fill="#0f172a">Foot Mate</text>
</svg>`;
};

await mkdir(OUT, { recursive: true });

const entries = [];
for (const { w, h, dpr, note } of DEVICES) {
  const file = `splash-${w * dpr}x${h * dpr}.png`;
  const buf = await sharp(Buffer.from(splashSvg(w, h, dpr)))
    // 평면 배경 + 로고뿐이라 팔레트(256색)로 충분. dither는 노이즈를 넣어 오히려 파일이 커진다.
    .png({ compressionLevel: 9, palette: true, dither: 0, effort: 10 })
    .toBuffer();
  await writeFile(join(OUT, file), buf);
  entries.push({ file, w, h, dpr, note });
}

const ts = `// ⚠️ 자동 생성 파일 — 직접 편집하지 말 것. 수정은 scripts/gen-splash.mjs 후 \`pnpm gen:splash\`.
// iOS(Safari standalone) 스플래시. media 쿼리가 기기와 정확히 매칭될 때만 표시되고, 없으면 흰 화면이다.
// 세로(portrait) 전용 — 가로로 실행하면 폴백(흰 화면)된다.
export const APPLE_STARTUP_IMAGES = [
${entries
  .map(
    ({ file, w, h, dpr, note }) =>
      `  // ${note}\n  {\n    url: "/splash/${file}",\n    media:\n      "(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)",\n  },`,
  )
  .join("\n")}
] as const;
`;
await writeFile(CONST, ts);

console.log(`스플래시 생성 완료: public/splash/*.png ${entries.length}개 + lib/constants/splash.ts`);
