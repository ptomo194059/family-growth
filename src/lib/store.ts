// src/lib/store.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_MONEY_ITEMS, DEFAULT_STAR_ITEMS, type MoneyItem, type StarItem } from "./shop.config";

/** ===== Types ===== */
export type DailyTask = { id: string; title: string; points: number; done: boolean };
export type WeeklyTask = { id: string; title: string; points: number; target: number; count: number };
type Child = { id: string; name: string };

type DayLog = {
  dateISO: string;
  stars: number;
  completed: number;
  total: number;
};

export type Rarity = "N" | "R" | "SR" | "SSR";
export type RewardCard = {
  id: string;
  name: string;
  rarity: Rarity;
  weight: number;
  icon?: string;
};

export type OwnedCard = { cardId: string; ownedAt: number };

export type Badge = {
  id: string;
  title: string;
  icon?: string;
  earnedAt: number;
  description?: string;
};

export type AchievementMetric = "totalCompleted" | "streak" | "stars" | "balance";
export type Achievement = {
  id: string;
  title: { zh: string; en: string };
  desc: { zh: string; en: string };
  target: number;
  metric: AchievementMetric;
  icon?: string;
};

type ShopConfig = {
  moneyItems: MoneyItem[];
  starItems: StarItem[];
};

type StoreState = {
  /** Core data */
  activeChildId: string;
  children: Child[];
  daily: Record<string, DailyTask[]>;
  weekly: Record<string, WeeklyTask[]>;

  /** Wallets */
  balances: Record<string, number>;
  starWallet: Record<string, number>;

  /** Weekly stars for "today" (Home chart) */
  todayWeeklyStars: Record<string, number>;

  /** Rewards config */
  dailyFullCompleteReward: Record<string, number>;
  weeklyFullCompleteReward: Record<string, number>;

  /** Claim flags */
  dailyRewardClaimedToday: Record<string, boolean>;
  weeklyRewardClaimedThisWeek: Record<string, boolean>;
  dailyRewardPayoutToday: Record<string, number>;
  weeklyRewardPayoutThisWeek: Record<string, number>;

  /** Resets bookkeeping */
  lastDailyResetISO: string | null;
  lastWeeklyResetISO: string | null;

  /** History */
  history: Record<string, DayLog[]>;

  /** ===== Gacha / Rewards ===== */
  rewardPool: RewardCard[];
  setRewardPool: (pool: RewardCard[]) => void; // ✅ 新增
  drawCost: Record<string, number>;
  inventories: Record<string, OwnedCard[]>;
  badges: Record<string, Badge[]>;
  drawCounts: Record<string, number>;

  /** Stats for achievements */
  statsChoresCompleted: Record<string, number>;

  /** Monthly spent shown on Home */
  monthSpent: Record<string, Record<string, number>>;

  /** Achievements config */
  achievementsConfig: Achievement[];

  /** ====== Shop editable config ====== */
  shopConfig: ShopConfig;
  exchangeRateStarsPerDollar: number;

  /** ====== Settings security ====== */
  pinCode: string;
  setPinCode: (pin: string) => void;

  /** Actions: core selects */
  setActiveChild: (id: string) => void;

  /** Actions: Children CRUD */
  addChild: (name: string) => string;
  updateChild: (id: string, name: string) => void;
  removeChild: (id: string) => void;

  /** Actions: Daily/Weekly tasks CRUD (bulk setters for Settings 頁一次儲存) */
  setDailyList: (childId: string, list: DailyTask[]) => void;
  setWeeklyList: (childId: string, list: WeeklyTask[]) => void;

  /** Actions: runtime toggles (Tasks 頁在用的) */
  toggleDaily: (childId: string, id: string) => void;
  incWeekly: (childId: string, id: string) => void;
  decWeekly: (childId: string, id: string) => void;

  /** Actions: Reward config per child */
  setDailyReward: (childId: string, amount: number) => void;
  setWeeklyReward: (childId: string, amount: number) => void;
  setDrawCost: (childId: string, amount: number) => void;

  /** Wallet ops */
  addBalance: (childId: string, amount: number) => void;

  /** Shop 行為 */
  buyWithMoney: (childId: string, amount: number) => boolean;
  buyWithStars: (childId: string, stars: number) => boolean;
  exchangeStarsToMoney: (childId: string, stars: number) => boolean;

  /** Shop 設定維護 */
  setShopConfig: (cfg: ShopConfig) => void;
  setExchangeRate: (n: number) => void;

  /** Gacha */
  drawCard: (childId: string) => RewardCard | null;
  useInventoryCard: (childId: string, cardId: string) => boolean;

  /** Resets */
  resetDailyForAllChildren: () => void;
  resetWeeklyForAllChildren: () => void;
  ensureResetsNow: () => void;
};

