// src/lib/store.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ===== Types =====
type DailyTask = { id: string; title: string; points: number; done: boolean };
type WeeklyTask = { id: string; title: string; points: number; target: number; count: number };
type CustomTask = { id: string; title: string; points: number; done: boolean };
type Child = { id: string; name: string };

// 每日快照（跨日時寫入）
type DayLog = {
  dateISO: string;          // e.g. "2025-09-09"
  stars: number;            // 當日完成的星星（來自 daily+custom）
  completed: number;        // 當日完成數（daily.done + custom.done）
  total: number;            // 當日可完成總數（daily.length + custom.length）
};

type StoreState = {
  activeChildId: string;
  children: Child[];

  daily: Record<string, DailyTask[]>;
  weekly: Record<string, WeeklyTask[]>;
  customs: Record<string, CustomTask[]>;

  // resets bookkeeping
  lastDailyResetISO: string | null;
  lastWeeklyResetISO: string | null;

  // 歷史記錄（用於 Home 的「最近 7 天」）
  history: Record<string, DayLog[]>; // key: childId -> 最近 N 天的日誌（保留 60 天）

  // actions
  setActiveChild: (id: string) => void;

  toggleDaily: (childId: string, id: string) => void;
  incWeekly: (childId: string, id: string) => void;
  decWeekly: (childId: string, id: string) => void;
  toggleCustom: (childId: string, id: string) => void;
  addCustom: (childId: string, title: string, points: number) => void;
  removeCustom: (childId: string, id: string) => void;

  // reset actions
  resetDailyForAllChildren: () => void;
  resetWeeklyForAllChildren: () => void;
  ensureResetsNow: () => void; // 檢查是否跨日／跨週，需要就重置＋寫入快照
};

// ===== helpers =====
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function startOfWeekMonday(d: Date) {
  const day = d.getDay(); // 0=Sun,1=Mon,...6=Sat
  const diff = (day === 0 ? -6 : 1 - day);
  const res = new Date(d);
  res.setDate(d.getDate() + diff);
  res.setHours(0, 0, 0, 0);
  return res;
}

function clampHistory(arr: DayLog[], keep = 60): DayLog[] {
  if (arr.length <= keep) return arr;
  return arr.slice(arr.length - keep);
}

