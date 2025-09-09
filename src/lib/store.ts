// src/lib/store.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** ===== Types ===== */
type DailyTask = { id: string; title: string; points: number; done: boolean };
type WeeklyTask = { id: string; title: string; points: number; target: number; count: number };
type Child = { id: string; name: string };

// 每日快照（跨日時寫入）
type DayLog = {
  dateISO: string;   // e.g. "2025-09-09"
  stars: number;     // 當日完成的星星（daily + weekly 當日貢獻）
  completed: number; // 當日完成數（daily.done）
  total: number;     // 當日可完成總數（daily.length）
};

type StoreState = {
  /** Core data */
  activeChildId: string;
  children: Child[];
  daily: Record<string, DailyTask[]>;
  weekly: Record<string, WeeklyTask[]>;

  /** Wallet */
  balances: Record<string, number>;

  /** Weekly stars contribution for "today" (used by Home history) */
  todayWeeklyStars: Record<string, number>;

  /** Rewards config（之後可在 Settings 編輯） */
  dailyFullCompleteReward: Record<string, number>;  // 每日全部完成獎勵 $$
  weeklyFullCompleteReward: Record<string, number>; // 每週全部達標獎勵 $$

  /** Rewards claim bookkeeping（避免重複發放，且可在同期間撤回） */
  dailyRewardClaimedToday: Record<string, boolean>;
  weeklyRewardClaimedThisWeek: Record<string, boolean>;
  dailyRewardPayoutToday: Record<string, number>;   // 今日實際發放金額（撤回用）
  weeklyRewardPayoutThisWeek: Record<string, number>;

  /** resets bookkeeping */
  lastDailyResetISO: string | null;   // e.g. "2025-09-09"
  lastWeeklyResetISO: string | null;  // 週一 e.g. "2025-09-08"

  /** History for Home chart */
  history: Record<string, DayLog[]>; // 保留最近 60 天

  /** actions */
  setActiveChild: (id: string) => void;

  // tasks ops
  toggleDaily: (childId: string, id: string) => void;
  incWeekly: (childId: string, id: string) => void;
  decWeekly: (childId: string, id: string) => void;

  // reward setters（供未來 Settings 使用）
  setDailyReward: (childId: string, amount: number) => void;
  setWeeklyReward: (childId: string, amount: number) => void;

  // resets
  resetDailyForAllChildren: () => void;
  resetWeeklyForAllChildren: () => void;
  ensureResetsNow: () => void; // 啟動/每分鐘檢查，做快照＋重置
};

/** ===== helpers ===== */
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function startOfWeekMonday(d: Date) {
  const day = d.getDay(); // 0=Sun,1=Mon,...6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const res = new Date(d);
  res.setDate(d.getDate() + diff);
  res.setHours(0, 0, 0, 0);
  return res;
}
function clampHistory<T>(arr: T[], keep = 60) {
  return arr.length <= keep ? arr : arr.slice(arr.length - keep);
}

/** 判斷是否「每日全部完成」 */
function isDailyFullyCompleted(daily: DailyTask[]) {
  if (!daily || daily.length === 0) return false;
  return daily.every((t) => t.done);
}
/** 判斷是否「每週全部達標」（全部 weekly.count >= target 且至少有一個任務） */
function isWeeklyFullyCompleted(weekly: WeeklyTask[]) {
  if (!weekly || weekly.length === 0) return false;
  return weekly.every((t) => t.count >= Math.max(1, t.target));
}