/** ===== helpers ===== */
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const toYearMonth = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
function startOfWeekMonday(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const res = new Date(d);
  res.setDate(d.getDate() + diff);
  res.setHours(0, 0, 0, 0);
  return res;
}
function clampHistory<T>(arr: T[], keep = 60) {
  return arr.length <= keep ? arr : arr.slice(arr.length - keep);
}
function isDailyFullyCompleted(daily: DailyTask[]) {
  if (!daily || daily.length === 0) return false;
  return daily.every((t) => t.done);
}
function isWeeklyFullyCompleted(weekly: WeeklyTask[]) {
  if (!weekly || weekly.length === 0) return false;
  return weekly.every((t) => t.count >= Math.max(1, t.target));
}
function weightedPick<T extends { weight: number }>(items: T[]) {
  const total = items.reduce((s, it) => s + Math.max(0, it.weight), 0);
  if (total <= 0) return items[0];
  let r = Math.random() * total;
  for (const it of items) {
    r -= Math.max(0, it.weight);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}
function ensureUniqueBadge(list: Badge[], add: Badge): Badge[] {
  if (list.some((b) => b.id === add.id)) return list;
  return [...list, add];
}
const uid = (p = "id") => `${p}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString().slice(-4)}`;

/** 今日星星（僅畫面 & streak，非星錢包） */
function computeTodayStars(s: StoreState, childId: string) {
  const daily = s.daily[childId] ?? [];
  const dailyEarned = daily.filter((t) => t.done).reduce((sum, t) => sum + t.points, 0);
  const weeklyToday = s.todayWeeklyStars[childId] ?? 0;
  return dailyEarned + weeklyToday;
}
function computeStreak(s: StoreState, childId: string) {
  const today = new Date();
  const todayISO = toISODate(today);
  const todayStars = computeTodayStars(s, childId);
  const logs = [
    ...(s.history[childId] ?? []),
    { dateISO: todayISO, stars: todayStars, completed: 0, total: 0 },
  ];
  const map = new Map(logs.map((l) => [l.dateISO, l.stars]));
  let count = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = toISODate(d);
    const stars = map.get(iso) ?? 0;
    if (stars > 0) count++;
    else break;
  }
  return count;
}
function computeStarsTotal(s: StoreState, childId: string) {
  const hist = s.history[childId] ?? [];
  const past = hist.reduce((sum, h) => sum + (h.stars ?? 0), 0);
  return past + computeTodayStars(s, childId);
}
function checkAndAwardAchievements(childId: string, get: () => StoreState, set: (partial: Partial<StoreState>) => void) {
  const s = get();
  const conf = s.achievementsConfig;
  const badges = s.badges[childId] ?? [];

  const metricValue: Record<AchievementMetric, number> = {
    totalCompleted: s.statsChoresCompleted[childId] ?? 0,
    streak: computeStreak(s, childId),
    stars: computeStarsTotal(s, childId),
    balance: s.balances[childId] ?? 0,
  };

  let newBadges = [...badges];
  for (const a of conf) {
    const val = metricValue[a.metric] ?? 0;
    if (val >= a.target) {
      const badgeId = `achv-${a.id}`;
      newBadges = ensureUniqueBadge(newBadges, {
        id: badgeId,
        title: a.title.zh || a.title.en,
        icon: a.icon ?? "🏅",
        earnedAt: Date.now(),
        description: a.desc.zh || a.desc.en,
      });
    }
  }
  if (newBadges !== badges) set({ badges: { ...s.badges, [childId]: newBadges } });
}