export const useAppStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // ===== 初始資料 =====
      activeChildId: "c1",
      children: [
        { id: "c1", name: "小明" },
        { id: "c2", name: "小華" },
      ],
      daily: {
        c1: [
          { id: "d1", title: "刷牙 + 整理書包", points: 2, done: false },
          { id: "d2", title: "閱讀 15 分鐘", points: 3, done: false },
        ],
        c2: [],
      },
      weekly: {
        c1: [
          { id: "w1", title: "打掃房間", points: 5, target: 2, count: 0 },
          { id: "w2", title: "家務（倒垃圾/擦桌）", points: 4, target: 3, count: 0 },
        ],
        c2: [],
      },
      customs: { c1: [], c2: [] },

      lastDailyResetISO: null,
      lastWeeklyResetISO: null,

      history: { c1: [], c2: [] },

      // ===== Actions =====
      setActiveChild: (id) => set({ activeChildId: id }),

      toggleDaily: (childId, id) => {
        const list = get().daily[childId] ?? [];
        set({
          daily: {
            ...get().daily,
            [childId]: list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
          },
        });
      },

      incWeekly: (childId, id) => {
        const list = get().weekly[childId] ?? [];
        set({
          weekly: {
            ...get().weekly,
            [childId]: list.map((t) => (t.id === id ? { ...t, count: t.count + 1 } : t)),
          },
        });
      },

      decWeekly: (childId, id) => {
        const list = get().weekly[childId] ?? [];
        set({
          weekly: {
            ...get().weekly,
            [childId]: list.map((t) => (t.id === id ? { ...t, count: Math.max(0, t.count - 1) } : t)),
          },
        });
      },

      toggleCustom: (childId, id) => {
        const list = get().customs[childId] ?? [];
        set({
          customs: {
            ...get().customs,
            [childId]: list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
          },
        });
      },

      addCustom: (childId, title, points) => {
        const list = get().customs[childId] ?? [];
        set({
          customs: {
            ...get().customs,
            [childId]: [...list, { id: `c${Date.now()}`, title, points, done: false }],
          },
        });
      },

      removeCustom: (childId, id) => {
        const list = get().customs[childId] ?? [];
        set({
          customs: {
            ...get().customs,
            [childId]: list.filter((t) => t.id !== id),
          },
        });
      },

      // ===== Reset + Snapshot =====
      resetDailyForAllChildren: () => {
        const state = get();
        const nextDaily: StoreState["daily"] = {};
        for (const childId of Object.keys(state.daily)) {
          nextDaily[childId] = (state.daily[childId] ?? []).map((t) => ({ ...t, done: false }));
        }
        set({ daily: nextDaily, lastDailyResetISO: toISODate(new Date()) });
      },

      resetWeeklyForAllChildren: () => {
        const state = get();
        const nextWeekly: StoreState["weekly"] = {};
        for (const childId of Object.keys(state.weekly)) {
          nextWeekly[childId] = (state.weekly[childId] ?? []).map((t) => ({ ...t, count: 0 }));
        }
        const monday = startOfWeekMonday(new Date());
        set({ weekly: nextWeekly, lastWeeklyResetISO: toISODate(monday) });
      },

      ensureResetsNow: () => {
        const state = get();
        const now = new Date();
        const todayISO = toISODate(now);

        // === Daily snapshot & reset ===
        if (state.lastDailyResetISO !== todayISO) {
          // 決定要寫入快照的日期：若已經有 lastDailyResetISO，則以它為「昨天」
          // 若為首次啟動（null），就不寫入快照，直接初始化為今天。
          if (state.lastDailyResetISO) {
            const snapshotDateISO = state.lastDailyResetISO;

            const nextHistory: StoreState["history"] = { ...state.history };
            for (const child of state.children) {
              const dList = state.daily[child.id] ?? [];
              const cList = state.customs[child.id] ?? [];

              const completedDaily = dList.filter((t) => t.done);
              const completedCustom = cList.filter((t) => t.done);

              const stars =
                completedDaily.reduce((s, t) => s + t.points, 0) +
                completedCustom.reduce((s, t) => s + t.points, 0);
              const completed = completedDaily.length + completedCustom.length;
              const total = dList.length + cList.length;

              const log: DayLog = {
                dateISO: snapshotDateISO,
                stars,
                completed,
                total,
              };

              const prev = nextHistory[child.id] ?? [];
              nextHistory[child.id] = clampHistory([...prev, log], 60);
            }

            // 先寫入 history，再清空 daily.done
            set({ history: nextHistory });
          }

          // 清空 daily.done，並更新 lastDailyResetISO 為今天
          const nextDaily: StoreState["daily"] = {};
          for (const childId of Object.keys(state.daily)) {
            nextDaily[childId] = (state.daily[childId] ?? []).map((t) => ({ ...t, done: false }));
          }
          set({ daily: nextDaily, lastDailyResetISO: todayISO });
        }

        // === Weekly reset on Monday ===
        const thisMondayISO = toISODate(startOfWeekMonday(now));
        if (state.lastWeeklyResetISO !== thisMondayISO) {
          const nextWeekly: StoreState["weekly"] = {};
          for (const childId of Object.keys(state.weekly)) {
            nextWeekly[childId] = (state.weekly[childId] ?? []).map((t) => ({ ...t, count: 0 }));
          }
          set({ weekly: nextWeekly, lastWeeklyResetISO: thisMondayISO });
        }
      },
    }),
    { name: "famgrow-store" } // localStorage key
  )
);