/** ===== store ===== */
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

      balances: { c1: 0, c2: 0 },

      todayWeeklyStars: { c1: 0, c2: 0 },

      // 預設獎勵金額（之後可在 Settings 編輯）
      dailyFullCompleteReward: { c1: 20, c2: 20 },
      weeklyFullCompleteReward: { c1: 50, c2: 50 },

      dailyRewardClaimedToday: { c1: false, c2: false },
      weeklyRewardClaimedThisWeek: { c1: false, c2: false },
      dailyRewardPayoutToday: { c1: 0, c2: 0 },
      weeklyRewardPayoutThisWeek: { c1: 0, c2: 0 },

      lastDailyResetISO: null,
      lastWeeklyResetISO: null,

      history: { c1: [], c2: [] },

      // ===== Actions =====
      setActiveChild: (id) => set({ activeChildId: id }),

      toggleDaily: (childId, id) => {
        const s = get();
        const list = s.daily[childId] ?? [];
        const updated = list.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
        set({ daily: { ...s.daily, [childId]: updated } });

        // 檢查是否達「每日全部完成」→ 發/收回 獎勵
        const nowAll = isDailyFullyCompleted(updated);
        const claimed = s.dailyRewardClaimedToday[childId] ?? false;
        const reward = s.dailyFullCompleteReward[childId] ?? 0;
        const bal = s.balances[childId] ?? 0;

        if (nowAll && !claimed) {
          // 發放
          set({
            balances: { ...s.balances, [childId]: bal + reward },
            dailyRewardClaimedToday: { ...s.dailyRewardClaimedToday, [childId]: true },
            dailyRewardPayoutToday: { ...s.dailyRewardPayoutToday, [childId]: reward },
          });
        } else if (!nowAll && claimed) {
          // 撤回
          const payout = s.dailyRewardPayoutToday[childId] ?? 0;
          set({
            balances: { ...s.balances, [childId]: Math.max(0, bal - payout) },
            dailyRewardClaimedToday: { ...s.dailyRewardClaimedToday, [childId]: false },
            dailyRewardPayoutToday: { ...s.dailyRewardPayoutToday, [childId]: 0 },
          });
        }
      },

      incWeekly: (childId, id) => {
        const s = get();
        const list = s.weekly[childId] ?? [];
        const updated = list.map((t) => (t.id === id ? { ...t, count: t.count + 1 } : t));
        set({
          weekly: { ...s.weekly, [childId]: updated },
          // 今日 weekly 星星增加（供 Home 圖表使用）
          todayWeeklyStars: {
            ...s.todayWeeklyStars,
            [childId]: (s.todayWeeklyStars[childId] ?? 0) + (list.find((t) => t.id === id)?.points ?? 0),
          },
        });

        // 檢查是否達「每週全部達標」→ 發獎勵（收回邏輯在 decWeekly）
        const nowAll = isWeeklyFullyCompleted(updated);
        const claimed = s.weeklyRewardClaimedThisWeek[childId] ?? false;
        const reward = s.weeklyFullCompleteReward[childId] ?? 0;
        const bal = s.balances[childId] ?? 0;

        if (nowAll && !claimed) {
          set({
            balances: { ...s.balances, [childId]: bal + reward },
            weeklyRewardClaimedThisWeek: { ...s.weeklyRewardClaimedThisWeek, [childId]: true },
            weeklyRewardPayoutThisWeek: { ...s.weeklyRewardPayoutThisWeek, [childId]: reward },
          });
        }
      },

      decWeekly: (childId, id) => {
        const s = get();
        const list = s.weekly[childId] ?? [];
        const task = list.find((t) => t.id === id);
        const updated = list.map((t) => (t.id === id ? { ...t, count: Math.max(0, t.count - 1) } : t));
        set({
          weekly: { ...s.weekly, [childId]: updated },
          todayWeeklyStars: {
            ...s.todayWeeklyStars,
            [childId]: Math.max(0, (s.todayWeeklyStars[childId] ?? 0) - (task?.points ?? 0)),
          },
        });

        // 若調整後「不再全部達標」且之前已領 → 撤回該週獎勵
        const nowAll = isWeeklyFullyCompleted(updated);
        const claimed = s.weeklyRewardClaimedThisWeek[childId] ?? false;
        if (!nowAll && claimed) {
          const reward = s.weeklyRewardPayoutThisWeek[childId] ?? 0;
          const bal = s.balances[childId] ?? 0;
          set({
            balances: { ...s.balances, [childId]: Math.max(0, bal - reward) },
            weeklyRewardClaimedThisWeek: { ...s.weeklyRewardClaimedThisWeek, [childId]: false },
            weeklyRewardPayoutThisWeek: { ...s.weeklyRewardPayoutThisWeek, [childId]: 0 },
          });
        }
      },

      setDailyReward: (childId, amount) =>
        set((s) => ({
          dailyFullCompleteReward: { ...s.dailyFullCompleteReward, [childId]: Math.max(0, Math.floor(amount)) },
        })),
      setWeeklyReward: (childId, amount) =>
        set((s) => ({
          weeklyFullCompleteReward: { ...s.weeklyFullCompleteReward, [childId]: Math.max(0, Math.floor(amount)) },
        })),

      // ===== Resets（手動）=====
      resetDailyForAllChildren: () => {
        const s = get();
        const nextDaily: StoreState["daily"] = {};
        for (const childId of Object.keys(s.daily)) {
          nextDaily[childId] = (s.daily[childId] ?? []).map((t) => ({ ...t, done: false }));
        }
        set({
          daily: nextDaily,
          todayWeeklyStars: Object.fromEntries(Object.keys(s.todayWeeklyStars).map((k) => [k, 0])),
          dailyRewardClaimedToday: Object.fromEntries(Object.keys(s.dailyRewardClaimedToday).map((k) => [k, false])),
          dailyRewardPayoutToday: Object.fromEntries(Object.keys(s.dailyRewardPayoutToday).map((k) => [k, 0])),
          lastDailyResetISO: toISODate(new Date()),
        });
      },

      resetWeeklyForAllChildren: () => {
        const s = get();
        const nextWeekly: StoreState["weekly"] = {};
        for (const childId of Object.keys(s.weekly)) {
          nextWeekly[childId] = (s.weekly[childId] ?? []).map((t) => ({ ...t, count: 0 }));
        }
        const monday = startOfWeekMonday(new Date());
        set({
          weekly: nextWeekly,
          weeklyRewardClaimedThisWeek: Object.fromEntries(Object.keys(s.weeklyRewardClaimedThisWeek).map((k) => [k, false])),
          weeklyRewardPayoutThisWeek: Object.fromEntries(Object.keys(s.weeklyRewardPayoutThisWeek).map((k) => [k, 0])),
          lastWeeklyResetISO: toISODate(monday),
        });
      },

      // ===== ensureResetsNow（啟動/每分鐘由 AppBoot 呼叫）=====
      ensureResetsNow: () => {
        const s = get();
        const now = new Date();
        const todayISO = toISODate(now);

        // === Daily snapshot & reset ===
        if (s.lastDailyResetISO !== todayISO) {
          if (s.lastDailyResetISO) {
            const snapshotDateISO = s.lastDailyResetISO;

            const nextHistory: StoreState["history"] = { ...s.history };
            for (const child of s.children) {
              const dList = s.daily[child.id] ?? [];
              const weeklyStars = s.todayWeeklyStars[child.id] ?? 0;

              const completedDaily = dList.filter((t) => t.done);

              const stars =
                completedDaily.reduce((sum, t) => sum + t.points, 0) +
                weeklyStars;

              const completed = completedDaily.length;
              const total = dList.length;

              const log: DayLog = { dateISO: snapshotDateISO, stars, completed, total };
              const prev = nextHistory[child.id] ?? [];
              nextHistory[child.id] = clampHistory([...prev, log], 60);
            }
            set({ history: nextHistory });
          }

          // 清空當日：daily.done、todayWeeklyStars、每日獎勵旗標/金額
          const nextDaily: StoreState["daily"] = {};
          for (const childId of Object.keys(s.daily)) {
            nextDaily[childId] = (s.daily[childId] ?? []).map((t) => ({ ...t, done: false }));
          }
          set({
            daily: nextDaily,
            todayWeeklyStars: Object.fromEntries(Object.keys(s.todayWeeklyStars).map((k) => [k, 0])),
            dailyRewardClaimedToday: Object.fromEntries(Object.keys(s.dailyRewardClaimedToday).map((k) => [k, false])),
            dailyRewardPayoutToday: Object.fromEntries(Object.keys(s.dailyRewardPayoutToday).map((k) => [k, 0])),
            lastDailyResetISO: todayISO,
          });
        }

        // === Weekly reset on Monday ===
        const thisMondayISO = toISODate(startOfWeekMonday(now));
        if (s.lastWeeklyResetISO !== thisMondayISO) {
          const nextWeekly: StoreState["weekly"] = {};
          for (const childId of Object.keys(s.weekly)) {
            nextWeekly[childId] = (s.weekly[childId] ?? []).map((t) => ({ ...t, count: 0 }));
          }
          set({
            weekly: nextWeekly,
            weeklyRewardClaimedThisWeek: Object.fromEntries(Object.keys(s.weeklyRewardClaimedThisWeek).map((k) => [k, false])),
            weeklyRewardPayoutThisWeek: Object.fromEntries(Object.keys(s.weeklyRewardPayoutThisWeek).map((k) => [k, 0])),
            lastWeeklyResetISO: thisMondayISO,
          });
        }
      },
    }),
    { name: "famgrow-store" }
  )
);
