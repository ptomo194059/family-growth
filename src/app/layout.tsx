import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import HeaderWrapper from "@/components/HeaderWrapper";
import AppBoot from "@/components/AppBoot"; // ⭐ 新增：引入 AppBoot

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900`}
      >
        {/* ⭐ 啟動器：這個元件不會顯示畫面，只會在背景自動檢查每日/每週是否需要重置 */}
        <AppBoot />

        {/* 固定導覽列 */}
        <HeaderWrapper />

        {/* 主內容（留出 Header 高度，避免被蓋住） */}
        <main className="mx-auto max-w-7xl px-4 md:px-6 pt-20">
          {children}
        </main>
      </body>
    </html>
  );
}
