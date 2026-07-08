import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/push/service-worker-register";

export const metadata: Metadata = {
  title: "Foot Mate",
  description: "축구 동호회 관리 — 회원·매치·회비·알림",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Foot Mate", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
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
