import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/push/service-worker-register";
import {
  IOS_SPLASH_DEVICES,
  ORIENTATIONS,
  splashMedia,
  splashUrl,
} from "@/lib/constants/ios-splash";

/**
 * Android는 manifest만으로 스플래시가 자동 생성되지만, iOS는 기기별 startup image가 있어야
 * 홈 화면 실행 시 흰 화면 대신 스플래시가 뜬다. PNG는 scripts/generate-splash.mjs로 굽는다.
 */
const appleSplashScreens = IOS_SPLASH_DEVICES.flatMap((device) =>
  ORIENTATIONS.map((orientation) => ({
    rel: "apple-touch-startup-image",
    url: splashUrl(device, orientation),
    media: splashMedia(device, orientation),
  })),
);

export const metadata: Metadata = {
  title: "Foot Mate",
  description: "축구 동호회 관리 — 회원·매치·회비·알림",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Foot Mate", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png", other: appleSplashScreens },
};

export const viewport: Viewport = {
  themeColor: "#84cc16",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
