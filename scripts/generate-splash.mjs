/**
 * iOS `apple-touch-startup-image` PNG 생성기.
 *
 *   node scripts/generate-splash.mjs
 *
 * 기기 목록은 lib/constants/ios-splash.ts 하나뿐이다 (layout.tsx의 link 태그도 같은 목록에서 나온다).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  IOS_SPLASH_DEVICES,
  ORIENTATIONS,
  splashPixels,
  splashUrl,
} from "../lib/constants/ios-splash.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "splash");

// 앱 팔레트 (CLAUDE.md 디자인 컨벤션)
const BG = "#f6f8f4";
const LIME = "#84cc16";
const INK = "#0f172a";
const ORB_LIME = "#a3e635";
const ORB_MINT = "#34d399";

/** 앱 아이콘과 같은 마크: 라임 링 + 오각형. viewBox 0 0 100 100 */
const MARK = `
    <circle cx="50" cy="50" r="38" fill="none" stroke="${LIME}" stroke-width="7" />
    <polygon points="50,30 69.97,44.51 62.34,67.99 37.66,67.99 30.03,44.51" fill="${LIME}" />`;

function splashSvg(w, h) {
  const max = Math.max(w, h);
  const min = Math.min(w, h);

  const markSize = Math.round(min * 0.24);
  const markX = Math.round(w / 2 - markSize / 2);
  const markY = Math.round(h * 0.44 - markSize / 2);

  const fontSize = Math.round(markSize * 0.19);
  const textY = markY + markSize + Math.round(fontSize * 1.5);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="orbA">
      <stop offset="0%" stop-color="${ORB_LIME}" stop-opacity="1" />
      <stop offset="65%" stop-color="${ORB_LIME}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="orbB">
      <stop offset="0%" stop-color="${ORB_MINT}" stop-opacity="1" />
      <stop offset="65%" stop-color="${ORB_MINT}" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="${w}" height="${h}" fill="${BG}" />
  <circle cx="${w / 2}" cy="${h * 0.02}" r="${max * 0.45}" fill="url(#orbA)" opacity="0.25" />
  <circle cx="${w}" cy="${h * 0.34}" r="${max * 0.3}" fill="url(#orbB)" opacity="0.18" />

  <svg x="${markX}" y="${markY}" width="${markSize}" height="${markSize}" viewBox="0 0 100 100">${MARK}
  </svg>

  <text x="${w / 2}" y="${textY}" text-anchor="middle"
        font-family="-apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif"
        font-size="${fontSize}" font-weight="700" letter-spacing="${fontSize * 0.01}"
        fill="${INK}">Foot Mate</text>
</svg>`;
}

const only = process.argv[2]; // 디버그용: 파일명 하나만 (예: 1179x2556.png)

await mkdir(OUT_DIR, { recursive: true });

const seen = new Set();
let written = 0;

for (const device of IOS_SPLASH_DEVICES) {
  for (const orientation of ORIENTATIONS) {
    const file = splashUrl(device, orientation).replace(/^\/splash\//, "");
    if (seen.has(file)) continue;
    seen.add(file);
    if (only && file !== only) continue;

    const [w, h] = splashPixels(device, orientation);
    // 색이 몇 개 안 되는 그림이라 256색 팔레트로 1/3까지 줄어든다.
    // dither를 끄지 않으면 노이즈가 끼어 오히려 커지고, 색을 더 줄이면 오브에 밴딩이 보인다.
    const png = await sharp(Buffer.from(splashSvg(w, h)))
      .png({ palette: true, colors: 256, dither: 0, effort: 10 })
      .toBuffer();
    await writeFile(path.join(OUT_DIR, file), png);
    written += 1;
  }
}

console.log(`splash: ${written}개 생성 → public/splash/`);
