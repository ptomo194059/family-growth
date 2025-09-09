'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';

/** ========== Types ========== */
type Lang = 'zh' | 'en';

type Task = {
  id: string;
  // 新版：任務名稱與分類支援中/英
  name?: { zh: string; en: string };
  category?: { zh: string; en: string };
  // 舊版相容欄位（若有會自動轉成 name/category）
  label?: string;
  categoryOld?: string;
};

type Ledger = { ts: number; type: 'earn' | 'spend'; amount: number; note: string };
type Kid = { id: string; name: string; createdAt: number };

type Dump = {
  kid: Kid;
  date: string;
  tasks: Task[];
  stars: number;
  balance: number;
  ledger: Ledger[];
  budgetCap: number;
  paidToday: string[];
  completed: string[];
  settings: {
    paidTasksPerDay: number;
    moneyPerPaidTask: number;
    dailyGoal: number;
  };
  totals?: {
    totalCompleted: number;
  };
  badges?: string[];
};

/** ========== i18n strings ========== */
const STR = {
  title: { zh: '家庭成長任務', en: 'Family Growth Tasks' },
  version: { zh: 'v1.5 • 中/英切換', en: 'v1.5 • zh/en toggle' },
  tabs: {
    tasks: { zh: '任務', en: 'Tasks' },
    shop: { zh: '商店', en: 'Shop' },
    history: { zh: '紀錄', en: 'History' },
    settings: { zh: '設定', en: 'Settings' },
    badges: { zh: '徽章', en: 'Badges' },
  },
  stats: {
    stars: { zh: '星星', en: 'Stars' },
    balance: { zh: '餘額（$）', en: 'Balance ($)' },
    monthSpent: { zh: '本月已花', en: 'Spent this month' },
    monthlyCap: { zh: '月度上限', en: 'Monthly cap' },
    streak: { zh: '連續達標（目標 {n}/天）', en: 'Streak (goal {n}/day)' },
    totalCompleted: { zh: '累計完成：{n}', en: 'Total completed: {n}' },
    last7: { zh: '最近 7 天完成數', en: 'Completions in last 7 days' },
  },
  actions: {
    addKid: { zh: '新增孩子', en: 'Add Kid' },
    renameKid: { zh: '改名', en: 'Rename' },
    removeKid: { zh: '刪除孩子', en: 'Delete Kid' },
    date: { zh: '日期：', en: 'Date:' },
    drawPaid: { zh: '抽今日可領現金任務', en: 'Draw today’s paid tasks' },
    export: { zh: '匯出資料', en: 'Export' },
    import: { zh: '匯入資料', en: 'Import' },
    clearToday: { zh: '清空今日紀錄', en: 'Clear today' },
    complete: { zh: '完成', en: 'Complete' },
    done: { zh: '已完成', en: 'Done' },
    buy: { zh: '兌換', en: 'Redeem' },
    notEnough: { zh: '餘額不足', en: 'Insufficient balance' },
    reachedCap: { zh: '已達月度上限 {cap}', en: 'Reached monthly cap {cap}' },
    addTask: { zh: '新增任務', en: 'Add Task' },
    delete: { zh: '刪除', en: 'Delete' },
  },
  hints: {
    kidNow: { zh: '目前：', en: 'Current:' },
    kidDeleteWarn: {
      zh: '提示：刪除孩子會移除其 localStorage 中資料；建議先匯出備份。',
      en: 'Note: Deleting a kid removes their localStorage data; export first.',
    },
    paidTodayPrefix: {
      zh: '今日可領現金任務', en: 'Today’s paid tasks'
    },
    notDrawn: { zh: '尚未抽取', en: 'Not drawn yet' },
    reward: { zh: '完成獎勵：⭐+1', en: 'Reward: ⭐+1' },
    rewardCash: { zh: '，$+{n}（今日）', en: ', $+{n} (today)' },
    suggestBudget: {
      zh: '建議：若一週 5 天、每日 {a} 項 × ${b}，月總額 ≈ 5×4×{a}×{b} 元。',
      en: 'Tip: 5 days/week × {a} tasks × ${b} ≈ 5×4×{a}×{b} per month.',
    },
    importOk: { zh: '已匯入到', en: 'Imported to' },
    importFail: { zh: '匯入失敗：檔案格式不正確', en: 'Import failed: invalid file format' },
    exportOk: { zh: '已匯出 {name} 的 JSON 備份', en: 'Exported JSON backup for {name}' },
  },
  settings: {
    moneyCountPerDay: { zh: '每日可領現金任務數：', en: 'Paid tasks per day:' },
    moneyPerTask: { zh: '每項現金獎勵金額（$）：', en: 'Cash per paid task ($):' },
    monthlyCap: { zh: '月度支出上限（$）：', en: 'Monthly spending cap ($):' },
    dailyGoal: { zh: '每日目標完成項數（Streak 用）：', en: 'Daily goal (for streak):' },
    kidManage: { zh: '孩子資料管理', en: 'Kid Management' },
  },
  modals: {
    card: { zh: '抽到驚喜卡！', en: 'Surprise Card!' },
    chest: { zh: '寶箱開啟！', en: 'Treasure Chest!' },
    itemOk: { zh: '兌換成功', en: 'Redeemed' },
    ok: { zh: '好的', en: 'OK' },
    unlocked: { zh: '恭喜解鎖徽章！', en: 'Badge Unlocked!' },
  },
  prompts: {
    renameKid: { zh: '修改孩子名稱：', en: 'Rename kid:' },
    addKidPlaceholder: { zh: '新增孩子名稱', en: 'New kid name' },
    addTaskName: { zh: '任務名稱（例如：背單字 5 個）', en: 'Task name (e.g., 5 vocab words)' },
    addTaskCat: { zh: '分類（例如：學業/生活）', en: 'Category (e.g., Study/Life)' },
  },
};

