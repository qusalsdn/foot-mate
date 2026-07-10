/**
 * iOS는 manifest의 background_color를 읽지 않는다. 홈 화면에서 실행할 때 흰 화면 대신
 * 스플래시를 띄우려면 기기 해상도마다 정확히 매칭되는 `apple-touch-startup-image`가 있어야 한다.
 * 매칭되는 항목이 없으면 그 기기에서만 조용히 흰 화면으로 돌아간다.
 *
 * 이 목록이 단일 소스다 — `scripts/generate-splash.mjs`가 PNG를 굽고,
 * `app/layout.tsx`가 link 태그를 만든다. 기기를 추가하면 스크립트를 다시 돌릴 것.
 */

export type IosDevice = {
  /** 기기를 알아보기 위한 주석용 이름 */
  name: string;
  /** CSS 픽셀 (device-width / device-height 미디어 쿼리에 쓰인다) */
  width: number;
  height: number;
  /** -webkit-device-pixel-ratio */
  ratio: number;
};

export type Orientation = "portrait" | "landscape";

export const ORIENTATIONS: Orientation[] = ["portrait", "landscape"];

export const IOS_SPLASH_DEVICES: IosDevice[] = [
  // iPhone
  { name: "iPhone SE (1세대)", width: 320, height: 568, ratio: 2 },
  { name: "iPhone SE (2·3세대), 6/7/8", width: 375, height: 667, ratio: 2 },
  { name: "iPhone 8 Plus", width: 414, height: 736, ratio: 3 },
  { name: "iPhone X/XS/11 Pro, 12·13 mini", width: 375, height: 812, ratio: 3 },
  { name: "iPhone XR, 11", width: 414, height: 896, ratio: 2 },
  { name: "iPhone XS Max, 11 Pro Max", width: 414, height: 896, ratio: 3 },
  { name: "iPhone 12/12 Pro, 13/13 Pro, 14", width: 390, height: 844, ratio: 3 },
  { name: "iPhone 12·13 Pro Max, 14 Plus", width: 428, height: 926, ratio: 3 },
  { name: "iPhone 14 Pro, 15/15 Pro, 16, 16e", width: 393, height: 852, ratio: 3 },
  { name: "iPhone 14 Pro Max, 15 Plus/Pro Max, 16 Plus", width: 430, height: 932, ratio: 3 },
  { name: "iPhone 16 Pro", width: 402, height: 874, ratio: 3 },
  { name: "iPhone 16 Pro Max", width: 440, height: 956, ratio: 3 },

  // iPad
  { name: "iPad mini (6세대)", width: 744, height: 1133, ratio: 2 },
  { name: "iPad 9.7\"", width: 768, height: 1024, ratio: 2 },
  { name: "iPad 10.2\"", width: 810, height: 1080, ratio: 2 },
  { name: "iPad Air 10.9\", iPad 10.9\"", width: 820, height: 1180, ratio: 2 },
  { name: "iPad Pro 10.5\"", width: 834, height: 1112, ratio: 2 },
  { name: "iPad Pro 11\"", width: 834, height: 1194, ratio: 2 },
  { name: "iPad Pro 12.9\"", width: 1024, height: 1366, ratio: 2 },
];

/** 스플래시 PNG의 실제 픽셀 크기 (landscape는 가로·세로가 뒤바뀐다) */
export function splashPixels(device: IosDevice, orientation: Orientation): [number, number] {
  const w = device.width * device.ratio;
  const h = device.height * device.ratio;
  return orientation === "portrait" ? [w, h] : [h, w];
}

export function splashUrl(device: IosDevice, orientation: Orientation): string {
  const [w, h] = splashPixels(device, orientation);
  return `/splash/${w}x${h}.png`;
}

export function splashMedia(device: IosDevice, orientation: Orientation): string {
  return [
    `(device-width: ${device.width}px)`,
    `(device-height: ${device.height}px)`,
    `(-webkit-device-pixel-ratio: ${device.ratio})`,
    `(orientation: ${orientation})`,
  ].join(" and ");
}
