import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/push/service-worker-register";

const DESCRIPTION = "축구 동호회 운영, 이제 앱 하나로 — 회원·매치·회비·커뮤니티·알림";

export const metadata: Metadata = {
  metadataBase: new URL("https://foot-mate.vercel.app"),
  title: "Foot Mate",
  description: DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Foot Mate", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
  // OG/트위터 이미지는 app/opengraph-image.png · app/twitter-image.png 파일 규칙으로 자동 주입됨.
  openGraph: {
    type: "website",
    siteName: "Foot Mate",
    title: "Foot Mate",
    description: DESCRIPTION,
    url: "/",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Foot Mate",
    description: DESCRIPTION,
  },
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
