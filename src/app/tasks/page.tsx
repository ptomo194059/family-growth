"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Plus, Minus, Star, Trophy, Gift } from "lucide-react";
import { useAppStore } from "@/lib/store";

type FilterKey = "all" | "done" | "todo";

export default function TasksPage() {
  const childId = useAppStore((s) => s.activeChildId);
  const daily = useAppStore((s) => s.daily[childId] ?? []);
  const weekly = useAppStore((s) => s.weekly[childId] ?? []);
  const balance = useAppStore((s) => s.balances[childId] ?? 0);

  const toggleDaily = useAppStore((s) => s.toggleDaily);
  const incWeekly = useAppStore((s) => s.incWeekly);
  const decWeekly = useAppStore((s) => s.decWeekly);

  const dailyReward = useAppStore((s) => s.dailyFullCompleteReward[childId] ?? 0);
  const weeklyReward = useAppStore((s) => s.weeklyFullCompleteReward[childId] ?? 0);
  const dailyClaimed = useAppStore((s) => s.dailyRewardClaimedToday[childId] ?? false);
  const weeklyClaimed = useAppStore((s) => s.weeklyRewardClaimedThisWeek[childId] ?? false);

  const [dailyFilter, setDailyFilter] = useState<FilterKey>("all");

  // 統計
  const dailyEarned = useMemo(() => daily.filter(t => t.done).reduce((s, t) => s + t.points, 0), [daily]);
  const weeklyEarned = useMemo(() => weekly.reduce((s, t) => s + t.count * t.points, 0), [weekly]);
  const todayStars = dailyEarned + weeklyEarned;

  const dailyDoneCount = daily.filter(t => t.done).length;
  const dailyTotal = daily.length;

  // 完成判定（供 UI 顯示）
  const allDailyDone = dailyTotal > 0 && dailyDoneCount === dailyTotal;
  const allWeeklyMet = weekly.length > 0 && weekly.every(t => t.count >= Math.max(1, t.target));

  const filteredDaily = useMemo(() => {
    switch (dailyFilter) {
      case "done": return daily.filter(t => t.done);
      case "todo": return daily.filter(t => !t.done);
      default: return daily;
    }
  }, [daily, dailyFilter]);

  return (
    <div className="space-y-6">
      {/* 頁面標題 + 統計 + 餘額 */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">✅ Tasks</h1>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-white shadow flex items-center gap-2">
            <Star size={18} className="text-yellow-500" />
            <span className="text-sm text-gray-500">今日星星</span>
            <span className="font-bold text-yellow-600">{todayStars}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white shadow flex items-center gap-2">
            <span className="text-sm text-gray-500">每日完成</span>
            <span className="font-bold">{dailyDoneCount}/{dailyTotal}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white shadow flex items-center gap-2">
            <Trophy size={18} className="text-emerald-600" />
            <span className="text-sm text-gray-500">餘額</span>
            <span className="font-bold text-emerald-700">${balance}</span>
          </div>
        </div>
      </div>

      {/* 每日完成獎勵狀態 */}
      <div className={`p-3 rounded-xl border ${allDailyDone ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
        <div className="flex items-center gap-2">
          <Gift size={18} className={allDailyDone ? "text-emerald-600" : "text-gray-500"} />
          <p className="text-sm">
            每日全數完成獎勵：<span className="font-semibold">${dailyReward}</span>（
            {dailyTotal === 0 ? "尚未設定每日任務" : allDailyDone ? (dailyClaimed ? "已領取" : "達標，將自動發放") : "未達成"}）
          </p>
        </div>
      </div>

      {/* 每日任務 */}
      <section className="p-4 bg-white rounded-2xl shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">每日任務</h2>
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => setDailyFilter("all")}  className={`px-2 py-1 rounded ${dailyFilter === "all"  ? "bg-gray-900 text-white" : "bg-gray-100"}`}>全部</button>
            <button onClick={() => setDailyFilter("todo")} className={`px-2 py-1 rounded ${dailyFilter === "todo" ? "bg-gray-900 text-white" : "bg-gray-100"}`}>未完成</button>
            <button onClick={() => setDailyFilter("done")} className={`px-2 py-1 rounded ${dailyFilter === "done" ? "bg-gray-900 text-white" : "bg-gray-100"}`}>已完成</button>
          </div>
        </div>

        <ul className="space-y-2">
          {filteredDaily.map((t: any) => (
            <li key={t.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
              <button
                onClick={() => toggleDaily(childId, t.id)}
                className="flex items-center gap-3"
                aria-label={t.done ? "取消完成" : "標記完成"}
              >
                {t.done ? <CheckCircle2 className="text-green-600" size={22} /> : <Circle className="text-gray-400" size={22} />}
                <span className={`text-sm md:text-base ${t.done ? "line-through text-gray-400" : "text-gray-800"}`}>{t.title}</span>
              </button>
              <span className="text-xs md:text-sm font-semibold text-yellow-700 bg-yellow-100 rounded-full px-2 py-1">+{t.points}★</span>
            </li>
          ))}
          {filteredDaily.length === 0 && <li className="text-sm text-gray-500">沒有符合條件的任務。</li>}
        </ul>
      </section>

      {/* 每週完成獎勵狀態 */}
      <div className={`p-3 rounded-xl border ${allWeeklyMet ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
        <div className="flex items-center gap-2">
          <Gift size={18} className={allWeeklyMet ? "text-emerald-600" : "text-gray-500"} />
          <p className="text-sm">
            每週全部達標獎勵：<span className="font-semibold">${weeklyReward}</span>（
            {weekly.length === 0 ? "尚未設定每週任務" : allWeeklyMet ? (weeklyClaimed ? "已領取" : "達標，將自動發放") : "未達成"}）
          </p>
        </div>
      </div>

      {/* 每週任務 */}
      <section className="p-4 bg-white rounded-2xl shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">每週任務</h2>
          <p className="text-sm text-gray-500">點擊 + / − 調整本週完成次數</p>
        </div>

        <ul className="space-y-2">
          {weekly.map((t: any) => {
            const progress = Math.min(100, Math.round((t.count / Math.max(1, t.target)) * 100));
            return (
              <li key={t.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm md:text-base text-gray-800 truncate">{t.title}</p>
                    <div className="mt-2 h-2 w-full bg-white rounded-full overflow-hidden">
                      <div className={`h-full ${progress >= 100 ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">進度 {t.count}/{t.target}（每次 +{t.points}★）</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <button onClick={() => decWeekly(childId, t.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white border" aria-label="minus">
                      <Minus size={16} />
                    </button>
                    <span className="w-10 text-center font-semibold tabular-nums">{t.count}</span>
                    <button onClick={() => incWeekly(childId, t.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white border" aria-label="plus">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
          {weekly.length === 0 && <li className="text-sm text-gray-500">目前沒有每週任務。</li>}
        </ul>
      </section>

      <p className="text-xs text-gray-500">
        ※ 每日全數完成 / 每週全部達標 會自動發放一筆獎勵到餘額；若同日/同週撤回進度，獎勵會自動扣回。跨日/週一將自動重置旗標。
      </p>
    </div>
  );
}
