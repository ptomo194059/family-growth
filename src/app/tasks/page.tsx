"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Plus, Minus, Star, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";

type FilterKey = "all" | "done" | "todo";

export default function TasksPage() {
  // === 全域狀態 ===
  const childId = useAppStore((s) => s.activeChildId);
  const daily = useAppStore((s) => s.daily[childId] ?? []);
  const weekly = useAppStore((s) => s.weekly[childId] ?? []);
  const customs = useAppStore((s) => s.customs[childId] ?? []);

  const toggleDaily = useAppStore((s) => s.toggleDaily);
  const incWeekly = useAppStore((s) => s.incWeekly);
  const decWeekly = useAppStore((s) => s.decWeekly);
  const toggleCustom = useAppStore((s) => s.toggleCustom);
  const addCustom = useAppStore((s) => s.addCustom);
  const removeCustom = useAppStore((s) => s.removeCustom);

  // === 篩選 / 新增任務 表單狀態 ===
  const [dailyFilter, setDailyFilter] = useState<FilterKey>("all");
  const [customFilter, setCustomFilter] = useState<FilterKey>("all");
  const [newTitle, setNewTitle] = useState("");
  const [newPoints, setNewPoints] = useState<number>(3);

  // === 衍生資料（統計）===
  const dailyEarned = useMemo(
    () => daily.filter(t => t.done).reduce((s: number, t: any) => s + t.points, 0),
    [daily]
  );
  const weeklyEarned = useMemo(
    () => weekly.reduce((s: number, t: any) => s + t.count * t.points, 0),
    [weekly]
  );
  const customEarned = useMemo(
    () => customs.filter(t => t.done).reduce((s: number, t: any) => s + t.points, 0),
    [customs]
  );
  const todayStars = dailyEarned + weeklyEarned + customEarned;

  const dailyDoneCount = daily.filter((t: any) => t.done).length;
  const dailyTotal = daily.length;

  const filteredDaily = useMemo(() => {
    switch (dailyFilter) {
      case "done": return daily.filter((t: any) => t.done);
      case "todo": return daily.filter((t: any) => !t.done);
      default: return daily;
    }
  }, [daily, dailyFilter]);

  const filteredCustoms = useMemo(() => {
    switch (customFilter) {
      case "done": return customs.filter((t: any) => t.done);
      case "todo": return customs.filter((t: any) => !t.done);
      default: return customs;
    }
  }, [customs, customFilter]);

  // === 事件處理 ===
  const onAddCustom = () => {
    const title = newTitle.trim();
    const pts = Number(newPoints);
    if (!title || isNaN(pts) || pts <= 0) return;
    addCustom(childId, title, Math.min(pts, 99));
    setNewTitle("");
    setNewPoints(3);
  };

  return (
    <div className="space-y-6">
      {/* 頁面標題 + 今日統計 */}
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
        </div>
      </div>

      {/* 每日任務 */}
      <section className="p-4 bg-white rounded-2xl shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">每日任務</h2>
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setDailyFilter("all")}
              className={`px-2 py-1 rounded ${dailyFilter === "all" ? "bg-gray-900 text-white" : "bg-gray-100"}`}
            >全部</button>
            <button
              onClick={() => setDailyFilter("todo")}
              className={`px-2 py-1 rounded ${dailyFilter === "todo" ? "bg-gray-900 text-white" : "bg-gray-100"}`}
            >未完成</button>
            <button
              onClick={() => setDailyFilter("done")}
              className={`px-2 py-1 rounded ${dailyFilter === "done" ? "bg-gray-900 text-white" : "bg-gray-100"}`}
            >已完成</button>
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
                {t.done ? (
                  <CheckCircle2 className="text-green-600" size={22} />
                ) : (
                  <Circle className="text-gray-400" size={22} />
                )}
                <span className={`text-sm md:text-base ${t.done ? "line-through text-gray-400" : "text-gray-800"}`}>
                  {t.title}
                </span>
              </button>
              <span className="text-xs md:text-sm font-semibold text-yellow-700 bg-yellow-100 rounded-full px-2 py-1">
                +{t.points}★
              </span>
            </li>
          ))}
          {filteredDaily.length === 0 && (
            <li className="text-sm text-gray-500">沒有符合條件的任務。</li>
          )}
        </ul>
      </section>

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
                      <div
                        className={`h-full ${progress >= 100 ? "bg-green-500" : "bg-blue-500"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      進度 {t.count}/{t.target}（每次 +{t.points}★）
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => decWeekly(childId, t.id)}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white border"
                      aria-label="minus"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-10 text-center font-semibold tabular-nums">{t.count}</span>
                    <button
                      onClick={() => incWeekly(childId, t.id)}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white border"
                      aria-label="plus"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
          {weekly.length === 0 && (
            <li className="text-sm text-gray-500">目前沒有每週任務。</li>
          )}
        </ul>
      </section>

      {/* 自訂任務 */}
      <section className="p-4 bg-white rounded-2xl shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">自訂任務</h2>
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setCustomFilter("all")}
              className={`px-2 py-1 rounded ${customFilter === "all" ? "bg-gray-900 text-white" : "bg-gray-100"}`}
            >全部</button>
            <button
              onClick={() => setCustomFilter("todo")}
              className={`px-2 py-1 rounded ${customFilter === "todo" ? "bg-gray-900 text-white" : "bg-gray-100"}`}
            >未完成</button>
            <button
              onClick={() => setCustomFilter("done")}
              className={`px-2 py-1 rounded ${customFilter === "done" ? "bg-gray-900 text-white" : "bg-gray-100"}`}
            >已完成</button>
          </div>
        </div>

        {/* 新增列 */}
        <div className="mb-3 flex items-center gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="輸入任務名稱"
            className="flex-1 h-10 rounded-lg border px-3 bg-gray-50"
          />
          <input
            type="number"
            min={1}
            max={99}
            value={newPoints}
            onChange={(e) => setNewPoints(Number(e.target.value))}
            className="w-24 h-10 rounded-lg border px-3 bg-gray-50"
            placeholder="星星"
            title="完成可得星星數"
          />
          <button
            onClick={onAddCustom}
            className="h-10 px-3 rounded-lg bg-gray-900 text-white inline-flex items-center gap-2"
          >
            <Plus size={16} /> 新增
          </button>
        </div>

        <ul className="space-y-2">
          {filteredCustoms.map((t: any) => (
            <li key={t.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
              <button
                onClick={() => toggleCustom(childId, t.id)}
                className="flex items-center gap-3"
                aria-label={t.done ? "取消完成" : "標記完成"}
              >
                {t.done ? (
                  <CheckCircle2 className="text-green-600" size={22} />
                ) : (
                  <Circle className="text-gray-400" size={22} />
                )}
                <span className={`text-sm md:text-base ${t.done ? "line-through text-gray-400" : "text-gray-800"}`}>
                  {t.title}
                </span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-semibold text-yellow-700 bg-yellow-100 rounded-full px-2 py-1">
                  +{t.points}★
                </span>
                <button
                  onClick={() => removeCustom(childId, t.id)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white border"
                  aria-label="刪除"
                  title="刪除此任務"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
          {filteredCustoms.length === 0 && (
            <li className="text-sm text-gray-500">沒有符合條件的自訂任務。</li>
          )}
        </ul>
      </section>

      <p className="text-xs text-gray-500">
        ※ 提示：資料已使用 Zustand + localStorage 持久化，並依「Header 的小孩選擇」切換不同孩子的任務。
      </p>
    </div>
  );
}
