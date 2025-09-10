"use client";

import { useEffect, useMemo } from "react";
import { Coins, Star, CalendarDays, TrendingUp, Wallet } from "lucide-react";
import { useAppStore } from "@/lib/store";
import dynamic from "next/dynamic";

// Recharts 動態載入（避免 SSR）
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const toYearMonth = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

export default function HomePage() {
  const childId = useAppStore((s) => s.activeChildId);
  const ensureResetsNow = useAppStore((s) => s.ensureResetsNow);

  const balance = useAppStore((s) => s.balances[childId] ?? 0);
  const starWallet = useAppStore((s) => s.starWallet?.[childId] ?? 0);
  const daily = useAppStore((s) => s.daily[childId] ?? []);
  const todayWeeklyStars = useAppStore((s) => s.todayWeeklyStars[childId] ?? 0);
  const history = useAppStore((s) => s.history[childId] ?? []);
  const monthSpentMap = useAppStore((s) => s.monthSpent[childId] ?? {});

  useEffect(() => {
    ensureResetsNow();
  }, [ensureResetsNow]);

  // 今日星星（daily 完成 + weekly 今日）
  const todayStars = useMemo(() => {
    const dailyStars = daily.filter((t) => t.done).reduce((sum, t) => sum + t.points, 0);
    return dailyStars + todayWeeklyStars;
  }, [daily, todayWeeklyStars]);

  // 連續達標天數（stars>0）
  const streak = useMemo(() => {
    const today = new Date();
    const todayISO = toISODate(today);
    const logs = [
      ...history,
      { dateISO: todayISO, stars: todayStars, completed: 0, total: 0 },
    ];
    const map = new Map(logs.map((l) => [l.dateISO, l.stars]));
    let count = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = toISODate(d);
      const s = map.get(iso) ?? 0;
      if (s > 0) count++;
      else break;
    }
    return count;
  }, [history, todayStars]);

  // 最近 7 天資料（含今天，自動偵測日期）
  const chartData = useMemo(() => {
    const map = new Map(history.map((h) => [h.dateISO, h.stars]));
    const out: { date: string; stars: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = toISODate(d);
      const label = `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
      const stars = (i === 0 ? todayStars : (map.get(key) ?? 0));
      out.push({ date: label, stars });
    }
    return out;
  }, [history, todayStars]);

  // 本月已花（以抽卡與用錢購買為主）
  const ym = toYearMonth(new Date());
  const monthSpent = monthSpentMap[ym] ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🏠 Home</h1>

      {/* Top cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 星星（今日） */}
        <div className="p-4 bg-white rounded-2xl shadow flex items-center gap-3">
          <div className="p-2 rounded-xl bg-yellow-50">
            <Star className="text-yellow-600" />
          </div>
          <div>
            <div className="text-sm text-gray-500">今日星星</div>
            <div className="text-xl font-semibold">{todayStars}</div>
          </div>
        </div>

        {/* 星星錢包（可消耗） */}
        <div className="p-4 bg-white rounded-2xl shadow flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-50">
            <Star className="text-amber-600" />
          </div>
          <div>
            <div className="text-sm text-gray-500">星星錢包</div>
            <div className="text-xl font-semibold">{starWallet} ⭐</div>
            <div className="text-[11px] text-gray-400">可在 Shop 兌換或換現金</div>
          </div>
        </div>

        {/* 餘額 */}
        <div className="p-4 bg-white rounded-2xl shadow flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-50">
            <Wallet className="text-emerald-600" />
          </div>
          <div>
            <div className="text-sm text-gray-500">餘額</div>
            <div className="text-xl font-semibold">${balance}</div>
          </div>
        </div>

        {/* 本月已花 */}
        <div className="p-4 bg-white rounded-2xl shadow flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-50">
            <Coins className="text-rose-600" />
          </div>
          <div>
            <div className="text-sm text-gray-500">本月已花</div>
            <div className="text-xl font-semibold">${monthSpent}</div>
            <div className="text-[11px] text-gray-400">含抽卡與用錢購買</div>
          </div>
        </div>

        {/* 連續達標天數 */}
        <div className="p-4 bg-white rounded-2xl shadow flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50">
            <CalendarDays className="text-blue-600" />
          </div>
          <div>
            <div className="text-sm text-gray-500">連續達標天數</div>
            <div className="text-xl font-semibold">{streak} 天</div>
          </div>
        </div>

        {/* 最近 7 天總星星（小統計） */}
        <div className="p-4 bg-white rounded-2xl shadow flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gray-50">
            <TrendingUp className="text-gray-600" />
          </div>
          <div>
            <div className="text-sm text-gray-500">最近 7 天星星</div>
            <div className="text-xl font-semibold">
              {chartData.reduce((s, d) => s + d.stars, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 bg-white rounded-2xl shadow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">最近 7 天完成紀錄</h2>
          <div className="text-xs text-gray-500">（自動依日期偵測）</div>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="stars" radius={[6, 6, 0, 0]} fill="#E5E7EB" /> {/* 淡灰色 */}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
