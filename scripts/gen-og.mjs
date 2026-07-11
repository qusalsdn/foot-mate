// foot-mate OG/트위터 공유 이미지 생성 (1200×630). 로고 마크는 gen-icons.mjs와 동일.
// 실행: pnpm gen:og   (deps: sharp — devDependencies)
// 텍스트/레이아웃을 고치고 재실행하면 app/opengraph-image.png·twitter-image.png가 갱신된다.
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "app");

// 순백 타일 배지(512 좌표계 모티브를 size로 축소 배치)
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

const FONT = "'Apple SD Gothic Neo','Noto Sans KR',sans-serif";

const og = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="arc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#84cc16"/><stop offset="1" stop-color="#4d7c0f"/></linearGradient>
    <radialGradient id="orb1" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#a3e635"/><stop offset="1" stop-color="#a3e635" stop-opacity="0"/></radialGradient>
    <radialGradient id="orb2" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#34d399" stop-opacity="0"/></radialGradient>
    <filter id="bsh" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="14" stdDeviation="24" flood-color="#0f172a" flood-opacity="0.14"/></filter>
  </defs>

  <rect width="1200" height="630" fill="#f6f8f4"/>
  <circle cx="120" cy="90" r="420" fill="url(#orb1)" opacity="0.28"/>
  <circle cx="1140" cy="600" r="440" fill="url(#orb2)" opacity="0.20"/>
  <g opacity="0.5" stroke="#0f172a" stroke-opacity="0.05" stroke-width="1">
    ${Array.from({ length: 26 }, (_, i) => `<line x1="${i * 48}" y1="0" x2="${i * 48}" y2="630"/>`).join("")}
    ${Array.from({ length: 14 }, (_, i) => `<line x1="0" y1="${i * 48}" x2="1200" y2="${i * 48}"/>`).join("")}
  </g>

  <line x1="90" y1="118" x2="1110" y2="118" stroke="#84cc16" stroke-opacity="0.35" stroke-width="4" stroke-linecap="round"/>

  <g filter="url(#bsh)">${badge(96, 200, 190)}</g>

  <text x="320" y="300" font-family="${FONT}" font-size="104" font-weight="800" fill="#0f172a" letter-spacing="-2">Foot Mate</text>
  <text x="324" y="366" font-family="${FONT}" font-size="40" font-weight="500" fill="#475569">축구 동호회 운영, 이제 앱 하나로.</text>

  <g font-family="${FONT}" font-size="30" font-weight="600" fill="#4d7c0f">
    <text x="96" y="500">매치 일정 · 참석 투표</text>
    <text x="470" y="500">회비 정산 · 미납 관리</text>
    <text x="852" y="500">커뮤니티 · 알림</text>
  </g>
  <g fill="#84cc16"><circle cx="450" cy="491" r="4"/><circle cx="832" cy="491" r="4"/></g>

  <text x="1110" y="580" text-anchor="end" font-family="${FONT}" font-size="28" font-weight="500" fill="#94a3b8">foot-mate.vercel.app</text>
</svg>`;

const buf = await sharp(Buffer.from(og)).png().toBuffer();
await writeFile(join(APP, "opengraph-image.png"), buf);
await writeFile(join(APP, "twitter-image.png"), buf);

console.log("OG 이미지 생성 완료: app/opengraph-image.png, app/twitter-image.png");