/** ========== i18n helper ========== */
function tr(s: { zh: string; en: string }, lang: Lang, vars?: Record<string, string | number>) {
  let txt = s[lang];
  if (vars) for (const k of Object.keys(vars)) txt = txt.replaceAll(`{${k}}`, String(vars[k]));
  return txt;
}

/** ========== Storage helpers ========== */
function load<T>(k: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save<T>(k: string, v: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(k, JSON.stringify(v));
}
const kkey = (kidId: string, k: string) => `fga_${kidId}_${k}`;
const fmtDate = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
const todayStr = fmtDate();

/** ========== Defaults (with i18n) ========== */
const DEFAULT_TASKS: Task[] = [
  {
    id: 'hw',
    name: { zh: '完成作業', en: 'Finish homework' },
    category: { zh: '學業', en: 'Study' },
  },
  {
    id: 'piano',
    name: { zh: '鋼琴練習 15 分鐘', en: 'Piano practice 15 min' },
    category: { zh: '音樂', en: 'Music' },
  },
  {
    id: 'art',
    name: { zh: '畫畫／手作 20 分鐘', en: 'Drawing/Craft 20 min' },
    category: { zh: '藝術', en: 'Art' },
  },
  {
    id: 'sport',
    name: { zh: '運動 15 分鐘（跳繩/騎車/球類）', en: 'Exercise 15 min (jump rope/bike/ball)' },
    category: { zh: '運動', en: 'Sport' },
  },
  {
    id: 'meal',
    name: { zh: '30 分鐘內吃完飯（不挑食）', en: 'Finish meal in 30 min (no picky eating)' },
    category: { zh: '生活', en: 'Life' },
  },
  {
    id: 'chore',
    name: { zh: '家務幫手（收玩具/擺碗筷）', en: 'Chores helper (toys/dishes)' },
    category: { zh: '家務', en: 'Chores' },
  },
];

const SURPRISE_CARDS = [
  { id: 'hug', name: { zh: '擁抱券', en: 'Hug Coupon' }, description: { zh: '3 分鐘大抱抱', en: '3-min big hug' } },
  { id: 'story', name: { zh: '加碼睡前故事', en: 'Extra bedtime story' }, description: { zh: '多聽 1 個故事', en: 'One extra story' } },
  { id: 'snack', name: { zh: '小點心券', en: 'Snack Coupon' }, description: { zh: '一份健康小點心', en: 'A healthy snack' } },
  { id: 'park', name: { zh: '公園遊戲時間', en: 'Park playtime' }, description: { zh: '週末 1 小時', en: '1 hour on weekend' } },
  { id: 'game', name: { zh: '休閒遊戲時間', en: 'Game time' }, description: { zh: '加碼 30 分鐘', en: 'Extra 30 min' } },
];

const SHOP_ITEMS = [
  { id: 'draw', name: { zh: '抽驚喜卡', en: 'Draw Surprise Card' }, price: 10 as const, action: 'draw' as const },
  { id: 'chest', name: { zh: '開寶箱', en: 'Open Chest' }, price: 30 as const, action: 'chest' as const },
  { id: 'sticker', name: { zh: '可愛貼紙', en: 'Cute Sticker' }, price: 20 as const, action: 'item' as const, payload: { zh: '貼紙 1 張', en: '1 sticker' } },
  { id: 'marker', name: { zh: '彩色筆 1 支', en: '1 Marker Pen' }, price: 30 as const, action: 'item' as const, payload: { zh: '彩色筆', en: 'Marker' } },
  { id: 'book', name: { zh: '小書一本', en: 'A small book' }, price: 80 as const, action: 'item' as const, payload: { zh: '小繪本', en: 'Little book' } },
];

// Achievements
type Achievement = {
  id: string;
  title: { zh: string; en: string };
  desc: { zh: string; en: string };
  target: number;
  metric: 'totalCompleted' | 'streak' | 'stars' | 'balance';
};
const ACHIEVEMENTS: Achievement[] = [
  { id: 'tc_10', title: { zh: '初入門', en: 'Getting Started' }, desc: { zh: '累計完成 10 項任務', en: 'Complete 10 tasks total' }, target: 10, metric: 'totalCompleted' },
  { id: 'tc_50', title: { zh: '努力不懈', en: 'Keep Going' }, desc: { zh: '累計完成 50 項任務', en: 'Complete 50 tasks total' }, target: 50, metric: 'totalCompleted' },
  { id: 'tc_100', title: { zh: '任務大師', en: 'Task Master' }, desc: { zh: '累計完成 100 項任務', en: 'Complete 100 tasks total' }, target: 100, metric: 'totalCompleted' },
  { id: 'streak_3', title: { zh: '開啟習慣', en: 'Habit Starter' }, desc: { zh: '連續達標 3 天', en: '3-day streak' }, target: 3, metric: 'streak' },
  { id: 'streak_7', title: { zh: '一週達標', en: 'Weekly Winner' }, desc: { zh: '連續達標 7 天', en: '7-day streak' }, target: 7, metric: 'streak' },
  { id: 'streak_14', title: { zh: '堅持兩週', en: 'Two Weeks Strong' }, desc: { zh: '連續達標 14 天', en: '14-day streak' }, target: 14, metric: 'streak' },
  { id: 'star_10', title: { zh: '星星收藏家', en: 'Star Collector' }, desc: { zh: '星星累積 10 顆', en: 'Collect 10 stars' }, target: 10, metric: 'stars' },
  { id: 'balance_100', title: { zh: '小財神', en: 'Little Tycoon' }, desc: { zh: '帳戶餘額達 $100', en: 'Balance reaches $100' }, target: 100, metric: 'balance' },
];

export default function Page() {
  /** 家庭 / 小孩管理 */
  const [kids, setKids] = useState<Kid[]>(() =>
    load<Kid[]>('fga_kids', [{ id: 'kid1', name: '小勇士', createdAt: Date.now() }])
  );
  const [currentKidId, setCurrentKidId] = useState<string>(() =>
    load<string>('fga_currentKidId', 'kid1')
  );
  const [lang, setLang] = useState<Lang>(() => load<Lang>('fga_lang', 'zh'));

  useEffect(() => save('fga_lang', lang), [lang]);

  useEffect(() => {
    if (!kids.find(k => k.id === currentKidId)) {
      setCurrentKidId(kids[0]?.id || 'kid1');
    }
  }, [kids, currentKidId]);
  useEffect(() => save('fga_kids', kids), [kids]);
  useEffect(() => save('fga_currentKidId', currentKidId), [currentKidId]);

  /** 資料（以小孩為命名空間） */
  const [date, setDate] = useState<string>(todayStr);
  const [tasks, setTasks] = useState<Task[]>(() => DEFAULT_TASKS);
  const [paidToday, setPaidToday] = useState<string[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [stars, setStars] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const [budgetCap, setBudgetCap] = useState<number>(300);

  const [paidTasksPerDay, setPaidTasksPerDay] = useState<number>(3);
  const [moneyPerPaidTask, setMoneyPerPaidTask] = useState<number>(5);
  const [dailyGoal, setDailyGoal] = useState<number>(3);

  const [totalCompleted, setTotalCompleted] = useState<number>(0);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);

  const [toast, setToast] = useState<string>('');
  const [modal, setModal] = useState<{ title: string; content: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'shop' | 'history' | 'settings' | 'badges'>('tasks');

  const fileRef = useRef<HTMLInputElement | null>(null);

  // 讀取 kid 資料 + 舊版任務相容轉換
  useEffect(() => {
    const kidId = currentKidId;
    const rawTasks = load<Task[]>(kkey(kidId, 'tasks'), DEFAULT_TASKS);
    const migrated = rawTasks.map((t) => {
      if (t.name && t.category) return t;
      // 舊版兼容：label / categoryOld -> 雙語欄位
      const nameZh = t.label ?? '未命名任務';
      const catZh = t.categoryOld ?? '其他';
      return {
        ...t,
        name: { zh: nameZh, en: t.name?.en ?? nameZh }, // 若沒有英文，就先用中文
        category: { zh: catZh, en: t.category?.en ?? catZh },
      };
    });
    setTasks(migrated);

    setStars(load(kkey(kidId, 'stars'), 0));
    setBalance(load(kkey(kidId, 'balance'), 0));
    setLedger(load(kkey(kidId, 'ledger'), []));
    setBudgetCap(load(kkey(kidId, 'budgetCap'), 300));
    setPaidTasksPerDay(load(kkey(kidId, 'paidTasksPerDay'), 3));
    setMoneyPerPaidTask(load(kkey(kidId, 'moneyPerPaidTask'), 5));
    setDailyGoal(load(kkey(kidId, 'dailyGoal'), 3));
    setTotalCompleted(load(kkey(kidId, 'totalCompleted'), 0));
    setUnlockedBadges(load(kkey(kidId, 'badges'), []));

    setPaidToday(load(kkey(kidId, `paid_${date}`), []));
    setCompleted(load(kkey(kidId, `done_${date}`), []));
  }, [currentKidId]);

  // 切換日期時載入當天紀錄
  useEffect(() => {
    const kidId = currentKidId;
    setPaidToday(load(kkey(kidId, `paid_${date}`), []));
    setCompleted(load(kkey(kidId, `done_${date}`), []));
  }, [date, currentKidId]);

  // 持久化
  useEffect(() => save(kkey(currentKidId, 'tasks'), tasks), [tasks, currentKidId]);
  useEffect(() => save(kkey(currentKidId, 'stars'), stars), [stars, currentKidId]);
  useEffect(() => save(kkey(currentKidId, 'balance'), balance), [balance, currentKidId]);
  useEffect(() => save(kkey(currentKidId, 'ledger'), ledger), [ledger, currentKidId]);
  useEffect(() => save(kkey(currentKidId, 'budgetCap'), budgetCap), [budgetCap, currentKidId]);
  useEffect(() => save(kkey(currentKidId, 'paidTasksPerDay'), paidTasksPerDay), [paidTasksPerDay, currentKidId]);
  useEffect(() => save(kkey(currentKidId, 'moneyPerPaidTask'), moneyPerPaidTask), [moneyPerPaidTask, currentKidId]);
  useEffect(() => save(kkey(currentKidId, 'dailyGoal'), dailyGoal), [dailyGoal, currentKidId]);
  useEffect(() => save(kkey(currentKidId, `paid_${date}`), paidToday), [date, paidToday, currentKidId]);
  useEffect(() => save(kkey(currentKidId, `done_${date}`), completed), [date, completed, currentKidId]);
  useEffect(() => save(kkey(currentKidId, 'totalCompleted'), totalCompleted), [totalCompleted, currentKidId]);
  useEffect(() => save(kkey(currentKidId, 'badges'), unlockedBadges), [unlockedBadges, currentKidId]);

  /** 統計 */
  const monthSpent = useMemo(() => {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = d.getMonth();
    const start = new Date(y, m, 1).getTime();
    const end = new Date(y, m + 1, 1).getTime();
    return ledger
      .filter((l) => l.type === 'spend' && l.ts >= start && l.ts < end)
      .reduce((s, l) => s + l.amount, 0);
  }, [date, ledger]);
  const canSpend = balance > 0 && monthSpent < budgetCap;

  const last7 = useMemo(() => {
    const arr: { day: string; count: number }[] = [];
    const base = new Date(date);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const ds = fmtDate(d);
      const cnt = load<string[]>(kkey(currentKidId, `done_${ds}`), []).length;
      arr.push({ day: ds.slice(5), count: cnt });
    }
    return arr;
  }, [date, currentKidId]);

  const streak = useMemo(() => {
    let s = 0;
    for (let i = 0; ; i++) {
      const d = new Date(date);
      d.setDate(d.getDate() - i);
      const ds = fmtDate(d);
      const cnt = load<string[]>(kkey(currentKidId, `done_${ds}`), []).length;
      if (cnt >= dailyGoal) s++;
      else break;
      if (i > 365) break;
    }
    return s;
  }, [date, currentKidId, dailyGoal]);

  /** 成就 */
  const currentValueOf = (metric: Achievement['metric']) => {
    if (metric === 'totalCompleted') return totalCompleted;
    if (metric === 'streak') return streak;
    if (metric === 'stars') return stars;
    if (metric === 'balance') return balance;
    return 0;
  };
  function checkAchievements(triggerNote?: string) {
    const newly: Achievement[] = [];
    const unlockedSet = new Set(unlockedBadges);
    for (const a of ACHIEVEMENTS) {
      if (unlockedSet.has(a.id)) continue;
      const cur = currentValueOf(a.metric);
      if (cur >= a.target) {
        newly.push(a);
        unlockedSet.add(a.id);
      }
    }
    if (newly.length) {
      setUnlockedBadges(Array.from(unlockedSet));
      const titles = newly.map(n => `🏅 ${n.title[lang]}`).join('、');
      setModal({
        title: STR.modals.unlocked[lang],
        content: `${titles}${triggerNote ? `\n(${triggerNote})` : ''}`,
      });
    }
  }

  /** 邏輯 */
  function drawPaidTasks() {
    const pool = [...tasks];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const n = Math.max(0, Math.min(paidTasksPerDay, pool.length));
    const selected = pool.slice(0, n).map((t) => t.id);
    setPaidToday(selected);
    const names = selected
      .map((id) => tasks.find((t) => t.id === id)?.name?.[lang])
      .filter(Boolean)
      .join('、');
    setToast(
      selected.length
        ? `${tr(STR.hints.paidTodayPrefix, lang)}（${selected.length}/${paidTasksPerDay}）：${names}`
        : tr(STR.hints.notDrawn, lang)
    );
  }

  function tName(t: Task) {
    return t.name?.[lang] ?? t.label ?? '';
  }
  function tCat(t: Task) {
    return t.category?.[lang] ?? t.categoryOld ?? '';
  }

  function toggleComplete(id: string) {
    const wasDone = completed.includes(id);
    const next = wasDone ? completed.filter((x) => x !== id) : [...completed, id];
    setCompleted(next);
    const task = tasks.find((x) => x.id === id);
    const taskName = tName(task || { id, name: { zh: '任務', en: 'Task' } });

    if (!wasDone) {
      setStars((s) => s + 1);
      setTotalCompleted((n) => n + 1);
      if (paidToday.includes(id)) {
        const money = moneyPerPaidTask;
        setBalance((b) => b + money);
        setLedger((l) => [
          ...l,
          { ts: Date.now(), type: 'earn', amount: money, note: `${lang === 'zh' ? '完成「' : 'Completed "'}${taskName}${lang === 'zh' ? '」' : '"'}` },
        ]);
      }
      setToast(
        `${lang === 'zh' ? '完成：' : 'Done: '}${taskName}（⭐+1${
          paidToday.includes(id) ? `，$+${moneyPerPaidTask}` : ''
        }）`
      );
      setTimeout(() => checkAchievements(lang === 'zh' ? '完成任務' : 'Task completed'), 0);
    } else {
      setToast(`${lang === 'zh' ? '已取消：' : 'Canceled: '}${taskName}`);
    }
  }

  function buy(item: (typeof SHOP_ITEMS)[number]) {
    if (!canSpend) {
      setToast(monthSpent >= budgetCap ? tr(STR.actions.reachedCap, lang, { cap: budgetCap }) : tr(STR.actions.notEnough, lang));
      return;
    }
    if (balance < item.price) {
      setToast(`${tr(STR.actions.notEnough, lang)} ($${item.price})`);
      return;
    }
    setBalance((b) => b - item.price);
    setLedger((l) => [...l, { ts: Date.now(), type: 'spend', amount: item.price, note: `${lang==='zh'?'購買：':'Redeem: '}${item.name[lang]}` }]);

    if (item.action === 'draw') {
      const pick = SURPRISE_CARDS[Math.floor(Math.random() * SURPRISE_CARDS.length)];
      setModal({ title: STR.modals.card[lang], content: `${pick.name[lang]} — ${pick.description[lang]}` });
    } else if (item.action === 'chest') {
      const chestRewards = lang === 'zh'
        ? ['貼紙包', '小玩具', '家庭活動券（公園）', '故事加碼券', '健康小點心']
        : ['Stickers pack', 'Small toy', 'Family park time', 'Extra story', 'Healthy snack'];
      const r = chestRewards[Math.floor(Math.random() * chestRewards.length)];
      setModal({ title: STR.modals.chest[lang], content: `${lang==='zh'?'獲得：':'Got: '}${r}` });
    } else if (item.action === 'item') {
      setModal({ title: STR.modals.itemOk[lang], content: item.payload ? (item.payload as any)[lang] : item.name[lang] });
    }
  }

  function resetDay() {
    setCompleted([]);
    setPaidToday([]);
    setToast(lang === 'zh' ? '已清空今日紀錄' : 'Cleared today');
  }

  // 任務編輯
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState('');
  function addTask() {
    const l = newLabel.trim();
    const c = (newCategory.trim() || (lang === 'zh' ? '其他' : 'Other')).slice(0, 20);
    if (!l) return;
    const id = l.slice(0, 16).replace(/\s+/g, '_') + '_' + Math.random().toString(36).slice(2, 6);
    // 依當前語言建立雙語內容（另一語言先沿用同字）
    setTasks((prev) => [
      ...prev,
      {
        id,
        name: { zh: lang === 'zh' ? l : l, en: lang === 'en' ? l : l },
        category: { zh: lang === 'zh' ? c : c, en: lang === 'en' ? c : c },
      },
    ]);
    setNewLabel('');
    setNewCategory('');
  }
  function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  // 匯出 / 匯入（僅目前孩子）
  function exportJSON() {
    const kid = kids.find(k => k.id === currentKidId)!;
    const dump: Dump = {
      kid,
      date,
      tasks,
      stars,
      balance,
      ledger,
      budgetCap,
      paidToday,
      completed,
      settings: { paidTasksPerDay, moneyPerPaidTask, dailyGoal },
      totals: { totalCompleted },
      badges: unlockedBadges,
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fname = `${lang==='zh'?'家庭成長任務_備份':'Family_Growth_Backup'}_${kid.name}_${new Date().toISOString().slice(0, 10)}.json`;
    a.download = fname;
    a.click();
    URL.revokeObjectURL(url);
    setToast(tr(STR.hints.exportOk, lang, { name: kid.name }));
  }
  function importJSONFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result as string) as Dump;
        const kid = kids.find(k => k.id === currentKidId)!;
        const migrated = (obj.tasks ?? DEFAULT_TASKS).map((t) =>
          t.name && t.category
            ? t
            : {
                ...t,
                name: { zh: t.label ?? '未命名任務', en: t.label ?? 'Task' },
                category: { zh: (t as any).category ?? '其他', en: (t as any).category ?? 'Other' },
              }
        );
        setDate(obj.date || todayStr);
        setTasks(migrated);
        setStars(obj.stars ?? 0);
        setBalance(obj.balance ?? 0);
        setLedger(obj.ledger ?? []);
        setBudgetCap(obj.budgetCap ?? 300);
        setPaidToday(obj.paidToday ?? []);
        setCompleted(obj.completed ?? []);
        setPaidTasksPerDay(obj.settings?.paidTasksPerDay ?? 3);
        setMoneyPerPaidTask(obj.settings?.moneyPerPaidTask ?? 5);
        setDailyGoal(obj.settings?.dailyGoal ?? 3);
        setTotalCompleted(obj.totals?.totalCompleted ?? 0);
        setUnlockedBadges(obj.badges ?? []);
        setToast(`${tr(STR.hints.importOk, lang)} ${kid.name}`);
        setTimeout(() => checkAchievements(lang === 'zh' ? '匯入資料' : 'Import'), 0);
      } catch {
        setToast(tr(STR.hints.importFail, lang));
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  // 孩子管理
  const [newKidName, setNewKidName] = useState('');
  function addKid() {
    const name = newKidName.trim();
    if (!name) return;
    const id = 'kid_' + Math.random().toString(36).slice(2, 8);
    const k: Kid = { id, name, createdAt: Date.now() };
    const next = [...kids, k];
    setKids(next);
    setCurrentKidId(id);
    setNewKidName('');
    // 初始化 kid 預設
    save(kkey(id, 'tasks'), DEFAULT_TASKS);
    save(kkey(id, 'stars'), 0);
    save(kkey(id, 'balance'), 0);
    save(kkey(id, 'ledger'), []);
    save(kkey(id, 'budgetCap'), 300);
    save(kkey(id, 'paidTasksPerDay'), 3);
    save(kkey(id, 'moneyPerPaidTask'), 5);
    save(kkey(id, 'dailyGoal'), 3);
    save(kkey(id, 'totalCompleted'), 0);
    save(kkey(id, 'badges'), []);
    save(kkey(id, `paid_${todayStr}`), []);
    save(kkey(id, `done_${todayStr}`), []);
    setToast((lang==='zh'?'已新增孩子：':'Kid added: ') + name);
  }
  function renameCurrentKid(name: string) {
    setKids(kids.map(k => (k.id === currentKidId ? { ...k, name: name.trim() || k.name } : k)));
  }
  function removeCurrentKid() {
    if (kids.length <= 1) {
      setToast(lang==='zh'?'至少保留一位孩子':'Keep at least one kid');
      return;
    }
    const kid = kids.find(k => k.id === currentKidId)!;
    if (!window.confirm(lang==='zh' ? `確定刪除「${kid.name}」的資料嗎？此動作無法復原。` : `Delete "${kid.name}" data? This cannot be undone.`)) return;
    const next = kids.filter(k => k.id !== currentKidId);
    setKids(next);
    setCurrentKidId(next[0].id);
    setToast((lang==='zh'?'已刪除：':'Deleted: ') + kid.name);
  }

  useEffect(() => {
    checkAchievements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak, stars, balance, lang]);

  /** ========== UI ========== */
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">🏠 {tr(STR.title, lang)}（{tr(STR.version, lang)}）</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Language toggle */}
            <select
              className="h-9 rounded-md border px-2"
              title="Language"
              value={lang}
              onChange={(e) => setLang((e.target.value as Lang) || 'zh')}
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>

            {/* Kid switcher */}
            <select
              className="h-9 rounded-md border px-2"
              value={currentKidId}
              onChange={(e) => setCurrentKidId(e.target.value)}
              title={lang==='zh'?'切換孩子':'Switch kid'}
            >
              {kids.map(k => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
            <input
              className="h-9 rounded-md border px-2"
              placeholder={tr(STR.prompts.addKidPlaceholder, lang)}
              value={newKidName}
              onChange={(e)=>setNewKidName(e.target.value)}
            />
            <button onClick={addKid} className="h-9 rounded-md border px-3">{tr(STR.actions.addKid, lang)}</button>
            <button
              onClick={()=>{
                const n = window.prompt(tr(STR.prompts.renameKid, lang), kids.find(k=>k.id===currentKidId)?.name || '');
                if (n!=null) renameCurrentKid(n);
              }}
              className="h-9 rounded-md border px-3"
            >{tr(STR.actions.renameKid, lang)}</button>
            <button onClick={removeCurrentKid} className="h-9 rounded-md border px-3">{tr(STR.actions.removeKid, lang)}</button>

            <span className="mx-2 text-slate-400">|</span>

            <span className="text-sm text-slate-600">{tr(STR.actions.date, lang)}</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 rounded-md border px-2" />

            <button onClick={drawPaidTasks} className="h-9 rounded-md bg-indigo-600 px-3 text-white">{tr(STR.actions.drawPaid, lang)}</button>
            <button onClick={exportJSON} className="h-9 rounded-md border px-3">{tr(STR.actions.export, lang)}</button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]; if (f) importJSONFile(f);
              if (fileRef.current) fileRef.current.value = '';
            }} />
            <button onClick={() => fileRef.current?.click()} className="h-9 rounded-md border px-3">{tr(STR.actions.import, lang)}</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(['tasks', 'shop', 'history', 'settings', 'badges'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setActiveTab(k)}
              className={`h-9 rounded-md px-3 border ${activeTab === k ? 'bg-slate-900 text-white' : 'bg-white'}`}
            >
              {tr(STR.tabs[k], lang)}
            </button>
          ))}
        </div>

        {/* Toast */}
        {toast && <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-emerald-700 whitespace-pre-line">{toast}</div>}

        {activeTab === 'tasks' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">{tr(STR.stats.stars, lang)}</div><div className="text-2xl font-semibold">{stars}</div></div>
              <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">{tr(STR.stats.balance, lang)}</div><div className="text-2xl font-semibold">{balance}</div></div>
              <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">{tr(STR.stats.monthSpent, lang)}</div><div className="text-2xl font-semibold">{monthSpent}</div></div>
              <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">{tr(STR.stats.monthlyCap, lang)}</div>
                <input type="number" value={budgetCap} onChange={(e) => setBudgetCap(Math.max(0, Number(e.target.value || 0)))} className="h-9 w-24 rounded-md border px-2" />
              </div>
              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs text-slate-500">{tr(STR.stats.streak, lang, { n: dailyGoal })}</div>
                <div className="text-2xl font-semibold">{streak} {lang==='zh'?'天':'days'}</div>
                <div className="text-xs text-slate-500 mt-1">{tr(STR.stats.totalCompleted, lang, { n: totalCompleted })}</div>
              </div>
            </div>

            {/* 最近7日完成數 */}
            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm font-medium mb-2">{tr(STR.stats.last7, lang)}</div>
              <div className="grid grid-cols-7 gap-2">
                {last7.map(d => (
                  <div key={d.day} className="flex flex-col items-center gap-1">
                    <div className="w-6 h-20 rounded bg-slate-100 relative overflow-hidden">
                      <div
                        className="absolute bottom-0 w-full bg-indigo-500"
                        style={{ height: `${Math.min(100, d.count * 20)}%` }}
                        title={`${d.count}`}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500">{d.day.slice(0,2)}/{d.day.slice(3)}</div>
                    <div className="text-xs">{d.count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks */}
            <div className="rounded-2xl border bg-white p-4 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="text-sm text-slate-600">
                  {tr(STR.hints.paidTodayPrefix, lang)}（{paidToday.length}/{paidTasksPerDay}）：{
                    paidToday.length
                      ? paidToday.map((id) => tName(tasks.find((t) => t.id === id)!) ).join('、')
                      : tr(STR.hints.notDrawn, lang)
                  }
                </div>
                <button onClick={resetDay} className="h-9 rounded-md border px-3">{tr(STR.actions.clearToday, lang)}</button>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {tasks.map((t) => {
                  const isPaid = paidToday.includes(t.id);
                  const done = completed.includes(t.id);
                  return (
                    <div key={t.id} className={`flex items-center justify-between rounded-xl border p-3 ${done ? 'bg-emerald-50' : 'bg-white'}`}>
                      <div>
                        <div className="text-xs text-slate-500">{tCat(t)}</div>
                        <div className="font-medium text-lg">{tName(t)}</div>
                        <div className="text-xs text-slate-500">
                          {tr(STR.hints.reward, lang)} {isPaid ? tr(STR.hints.rewardCash, lang, { n: moneyPerPaidTask }) : ''}
                        </div>
                      </div>
                      <button onClick={() => toggleComplete(t.id)} className={`h-9 rounded-md px-3 ${done ? 'bg-slate-200' : 'bg-indigo-600 text-white'}`}>{done ? tr(STR.actions.done, lang) : tr(STR.actions.complete, lang)}</button>
                    </div>
                  );
                })}
              </div>

              {/* Task editor */}
              <div className="rounded-2xl border bg-white p-4 space-y-3">
                <div className="text-sm text-slate-600">{lang==='zh'?'自訂任務（新增／刪除）':'Custom Tasks (Add/Delete)'}</div>
                <div className="grid md:grid-cols-3 gap-2">
                  <input placeholder={tr(STR.prompts.addTaskName, lang)} value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="h-9 rounded-md border px-2" />
                  <input placeholder={tr(STR.prompts.addTaskCat, lang)} value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="h-9 rounded-md border px-2" />
                  <button onClick={addTask} className="h-9 rounded-md bg-indigo-600 px-3 text-white">{tr(STR.actions.addTask, lang)}</button>
                </div>
                <div className="grid md:grid-cols-2 gap-2">
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-xl border p-2 text-sm">
                      <div><span className="text-slate-500 mr-2">{tCat(t)}</span>{tName(t)}</div>
                      <button onClick={() => removeTask(t.id)} className="h-8 rounded-md border px-3">{tr(STR.actions.delete, lang)}</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'shop' && (
          <div className="rounded-2xl border bg-white p-4 space-y-3">
            <div className="text-sm text-slate-600">{tr(STR.stats.balance, lang)} {balance}（{tr(STR.stats.monthSpent, lang)} {monthSpent}／{tr(STR.stats.monthlyCap, lang)} {budgetCap}）</div>
            <div className="grid md:grid-cols-3 gap-3">
              {SHOP_ITEMS.map((item) => (
                <div key={item.id} className="rounded-xl border p-4 space-y-2">
                  <div className="text-lg font-semibold">{item.name[lang]}</div>
                  <div className="text-sm text-slate-500">{lang==='zh'?'價格：':'Price: $'}{lang==='zh' ? `$${item.price}` : item.price}</div>
                  <button onClick={() => { buy(item); setTimeout(() => checkAchievements(lang==='zh'?'購買/餘額變動':'Purchase/Balance change'), 0); }} disabled={!canSpend || balance < item.price} className={`h-9 rounded-md px-3 ${!canSpend || balance < item.price ? 'bg-slate-200' : 'bg-emerald-600 text-white'}`}>{tr(STR.actions.buy, lang)}</button>
                  {!canSpend && <div className="text-xs text-slate-400">{monthSpent >= budgetCap ? tr(STR.actions.reachedCap, lang, { cap: budgetCap }) : tr(STR.actions.notEnough, lang)}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="rounded-2xl border bg-white p-4 space-y-3">
            <div className="font-semibold">{lang==='zh'?'收支與任務紀錄':'Ledger & Task History'}（{kids.find(k=>k.id===currentKidId)?.name}）</div>
            <div className="grid gap-2 max-h-[50vh] overflow-auto">
              {[...ledger].reverse().map((l, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl border p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-white ${l.type === 'earn' ? 'bg-emerald-500' : 'bg-rose-500'}`}>{l.type === 'earn' ? '+' : '-'}${l.amount}</span>
                    <span>{l.note}</span>
                  </div>
                  <div className="text-slate-400">{new Date(l.ts).toLocaleString()}</div>
                </div>
              ))}
              {ledger.length === 0 && <div className="text-slate-500 text-sm">{lang==='zh'?'目前沒有紀錄':'No records yet'}</div>}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="rounded-2xl border bg-white p-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border p-4 space-y-2">
                <div className="font-semibold">{lang==='zh'?'金錢／上限（僅目前孩子）':'Money / Limits (current kid only)'}</div>
                <label className="flex items-center gap-2 text-sm">
                  {tr(STR.settings.moneyCountPerDay, lang)}
                  <input type="number" min={0} max={10} value={paidTasksPerDay} onChange={(e) => setPaidTasksPerDay(Math.max(0, Number(e.target.value || 0)))} className="h-9 w-24 rounded-md border px-2" />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  {tr(STR.settings.moneyPerTask, lang)}
                  <input type="number" min={0} value={moneyPerPaidTask} onChange={(e) => setMoneyPerPaidTask(Math.max(0, Number(e.target.value || 0)))} className="h-9 w-24 rounded-md border px-2" />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  {tr(STR.settings.monthlyCap, lang)}
                  <input type="number" min={0} value={budgetCap} onChange={(e) => setBudgetCap(Math.max(0, Number(e.target.value || 0)))} className="h-9 w-28 rounded-md border px-2" />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  {tr(STR.settings.dailyGoal, lang)}
                  <input type="number" min={0} value={dailyGoal} onChange={(e) => setDailyGoal(Math.max(0, Number(e.target.value || 0)))} className="h-9 w-28 rounded-md border px-2" />
                </label>
                <div className="text-xs text-slate-500">
                  {tr(STR.hints.suggestBudget, lang, { a: paidTasksPerDay, b: moneyPerPaidTask })}
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-2">
                <div className="font-semibold">{tr(STR.settings.kidManage, lang)}</div>
                <div className="text-sm text-slate-600">{tr(STR.hints.kidNow, lang)}{kids.find(k=>k.id===currentKidId)?.name}</div>
                <div className="text-xs text-slate-500">{tr(STR.hints.kidDeleteWarn, lang)}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="rounded-2xl border bg-white p-4 space-y-4">
            <div className="font-semibold">{lang==='zh'?'成就徽章':'Achievements'}</div>
            <div className="grid md:grid-cols-3 gap-3">
              {ACHIEVEMENTS.map(a => {
                const cur = currentValueOf(a.metric);
                const pct = Math.min(100, Math.round((cur / a.target) * 100));
                const owned = unlockedBadges.includes(a.id);
                return (
                  <div key={a.id} className={`rounded-xl border p-4 ${owned ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-semibold">{owned ? '🏅 ' : '🔒 '}{a.title[lang]}</div>
                      <div className="text-xs text-slate-500">{cur}/{a.target}</div>
                    </div>
                    <div className="text-sm text-slate-600 mt-1">{a.desc[lang]}</div>
                    <div className="h-2 w-full bg-slate-200 rounded mt-3 overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                    </div>
                    {!owned && <div className="text-xs text-slate-500 mt-1">{lang==='zh'?'再努力一下就解鎖了！':'Almost there!'}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <footer className="text-center text-xs text-slate-400 py-6">
          {tr(STR.version, lang)} • 多小孩 / Streak / Achievements
        </footer>
      </div>

      {/* Simple modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">{modal.title}</div>
            <div className="mb-4 whitespace-pre-line text-slate-700">{modal.content}</div>
            <div className="text-right">
              <button className="h-9 rounded-md bg-indigo-600 px-3 text-white" onClick={() => setModal(null)}>{STR.modals.ok[lang]}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
