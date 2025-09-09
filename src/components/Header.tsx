"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Menu } from "lucide-react";

type Child = { id: string; name: string };
type Lang = "zh" | "en";

export default function Header({
  childrenList,
  selectedChildId,
  onChildChange,
  lang,
  onLangChange,
}: {
  childrenList: Child[];
  selectedChildId?: string;
  onChildChange?: (id: string) => void;
  lang: Lang;
  onLangChange?: (lang: Lang) => void;
}) {
  const [today, setToday] = useState("--/--/--");
  useEffect(() => {
    const locale = lang === "zh" ? "zh-TW" : "en-US";
    setToday(new Date().toLocaleDateString(locale));
  }, [lang]);

  const currentChildId = selectedChildId ?? childrenList[0]?.id ?? "";
  const langLabel = useMemo(() => (lang === "zh" ? "中文" : "English"), [lang]);

  // ✅ 新版選單
  const navItems = [
    { href: "/", label: "Home" },
    { href: "/tasks", label: "Tasks" },
    { href: "/rewards", label: "Rewards" },
    { href: "/shop", label: "Shop" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="h-14 flex items-center justify-between gap-3">
          {/* 左側 Logo */}
          <Link href="/" className="shrink-0 select-none">
            <span className="text-2xl font-extrabold tracking-wide text-gray-900">
              FamGrow
            </span>
          </Link>

          {/* 中間頁籤（桌機版） */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-800">
            {navItems.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="hover:underline underline-offset-4"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {/* 右側功能 */}
          <div className="flex items-center gap-3">
            {/* 小孩選擇 */}
            <select
              className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm"
              value={currentChildId}
              onChange={(e) => onChildChange?.(e.target.value)}
            >
              {childrenList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* 日期 */}
            <span className="hidden sm:inline-block text-xs md:text-sm text-gray-600 tabular-nums">
              {today}
            </span>

            {/* 語言切換 */}
            <select
              className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm"
              value={lang}
              onChange={(e) => onLangChange?.(e.target.value as Lang)}
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>

            {/* 手機版選單按鈕 */}
            <button
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>

        {/* 手機版頁籤 */}
        <nav className="md:hidden flex items-center gap-4 py-2 text-sm font-semibold text-gray-800 overflow-x-auto">
          {navItems.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap">
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
