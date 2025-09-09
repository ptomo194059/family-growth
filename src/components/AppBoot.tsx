// src/components/AppBoot.tsx
"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export default function AppBoot() {
  const ensureResetsNow = useAppStore((s) => s.ensureResetsNow);

  useEffect(() => {
    // 啟動時檢查一次
    ensureResetsNow();

    // 每 60 秒檢查一次，避免使用者長時間停留頁面錯過 00:00/週一
    const id = setInterval(() => {
      ensureResetsNow();
    }, 60 * 1000);

    return () => clearInterval(id);
  }, [ensureResetsNow]);

  return null;
}