/** ===== store ===== */
export const useAppStore = create<StoreState>()(
  persist(
    (set, get) => ({
      /** 初始資料 */
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
      starWallet: { c1: 0, c2: 0 },
      todayWeeklyStars: { c1: 0, c2: 0 },

      dailyFullCompleteReward: { c1: 20, c2: 20 },
      weeklyFullCompleteReward: { c1: 50, c2: 50 },

      dailyRewardClaimedToday: { c1: false, c2: false },
      weeklyRewardClaimedThisWeek: { c1: false, c2: false },
      dailyRewardPayoutToday: { c1: 0, c2: 0 },
      weeklyRewardPayoutThisWeek: { c1: 0, c2: 0 },

      lastDailyResetISO: null,
      lastWeeklyResetISO: null,

      history: { c1: [], c2: [] },

      /** 抽卡池（可於 Settings 編輯） */
      rewardPool: [
        { id: "n1",  name: "貼紙：笑臉",     rarity: "N",   weight: 60, icon: "😊" },
        { id: "n2",  name: "貼紙：小星星",   rarity: "N",   weight: 60, icon: "✨" },
        { id: "r1",  name: "玩樂加班 10 分", rarity: "R",   weight: 28, icon: "🎟️" },
        { id: "r2",  name: "寶可夢卡卡包",   rarity: "R",   weight: 28, icon: "🃏" },
        { id: "sr1", name: "迷你玩具券",     rarity: "SR",  weight: 10, icon: "🧸" },
        { id: "ssr1",name: "家庭電影夜",     rarity: "SSR", weight: 2,  icon: "🎬" },
      ],
      setRewardPool: (pool) =>
        set(() => ({
          rewardPool: (pool ?? [])
            .filter((c) => (c.name ?? "").trim() !== "" && (c.weight ?? 0) >= 0)
            .map((c) => ({
              id: c.id || uid("card"),
              name: c.name.trim(),
              rarity: (["N", "R", "SR", "SSR"] as const).includes(c.rarity) ? c.rarity : "N",
              weight: Math.max(0, Math.floor(Number(c.weight) || 0)),
              icon: c.icon ?? "",
            })),
        })),

      drawCost: { c1: 20, c2: 20 },
      inventories: { c1: [], c2: [] },
      badges: { c1: [], c2: [] },
      drawCounts: { c1: 0, c2: 0 },

      achievementsConfig: [
        { id: "tc_10",   title: { zh: "初入門",   en: "Getting Started" }, desc: { zh: "累計完成 10 項任務",  en: "Complete 10 tasks total" }, target: 10,  metric: "totalCompleted", icon: "🧹" },
        { id: "tc_50",   title: { zh: "努力不懈", en: "Keep Going" },     desc: { zh: "累計完成 50 項任務",  en: "Complete 50 tasks total" }, target: 50,  metric: "totalCompleted", icon: "🧽" },
        { id: "tc_100",  title: { zh: "任務大師", en: "Task Master" },    desc: { zh: "累計完成 100 項任務", en: "Complete 100 tasks total"}, target: 100, metric: "totalCompleted", icon: "🏆" },

        { id: "streak_3",  title: { zh: "開啟習慣", en: "Habit Starter" },  desc: { zh: "連續達標 3 天",  en: "3-day streak"  }, target: 3,  metric: "streak",  icon: "📅" },
        { id: "streak_7",  title: { zh: "一週達標", en: "Weekly Winner" },  desc: { zh: "連續達標 7 天",  en: "7-day streak"  }, target: 7,  metric: "streak",  icon: "🔥" },
        { id: "streak_14", title: { zh: "堅持兩週", en: "Two Weeks Strong"}, desc: { zh: "連續達標 14 天", en: "14-day streak" }, target: 14, metric: "streak",  icon: "💪" },

        { id: "star_10",   title: { zh: "星星收藏家", en: "Star Collector" }, desc: { zh: "星星累積 10 顆",  en: "Collect 10 stars" }, target: 10,  metric: "stars",   icon: "⭐" },

        { id: "balance_100", title: { zh: "小財神", en: "Little Tycoon" }, desc: { zh: "帳戶餘額達 $100", en: "Balance reaches $100" }, target: 100, metric: "balance", icon: "💰" },
      ],

      statsChoresCompleted: { c1: 0, c2: 0 },
      monthSpent: { c1: {}, c2: {} },

      /** ===== Shop config 初始值 ===== */
      shopConfig: {
        moneyItems: DEFAULT_MONEY_ITEMS,
        starItems: DEFAULT_STAR_ITEMS,
      },
      exchangeRateStarsPerDollar: 5,

      /** ===== Settings security ===== */
      pinCode: "0000",
      setPinCode: (pin) =>
        set(() => ({
          pinCode: /^\d{4}$/.test(pin) ? pin : "0000",
        })),

      /** ===== Core actions ===== */
      setActiveChild: (id) => set({ activeChildId: id }),

      /** ===== Children CRUD ===== */
      addChild: (name) => {
        const id = uid("c");
        set((s) => ({
          children: [...s.children, { id, name: name || "新成員" }],
          daily: { ...s.daily, [id]: [] },
          weekly: { ...s.weekly, [id]: [] },
          balances: { ...s.balances, [id]: 0 },
          starWallet: { ...s.starWallet, [id]: 0 },
          todayWeeklyStars: { ...s.todayWeeklyStars, [id]: 0 },
          dailyFullCompleteReward: { ...s.dailyFullCompleteReward, [id]: 20 },
          weeklyFullCompleteReward: { ...s.weeklyFullCompleteReward, [id]: 50 },
          dailyRewardClaimedToday: { ...s.dailyRewardClaimedToday, [id]: false },
          weeklyRewardClaimedThisWeek: { ...s.weeklyRewardClaimedThisWeek, [id]: false },
          dailyRewardPayoutToday: { ...s.dailyRewardPayoutToday, [id]: 0 },
          weeklyRewardPayoutThisWeek: { ...s.weeklyRewardPayoutThisWeek, [id]: 0 },
          history: { ...s.history, [id]: [] },
          drawCost: { ...s.drawCost, [id]: 20 },
          inventories: { ...s.inventories, [id]: [] },
          badges: { ...s.badges, [id]: [] },
          drawCounts: { ...s.drawCounts, [id]: 0 },
          statsChoresCompleted: { ...s.statsChoresCompleted, [id]: 0 },
          monthSpent: { ...s.monthSpent, [id]: {} },
        }));
        return id;
      },

      updateChild: (id, name) => set((s) => ({
        children: s.children.map((c) => (c.id === id ? { ...c, name: name || c.name } : c)),
      })),

      removeChild: (id) => set((s) => {
        const left = s.children.filter((c) => c.id !== id);
        const nextActive = s.activeChildId === id ? (left[0]?.id ?? "") : s.activeChildId;
        const prune = <T extends Record<string, any>>(obj: T) => {
          const { [id]: _omit, ...rest } = obj;
          return rest as T;
        };
        return {
          activeChildId: nextActive,
          children: left,
          daily: prune(s.daily),
          weekly: prune(s.weekly),
          balances: prune(s.balances),
          starWallet: prune(s.starWallet),
          todayWeeklyStars: prune(s.todayWeeklyStars),
          dailyFullCompleteReward: prune(s.dailyFullCompleteReward),
          weeklyFullCompleteReward: prune(s.weeklyFullCompleteReward),
          dailyRewardClaimedToday: prune(s.dailyRewardClaimedToday),
          weeklyRewardClaimedThisWeek: prune(s.weeklyRewardClaimedThisWeek),
          dailyRewardPayoutToday: prune(s.dailyRewardPayoutToday),
          weeklyRewardPayoutThisWeek: prune(s.weeklyRewardPayoutThisWeek),
          history: prune(s.history),
          drawCost: prune(s.drawCost),
          inventories: prune(s.inventories),
          badges: prune(s.badges),
          drawCounts: prune(s.drawCounts),
          statsChoresCompleted: prune(s.statsChoresCompleted),
          monthSpent: prune(s.monthSpent),
        };
      }),

      /** ===== Bulk setters for Settings ===== */
      setDailyList: (childId, list) =>
        set((s) => ({ daily: { ...s.daily, [childId]: list.map(t => ({ ...t, id: t.id || uid("d"), done: !!t.done })) } })),
      setWeeklyList: (childId, list) =>
        set((s) => ({ weekly: { ...s.weekly, [childId]: list.map(t => ({ ...t, id: t.id || uid("w"), count: Math.max(0, t.count ?? 0) })) } })),

      /** ===== Runtime task actions ===== */
      toggleDaily: (childId, id) => {
        const s = get();
        const list = s.daily[childId] ?? [];
        const idx = list.findIndex((t) => t.id === id);
        if (idx < 0) return;

        const wasDone = list[idx].done;
        const pts = list[idx].points;

        const updated = [...list];
        updated[idx] = { ...updated[idx], done: !wasDone };

        const curC = s.statsChoresCompleted[childId] ?? 0;
        const newC = Math.max(0, curC + (wasDone ? -1 : 1));

        const curStar = s.starWallet[childId] ?? 0;
        const newStar = Math.max(0, curStar + (wasDone ? -pts : pts));

        set({
          daily: { ...s.daily, [childId]: updated },
          statsChoresCompleted: { ...s.statsChoresCompleted, [childId]: newC },
          starWallet: { ...s.starWallet, [childId]: newStar },
        });

        const nowAll = isDailyFullyCompleted(updated);
        const claimed = s.dailyRewardClaimedToday[childId] ?? false;
        const reward = s.dailyFullCompleteReward[childId] ?? 0;
        const bal = s.balances[childId] ?? 0;

        if (nowAll && !claimed) {
          set({
            balances: { ...s.balances, [childId]: bal + reward },
            dailyRewardClaimedToday: { ...s.dailyRewardClaimedToday, [childId]: true },
            dailyRewardPayoutToday: { ...s.dailyRewardPayoutToday, [childId]: reward },
          });
        } else if (!nowAll && claimed) {
          const payout = s.dailyRewardPayoutToday[childId] ?? 0;
          set({
            balances: { ...s.balances, [childId]: Math.max(0, bal - payout) },
            dailyRewardClaimedToday: { ...s.dailyRewardClaimedToday, [childId]: false },
            dailyRewardPayoutToday: { ...s.dailyRewardPayoutToday, [childId]: 0 },
          });
        }

        checkAndAwardAchievements(childId, get, (p) => set(p as any));
      },

      incWeekly: (childId, id) => {
        const s = get();
        const list = s.weekly[childId] ?? [];
        const task = list.find((t) => t.id === id);
        const updated = list.map((t) => (t.id === id ? { ...t, count: t.count + 1 } : t));
        set({
          weekly: { ...s.weekly, [childId]: updated },
          todayWeeklyStars: { ...s.todayWeeklyStars, [childId]: (s.todayWeeklyStars[childId] ?? 0) + (task?.points ?? 0) },
          starWallet: { ...s.starWallet, [childId]: (s.starWallet[childId] ?? 0) + (task?.points ?? 0) },
        });

        const curC = s.statsChoresCompleted[childId] ?? 0;
        set({ statsChoresCompleted: { ...s.statsChoresCompleted, [childId]: curC + 1 } });

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

        checkAndAwardAchievements(childId, get, (p) => set(p as any));
      },

      decWeekly: (childId, id) => {
        const s = get();
        const list = s.weekly[childId] ?? [];
        const task = list.find((t) => t.id === id);
        const updated = list.map((t) => (t.id === id ? { ...t, count: Math.max(0, t.count - 1) } : t));
        set({
          weekly: { ...s.weekly, [childId]: updated },
          todayWeeklyStars: { ...s.todayWeeklyStars, [childId]: Math.max(0, (s.todayWeeklyStars[childId] ?? 0) - (task?.points ?? 0)) },
          starWallet: { ...s.starWallet, [childId]: Math.max(0, (s.starWallet[childId] ?? 0) - (task?.points ?? 0)) },
        });

        const curC = s.statsChoresCompleted[childId] ?? 0;
        set({ statsChoresCompleted: { ...s.statsChoresCompleted, [childId]: Math.max(0, curC - 1) } });

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

        checkAndAwardAchievements(childId, get, (p) => set(p as any));
      },

      /** Per-child reward configs */
      setDailyReward: (childId, amount) =>
        set((s) => ({ dailyFullCompleteReward: { ...s.dailyFullCompleteReward, [childId]: Math.max(0, Math.floor(amount)) } })),
      setWeeklyReward: (childId, amount) =>
        set((s) => ({ weeklyFullCompleteReward: { ...s.weeklyFullCompleteReward, [childId]: Math.max(0, Math.floor(amount)) } })),
      setDrawCost: (childId, amount) =>
        set((s) => ({ drawCost: { ...s.drawCost, [childId]: Math.max(0, Math.floor(amount)) } })),

      /** Wallet Top-up */
      addBalance: (childId, amount) => {
        amount = Math.max(0, Math.floor(amount));
        if (amount <= 0) return;
        const s = get();
        const cur = s.balances[childId] ?? 0;
        set({ balances: { ...s.balances, [childId]: cur + amount } });
        checkAndAwardAchievements(childId, get, (p) => set(p as any));
      },

      /** Shop：用錢購買（列入本月已花） */
      buyWithMoney: (childId, amount) => {
        amount = Math.max(0, Math.floor(amount));
        if (amount <= 0) return false;
        const s = get();
        const bal = s.balances[childId] ?? 0;
        if (bal < amount) return false;

        const ym = toYearMonth(new Date());
        const childSpent = s.monthSpent[childId] ?? {};
        const cur = childSpent[ym] ?? 0;

        set({
          balances: { ...s.balances, [childId]: bal - amount },
          monthSpent: { ...s.monthSpent, [childId]: { ...childSpent, [ym]: cur + amount } },
        });

        checkAndAwardAchievements(childId, get, (p) => set(p as any));
        return true;
      },

      /** Shop：用星星購買（不列入本月已花） */
      buyWithStars: (childId, stars) => {
        stars = Math.max(0, Math.floor(stars));
        if (stars <= 0) return false;
        const s = get();
        const cur = s.starWallet[childId] ?? 0;
        if (cur < stars) return false;
        set({ starWallet: { ...s.starWallet, [childId]: cur - stars } });
        return true;
      },

      /** ⭐ 兌換現金 */
      exchangeStarsToMoney: (childId, stars) => {
        stars = Math.max(0, Math.floor(stars));
        const rate = Math.max(1, Math.floor(get().exchangeRateStarsPerDollar || 5));
        if (stars < rate || stars % rate !== 0) return false;

        const s = get();
        const curStar = s.starWallet[childId] ?? 0;
        if (curStar < stars) return false;

        const dollars = Math.floor(stars / rate);
        const bal = s.balances[childId] ?? 0;

        set({
          starWallet: { ...s.starWallet, [childId]: curStar - stars },
          balances: { ...s.balances, [childId]: bal + dollars },
        });
        checkAndAwardAchievements(childId, get, (p) => set(p as any));
        return true;
      },

      /** Shop 設定 */
      setShopConfig: (cfg) => set({
        shopConfig: {
          moneyItems: (cfg.moneyItems ?? []).map(i => ({ ...i, id: i.id || uid("m") })),
          starItems:  (cfg.starItems  ?? []).map(i => ({ ...i, id: i.id || uid("s") })),
        }
      }),
      setExchangeRate: (n) => set({ exchangeRateStarsPerDollar: Math.max(1, Math.floor(n || 1)) }),

      /** Gacha：抽卡（扣錢 + 記本月已花） */
      drawCard: (childId) => {
        const s = get();
        const cost = s.drawCost[childId] ?? 0;
        const bal = s.balances[childId] ?? 0;
        if (bal < cost) return null;

        const card = weightedPick(s.rewardPool);

        const ym = toYearMonth(new Date());
        const childSpent = s.monthSpent[childId] ?? {};
        const cur = childSpent[ym] ?? 0;

        const inv = s.inventories[childId] ?? [];
        const owned: OwnedCard = { cardId: card.id, ownedAt: Date.now() };

        let newBadges = [...(s.badges[childId] ?? [])];
        if (card.rarity === "SSR") {
          newBadges = ensureUniqueBadge(newBadges, {
            id: "first-ssr",
            title: "傳說之幸運！",
            icon: "🌟",
            earnedAt: Date.now(),
            description: "首次抽到 SSR 卡片",
          });
        }

        const currentCount = (s.drawCounts[childId] ?? 0) + 1;
        const milestones = [
          { count: 10,  id: "draw-10",  title: "新手訓練家", icon: "🎒", desc: "抽卡累計 10 次" },
          { count: 50,  id: "draw-50",  title: "熟練訓練家", icon: "⚡", desc: "抽卡累計 50 次" },
          { count: 100, id: "draw-100", title: "傳奇訓練家", icon: "👑", desc: "抽卡累計 100 次" },
        ];
        for (const m of milestones) {
          if (currentCount === m.count) {
            newBadges = ensureUniqueBadge(newBadges, {
              id: m.id, title: m.title, icon: m.icon, earnedAt: Date.now(), description: m.desc,
            });
          }
        }

        set({
          balances: { ...s.balances, [childId]: bal - cost },
          monthSpent: { ...s.monthSpent, [childId]: { ...childSpent, [ym]: cur + cost } },
          inventories: { ...s.inventories, [childId]: [...inv, owned] },
          badges: { ...s.badges, [childId]: newBadges },
          drawCounts: { ...s.drawCounts, [childId]: currentCount },
        });

        checkAndAwardAchievements(childId, get, (p) => set(p as any));
        return card;
      },

      useInventoryCard: (childId, cardId) => {
        const s = get();
        const inv = s.inventories[childId] ?? [];
        const idx = inv.findIndex((o) => o.cardId === cardId);
        if (idx === -1) return false;
        const next = [...inv];
        next.splice(idx, 1);
        set({ inventories: { ...s.inventories, [childId]: next } });
        return true;
      },

      /** ===== Resets ===== */
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

      ensureResetsNow: () => {
        const s = get();
        const now = new Date();
        const todayISO = toISODate(now);

        // Daily snapshot & reset
        if (s.lastDailyResetISO !== todayISO) {
          if (s.lastDailyResetISO) {
            const snapshotDateISO = s.lastDailyResetISO;
            const nextHistory: StoreState["history"] = { ...s.history };

            for (const child of s.children) {
              const dList = s.daily[child.id] ?? [];
              const weeklyStars = s.todayWeeklyStars[child.id] ?? 0;

              const completedDaily = dList.filter((t) => t.done);
              const stars = completedDaily.reduce((sum, t) => sum + t.points, 0) + weeklyStars;

              const completed = completedDaily.length;
              const total = dList.length;

              const log: DayLog = { dateISO: snapshotDateISO, stars, completed, total };
              const prev = nextHistory[child.id] ?? [];
              nextHistory[child.id] = clampHistory([...prev, log], 60);
            }

            set({ history: nextHistory });
          }

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

        // Weekly reset on Monday
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
