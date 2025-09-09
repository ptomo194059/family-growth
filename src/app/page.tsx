"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Star, Wallet, ShoppingCart, Flame } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useMemo } from "react";

// 日期工具
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export default function HomePage() {
  const childId = useAppStore((s) => s.activeChildId);
  const daily = useAppStore((s) => s.daily[childId] ?? []);
  const customs = useAppStore((s) => s.customs[childId] ?? []);
  const history = useAppStore((s) => s.history[childId] ?? []);

  // 今日即時計算
  const todayStars = useMemo(() => {
    const dailyEarned = daily.filter((t) => t.done).reduce((s, t) => s + t.points, 0);
    const customEarned = customs.filter((t) => t.done).reduce((s, t) => s + t.points, 0);
    return dailyEarned + customEarned;
  }, [daily, customs]);

  // （暫時）餘額／本月已花
  const balance = 560;
  const spentThisMonth = 240;

  // 最近 7 天資料
  const today = new Date();
  const last7Data = useMemo(() => {
    const map = new Map(history.map((h) => [h.dateISO, h.stars]));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const iso = toISODate(d);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const isToday = iso === toISODate(today);
      const stars = isToday ? todayStars : map.get(iso) ?? 0;
      return { date: label, stars };
    });
  }, [history, todayStars]);

  // 連續達標天數
  const streak = useMemo(() => {
    let count = 0;
    const todayISO = toISODate(today);
    const allLogs = [
      ...history.map((h) => ({ dateISO: h.dateISO, stars: h.stars })),
      { dateISO: todayISO, stars: todayStars },
    ];
    const logMap = new Map(allLogs.map((h) => [h.dateISO, h.stars]));
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = toISODate(d);
      const stars = logMap.get(iso) ?? 0;
      if (stars > 0) count++;
      else break;
    }
    return count;
  }, [history, todayStars]);

  const maxStars = Math.max(5, ...last7Data.map((d) => d.stars));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🏠 Home Dashboard</h1>

      {/* 四個統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl shadow flex flex-col items-start">
          <div className="flex items-center gap-2 text-yellow-500 mb-2">
            <Star size={20} />
            <p className="text-sm text-gray-500">今日星星</p>
          </div>
          <p className="text-2xl font-bold text-yellow-500">{todayStars}</p>
        </div>

        <div className="p-4 bg-white rounded-2xl shadow flex flex-col items-start">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <Wallet size={20} />
            <p className="text-sm text-gray-500">餘額</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{balance}</p>
        </div>

        <div className="p-4 bg-white rounded-2xl shadow flex flex-col items-start">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <ShoppingCart size={20} />
            <p className="text-sm text-gray-500">本月已花</p>
          </div>
          <p className="text-2xl font-bold text-red-500">{spentThisMonth}</p>
        </div>

        <div className="p-4 bg-white rounded-2xl shadow flex flex-col items-start">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Flame size={20} />
            <p className="text-sm text-gray-500">連續達標天數</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{streak}</p>
        </div>
      </div>

      {/* 最近 7 天紀錄（星星數 長條圖） */}
      <div className="p-4 bg-white rounded-2xl shadow">
        <p className="text-sm text-gray-500 mb-2">最近 7 天星星數</p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7Data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis
                domain={[0, maxStars]}
                allowDecimals={false}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip
                formatter={(value) => [`${value} ★`, "星星"]}
                labelFormatter={(label) => `日期：${label}`}
              />
              {/* 改成淡灰色 bar */}
              <Bar dataKey="stars" fill="#d1d5db" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
