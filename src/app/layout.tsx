import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import HeaderWrapper from "@/components/HeaderWrapper";
import AppBoot from "@/components/AppBoot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FamGrow",
  description: "家庭成長任務系統",
};

// ✅ 讓 iOS/Android 正確處理瀏海安全區
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900 min-h-screen`}>
        {/* 啟動器：背景自動檢查每日/每週重置 */}
        <AppBoot />

        {/* 固定導覽列（HeaderWrapper 內若是 fixed/sticky 都可） */}
        <HeaderWrapper />

        {/**
         * ✅ 手機：預留 Header 高度 + 安全區避免被遮住
         * - 80px 為目前 Header 估計高度（原本 pt-20 = 5rem = 80px）
         * - 若你的 Header 實際高度不同，改動 80px 即可
         */}
        <main className="mx-auto max-w-7xl px-4 md:px-6 pt-[calc(80px+env(safe-area-inset-top))] md:pt-24">
          {children}
        </main>
      </body>
    </html>
  );
}
