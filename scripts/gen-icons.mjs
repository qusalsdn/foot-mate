// foot-mate 브랜드 아이콘 생성 — 로고 마크의 단일 소스(벡터가 이 파일에 인라인돼 있다).
// 실행: pnpm gen:icons   (deps: sharp, png-to-ico — devDependencies)
// 로고를 수정하려면 아래 motif/팔레트만 고치고 재실행 → 전 사이즈 재생성. PNG를 직접 편집하지 말 것.
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const APP = join(ROOT, "app");

// --- 로고 마크: 순백 타일 + 라임 그라디언트 2단 바운스 궤적 + 도트 (512 좌표계, 세로/가로 중앙) ---
const BG = "#ffffff";

const defs = `
  <defs>
    <linearGradient id="arc" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#84cc16"/>
      <stop offset="1" stop-color="#4d7c0f"/>
    </linearGradient>
  </defs>`;

const motif = `
  <path d="M100,330 Q160,40 220,330" fill="none" stroke="url(#arc)" stroke-width="40" stroke-linecap="round"/>
  <path d="M220,330 Q280,170 340,330" fill="none" stroke="url(#arc)" stroke-width="40" stroke-linecap="round"/>
  <circle cx="382" cy="230" r="28" fill="#65a30d"/>`;

// 라운드(any) — 브라우저/PWA 표시용, 모서리 투명 + 미세 보더
const masterRounded = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect x="0" y="0" width="512" height="512" rx="112" fill="${BG}"/>
  ${motif}
  <rect x="4" y="4" width="504" height="504" rx="108" fill="none" stroke="#0f172a" stroke-opacity="0.08" stroke-width="6"/>
</svg>`;

// 스퀘어 — apple-touch / favicon용, 꽉 찬 배경(투명 없음)
const masterSquare = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect x="0" y="0" width="512" height="512" fill="${BG}"/>
  ${motif}
</svg>`;

// 마스커블 — Android 어댑티브, 안전영역 고려해 모티브 78% 축소 + 꽉 찬 배경
const masterMaskable = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect x="0" y="0" width="512" height="512" fill="${BG}"/>
  <g transform="translate(256,256) scale(0.78) translate(-256,-256)">
    ${motif}
  </g>
</svg>`;

const png = (svg, size) => sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();

// PWA/브라우저 아이콘
await writeFile(join(PUBLIC, "app-icon-128.png"), await png(masterRounded, 128));
await writeFile(join(PUBLIC, "app-icon-192.png"), await png(masterRounded, 192));
await writeFile(join(PUBLIC, "app-icon-512.png"), await png(masterRounded, 512));
await writeFile(join(PUBLIC, "app-icon-maskable-512.png"), await png(masterMaskable, 512));

// Apple touch (꽉 찬 배경, iOS가 자동 라운딩)
await writeFile(join(PUBLIC, "apple-touch-icon.png"), await png(masterSquare, 180));

// Favicon (16·32·48, 스퀘어 마스터가 소형에서 가독성 좋음 — 256 프레임은 무압축 BMP라 넣지 않음)
const favBufs = await Promise.all([16, 32, 48].map((s) => png(masterSquare, s)));
await writeFile(join(APP, "favicon.ico"), await pngToIco(favBufs));

console.log("아이콘 생성 완료: app-icon-{128,192,512}, -maskable-512, apple-touch-icon, favicon.ico");
