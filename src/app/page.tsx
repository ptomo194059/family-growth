'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';

type Task = { id: string; label: string; category: string };
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

const fmtDate = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
const todayStr = fmtDate();

// ---------- storage helpers ----------
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
// kid-scoped key
const kkey = (kidId: string, k: string) => `fga_${kidId}_${k}`;

// ---------- defaults ----------
const DEFAULT_TASKS: Task[] = [
  { id: 'hw', label: '完成作業', category: '學業' },
  { id: 'piano', label: '鋼琴練習 15 分鐘', category: '音樂' },
  { id: 'art', label: '畫畫／手作 20 分鐘', category: '藝術' },
  { id: 'sport', label: '運動 15 分鐘（跳繩/騎車/球類）', category: '運動' },
  { id: 'meal', label: '30 分鐘內吃完飯（不挑食）', category: '生活' },
  { id: 'chore', label: '家務幫手（收玩具/擺碗筷）', category: '家務' },
];

const SURPRISE_CARDS = [
  { id: 'hug', name: '擁抱券', description: '3 分鐘大抱抱' },
  { id: 'story', name: '加碼睡前故事', description: '多聽 1 個故事' },
  { id: 'snack', name: '小點心券', description: '一份健康小點心' },
  { id: 'park', name: '公園遊戲時間', description: '週末 1 小時' },
  { id: 'game', name: '休閒遊戲時間', description: '加碼 30 分鐘' },
];

const SHOP_ITEMS = [
  { id: 'draw', name: '抽驚喜卡', price: 10 as const, action: 'draw' as const },
  { id: 'chest', name: '開寶箱', price: 30 as const, action: 'chest' as const },
  { id: 'sticker', name: '可愛貼紙', price: 20 as const, action: 'item' as const, payload: '貼紙 1 張' },
  { id: 'marker', name: '彩色筆 1 支', price: 30 as const, action: 'item' as const, payload: '彩色筆' },
  { id: 'book', name: '小書一本', price: 80 as const, action: 'item' as const, payload: '小繪本' },
];

// ---------- Achievements ----------
type Achievement = {
  id: string;
  title: string;
  desc: string;
  target: number;
  metric: 'totalCompleted' | 'streak' | 'stars' | 'balance';
};
const ACHIEVEMENTS: Achievement[] = [
  { id: 'tc_10', title: '初入門', desc: '累計完成 10 項任務', target: 10, metric: 'totalCompleted' },
  { id: 'tc_50', title: '努力不懈', desc: '累計完成 50 項任務', target: 50, metric: 'totalCompleted' },
  { id: 'tc_100', title: '任務大師', desc: '累計完成 100 項任務', target: 100, metric: 'totalCompleted' },
  { id: 'streak_3', title: '開啟習慣', desc: '連續達標 3 天', target: 3, metric: 'streak' },
  { id: 'streak_7', title: '一週達標', desc: '連續達標 7 天', target: 7, metric: 'streak' },
  { id: 'streak_14', title: '堅持兩週', desc: '連續達標 14 天', target: 14, metric: 'streak' },
  { id: 'star_10', title: '星星收藏家', desc: '星星累積 10 顆', target: 10, metric: 'stars' },
  { id: 'balance_100', title: '小財神', desc: '帳戶餘額達 $100', target: 100, metric: 'balance' },
];

export default function Page() {
  // ---- 家庭 / 小孩管理 ----
  const [kids, setKids] = useState<Kid[]>(() =>
    load<Kid[]>('fga_kids', [{ id: 'kid1', name: '小勇士', createdAt: Date.now() }])
  );
  const [currentKidId, setCurrentKidId] = useState<string>(() =>
    load<string>('fga_currentKidId', 'kid1')
  );

  useEffect(() => {
    if (!kids.find(k => k.id === currentKidId)) {
      setCurrentKidId(kids[0]?.id || 'kid1');
    }
  }, [kids, currentKidId]);
  useEffect(() => save('fga_kids', kids), [kids]);
  useEffect(() => save('fga_currentKidId', currentKidId), [currentKidId]);

  // ---- 資料（以小孩為命名空間）----
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

  const [totalCompleted, setTotalCompleted] = useState<number>(0); // 🆕 累計完成數
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]); // 🆕 已解鎖徽章

  const [toast, setToast] = useState<string>('');
  const [modal, setModal] = useState<{ title: string; content: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'shop' | 'history' | 'settings' | 'badges'>('tasks');

  const fileRef = useRef<HTMLInputElement | null>(null);

  // 讀取 kid 資料
  useEffect(() => {
    const kidId = currentKidId;
    setTasks(load(kkey(kidId, 'tasks'), DEFAULT_TASKS));
    setStars(load(kkey(kidId, 'stars'), 0));
    setBalance(load(kkey(kidId, 'balance'), 0));
    setLedger(load(kkey(kidId, 'ledger'), []));
    setBudgetCap(load(kkey(kidId, 'budgetCap'), 300));
    setPaidTasksPerDay(load(kkey(kidId, 'paidTasksPerDay'), 3));
    setMoneyPerPaidTask(load(kkey(kidId, 'moneyPerPaidTask'), 5));
    setDailyGoal(load(kkey(kidId, 'dailyGoal'), 3));
    setTotalCompleted(load(kkey(kidId, 'totalCompleted'), 0));
    setUnlockedBadges(load(kkey(kidId, 'badges'), []));

    // 當天資料
    setPaidToday(load(kkey(kidId, `paid_${date}`), []));
    setCompleted(load(kkey(kidId, `done_${date}`), []));
  }, [currentKidId]);

  // 切換日期時，讀該日期資料
  useEffect(() => {
    const kidId = currentKidId;
    setPaidToday(load(kkey(kidId, `paid_${date}`), []));
    setCompleted(load(kkey(kidId, `done_${date}`), []));
  }, [date, currentKidId]);

  // 持久化（kid 範圍）
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

  // ---- 統計 ----
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

  // 最近 7 天完成數
  const last7 = useMemo(() => {
    const arr: { day: string; count: number }[] = [];
    const base = new Date(date);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const ds = fmtDate(d);
      const cnt = load<string[]>(kkey(currentKidId, `done_${ds}`), []).length;
      arr.push({ day: ds.slice(5), count: cnt }); // MM-DD
    }
    return arr;
  }, [date, currentKidId]);

  // 連續達標（以 dailyGoal 為標準，往回數）
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

  // ---- 成就：計算目前進度 ----
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
      const titles = newly.map(n => `🏅 ${n.title}`).join('、');
      setModal({
        title: '恭喜解鎖徽章！',
        content: `${titles}\n${triggerNote ? `（來源：${triggerNote}）` : ''}`,
      });
    }
  }

  // ---- 邏輯 ----
  function drawPaidTasks() {
    const pool = [...tasks];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const n = Math.max(0, Math.min(paidTasksPerDay, pool.length));
    const selected = pool.slice(0, n).map((t) => t.id);
    setPaidToday(selected);
    setToast(
      selected.length
        ? `今日有錢任務（${selected.length}/${paidTasksPerDay}）：${selected
            .map((id) => tasks.find((t) => t.id === id)?.label)
            .join('、')}`
        : '今日未設定可領現金任務'
    );
  }

  function toggleComplete(id: string) {
    const wasDone = completed.includes(id);
    const next = wasDone ? completed.filter((x) => x !== id) : [...completed, id];
    setCompleted(next);
    if (!wasDone) {
      setStars((s) => s + 1);
      setTotalCompleted((n) => n + 1); // 🆕 累計 +1
      if (paidToday.includes(id)) {
        const money = moneyPerPaidTask;
        setBalance((b) => b + money);
        setLedger((l) => [
          ...l,
          { ts: Date.now(), type: 'earn', amount: money, note: `完成「${tasks.find((t) => t.id === id)?.label}」` },
        ]);
      }
      setToast(
        `完成：${tasks.find((t) => t.id === id)?.label}（⭐+1${
          paidToday.includes(id) ? `，$+${moneyPerPaidTask}` : ''
        }）`
      );
      // 檢查成就（以這次完成為觸發）
      setTimeout(() => checkAchievements('完成任務'), 0);
    } else {
      // 若取消完成，累計不回退（徽章不會撤銷）
      setToast(`已取消：${tasks.find((t) => t.id === id)?.label}`);
    }
  }

  function buy(item: (typeof SHOP_ITEMS)[number]) {
    if (!canSpend) {
      setToast(monthSpent >= budgetCap ? `本月已達 ${budgetCap} 元上限` : '餘額不足');
      return;
    }
    if (balance < item.price) {
      setToast(`餘額不足，需要 $${item.price}`);
      return;
    }
    setBalance((b) => b - item.price);
    setLedger((l) => [...l, { ts: Date.now(), type: 'spend', amount: item.price, note: `購買：${item.name}` }]);

    if (item.action === 'draw') {
      const pick = SURPRISE_CARDS[Math.floor(Math.random() * SURPRISE_CARDS.length)];
      setModal({ title: '抽到驚喜卡！', content: `${pick.name} — ${pick.description}` });
    } else if (item.action === 'chest') {
      const chestRewards = ['貼紙包', '小玩具', '家庭活動券（公園）', '故事加碼券', '健康小點心'];
      const r = chestRewards[Math.floor(Math.random() * chestRewards.length)];
      setModal({ title: '寶箱開啟！', content: `獲得：${r}` });
    } else if (item.action === 'item') {
      setModal({ title: '兌換成功', content: item.payload || item.name });
    }
  }

  function resetDay() {
    setCompleted([]);
    setPaidToday([]);
    setToast('已清空今日紀錄');
  }

  // 任務編輯
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState('');
  function addTask() {
    const l = newLabel.trim();
    const c = (newCategory.trim() || '其他').slice(0, 12);
    if (!l) return;
    const id = l.slice(0, 12).replace(/\s+/g, '_') + '_' + Math.random().toString(36).slice(2, 6);
    setTasks((prev) => [...prev, { id, label: l, category: c }]);
    setNewLabel('');
    setNewCategory('');
  }
  function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  // 匯出 / 匯入（僅「目前孩子」）
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
    const fname = `家庭成長任務_備份_${kid.name}_${new Date().toISOString().slice(0, 10)}.json`;
    a.download = fname;
    a.click();
    URL.revokeObjectURL(url);
    setToast(`已匯出 ${kid.name} 的 JSON 備份`);
  }
  function importJSONFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result as string) as Dump;
        const kid = kids.find(k => k.id === currentKidId)!;
        setDate(obj.date || todayStr);
        setTasks(obj.tasks ?? DEFAULT_TASKS);
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
        setToast(`已匯入到 ${kid.name}`);
        setTimeout(() => checkAchievements('匯入資料'), 0);
      } catch {
        setToast('匯入失敗：檔案格式不正確');
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  // 新增 / 切換孩子
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
    setToast(`已新增孩子：${name}`);
  }
  function renameCurrentKid(name: string) {
    setKids(kids.map(k => (k.id === currentKidId ? { ...k, name: name.trim() || k.name } : k)));
  }
  function removeCurrentKid() {
    if (kids.length <= 1) {
      setToast('至少保留一位孩子');
      return;
    }
    const kid = kids.find(k => k.id === currentKidId)!;
    if (!window.confirm(`確定刪除「${kid.name}」的資料嗎？此動作無法復原。`)) return;
    const next = kids.filter(k => k.id !== currentKidId);
    setKids(next);
    setCurrentKidId(next[0].id);
    setToast(`已刪除：${kid.name}`);
  }

  // 初次載入或重要變動時檢查成就
  useEffect(() => {
    checkAchievements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak, stars, balance]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">🏠 家庭成長任務（v1.3 成就徽章）</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* kid switcher */}
            <select
              className="h-9 rounded-md border px-2"
              value={currentKidId}
              onChange={(e) => setCurrentKidId(e.target.value)}
              title="切換孩子"
            >
              {kids.map(k => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
            <input
              className="h-9 rounded-md border px-2"
              placeholder="新增孩子名稱"
              value={newKidName}
              onChange={(e)=>setNewKidName(e.target.value)}
            />
            <button onClick={addKid} className="h-9 rounded-md border px-3">新增孩子</button>
            <button
              onClick={()=>{
                const n = window.prompt('修改孩子名稱：', kids.find(k=>k.id===currentKidId)?.name || '');
                if (n!=null) renameCurrentKid(n);
              }}
              className="h-9 rounded-md border px-3"
            >改名</button>
            <button onClick={removeCurrentKid} className="h-9 rounded-md border px-3">刪除孩子</button>

            <span className="mx-2 text-slate-400">|</span>

            <span className="text-sm text-slate-600">日期：</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 rounded-md border px-2" />

            <button onClick={drawPaidTasks} className="h-9 rounded-md bg-indigo-600 px-3 text-white">抽今日可領現金任務</button>
            <button onClick={exportJSON} className="h-9 rounded-md border px-3">匯出資料</button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]; if (f) importJSONFile(f);
              if (fileRef.current) fileRef.current.value = '';
            }} />
            <button onClick={() => fileRef.current?.click()} className="h-9 rounded-md border px-3">匯入資料</button>
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
              {k === 'tasks' ? '任務' : k === 'shop' ? '商店' : k === 'history' ? '紀錄' : k === 'settings' ? '設定' : '徽章'}
            </button>
          ))}
        </div>

        {/* Toast */}
        {toast && <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-emerald-700">{toast}</div>}

        {activeTab === 'tasks' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">星星</div><div className="text-2xl font-semibold">{stars}</div></div>
              <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">餘額（$）</div><div className="text-2xl font-semibold">{balance}</div></div>
              <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">本月已花</div><div className="text-2xl font-semibold">{monthSpent}</div></div>
              <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">月度上限</div>
                <input type="number" value={budgetCap} onChange={(e) => setBudgetCap(Math.max(0, Number(e.target.value || 0)))} className="h-9 w-24 rounded-md border px-2" />
              </div>
              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs text-slate-500">連續達標（目標 {dailyGoal}/天）</div>
                <div className="text-2xl font-semibold">{streak} 天</div>
                <div className="text-xs text-slate-500 mt-1">累計完成：{totalCompleted}</div>
              </div>
            </div>

            {/* 最近7日完成數 */}
            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm font-medium mb-2">最近 7 天完成數</div>
              <div className="grid grid-cols-7 gap-2">
                {last7.map(d => (
                  <div key={d.day} className="flex flex-col items-center gap-1">
                    <div className="w-6 h-20 rounded bg-slate-100 relative overflow-hidden">
                      <div
                        className="absolute bottom-0 w-full bg-indigo-500"
                        style={{ height: `${Math.min(100, d.count * 20)}%` }}
                        title={`${d.count} 項`}
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
                  今日可領現金任務（{paidToday.length}/{paidTasksPerDay}）：{
                    paidToday.length ? paidToday.map((id) => tasks.find((t) => t.id === id)?.label).join('、') : '尚未抽取'
                  }
                </div>
                <button onClick={resetDay} className="h-9 rounded-md border px-3">清空今日紀錄</button>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {tasks.map((t) => {
                  const isPaid = paidToday.includes(t.id);
                  const done = completed.includes(t.id);
                  return (
                    <div key={t.id} className={`flex items-center justify-between rounded-xl border p-3 ${done ? 'bg-emerald-50' : 'bg-white'}`}>
                      <div>
                        <div className="text-xs text-slate-500">{t.category}</div>
                        <div className="font-medium text-lg">{t.label}</div>
                        <div className="text-xs text-slate-500">完成獎勵：⭐+1 {isPaid ? `，$+${moneyPerPaidTask}（今日）` : ''}</div>
                      </div>
                      <button onClick={() => toggleComplete(t.id)} className={`h-9 rounded-md px-3 ${done ? 'bg-slate-200' : 'bg-indigo-600 text-white'}`}>{done ? '已完成' : '完成'}</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === 'shop' && (
          <div className="rounded-2xl border bg-white p-4 space-y-3">
            <div className="text-sm text-slate-600">餘額：${balance}（本月已花 {monthSpent}／上限 {budgetCap}）</div>
            <div className="grid md:grid-cols-3 gap-3">
              {SHOP_ITEMS.map((item) => (
                <div key={item.id} className="rounded-xl border p-4 space-y-2">
                  <div className="text-lg font-semibold">{item.name}</div>
                  <div className="text-sm text-slate-500">價格：${item.price}</div>
                  <button onClick={() => { buy(item); setTimeout(() => checkAchievements('購買/餘額變動'), 0); }} disabled={!canSpend || balance < item.price} className={`h-9 rounded-md px-3 ${!canSpend || balance < item.price ? 'bg-slate-200' : 'bg-emerald-600 text-white'}`}>兌換</button>
                  {!canSpend && <div className="text-xs text-slate-400">{monthSpent >= budgetCap ? `已達月度上限 ${budgetCap}` : '餘額不足'}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="rounded-2xl border bg-white p-4 space-y-3">
            <div className="font-semibold">收支與任務紀錄（{kids.find(k=>k.id===currentKidId)?.name}）</div>
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
              {ledger.length === 0 && <div className="text-slate-500 text-sm">目前沒有紀錄</div>}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="rounded-2xl border bg-white p-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border p-4 space-y-2">
                <div className="font-semibold">金錢／上限（僅目前孩子）</div>
                <label className="flex items-center gap-2 text-sm">
                  每日可領現金任務數：
                  <input type="number" min={0} max={10} value={paidTasksPerDay} onChange={(e) => setPaidTasksPerDay(Math.max(0, Number(e.target.value || 0)))} className="h-9 w-24 rounded-md border px-2" />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  每項現金獎勵金額（$）：
                  <input type="number" min={0} value={moneyPerPaidTask} onChange={(e) => setMoneyPerPaidTask(Math.max(0, Number(e.target.value || 0)))} className="h-9 w-24 rounded-md border px-2" />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  月度支出上限（$）：
                  <input type="number" min={0} value={budgetCap} onChange={(e) => setBudgetCap(Math.max(0, Number(e.target.value || 0)))} className="h-9 w-28 rounded-md border px-2" />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  每日目標完成項數（Streak 用）：
                  <input type="number" min={0} value={dailyGoal} onChange={(e) => setDailyGoal(Math.max(0, Number(e.target.value || 0)))} className="h-9 w-28 rounded-md border px-2" />
                </label>
                <div className="text-xs text-slate-500">建議：若一週 5 天、每日 {paidTasksPerDay} 項 × ${moneyPerPaidTask}，月總額 ≈ 5×4×{paidTasksPerDay}×{moneyPerPaidTask} 元。</div>
              </div>

              <div className="rounded-xl border p-4 space-y-2">
                <div className="font-semibold">孩子資料管理</div>
                <div className="text-sm text-slate-600">目前：{kids.find(k=>k.id===currentKidId)?.name}</div>
                <div className="text-xs text-slate-500">提示：刪除孩子會移除其 localStorage 中資料；建議先匯出備份。</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="rounded-2xl border bg-white p-4 space-y-4">
            <div className="font-semibold">成就徽章</div>
            <div className="grid md:grid-cols-3 gap-3">
              {ACHIEVEMENTS.map(a => {
                const cur = currentValueOf(a.metric);
                const pct = Math.min(100, Math.round((cur / a.target) * 100));
                const owned = unlockedBadges.includes(a.id);
                return (
                  <div key={a.id} className={`rounded-xl border p-4 ${owned ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-semibold">{owned ? '🏅 ' : '🔒 '}{a.title}</div>
                      <div className="text-xs text-slate-500">{cur}/{a.target}</div>
                    </div>
                    <div className="text-sm text-slate-600 mt-1">{a.desc}</div>
                    <div className="h-2 w-full bg-slate-200 rounded mt-3 overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                    </div>
                    {!owned && <div className="text-xs text-slate-500 mt-1">再努力一下就解鎖了！</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <footer className="text-center text-xs text-slate-400 py-6">
          v1.3 • 成就徽章（任務累計/連續達標/星星/餘額）• 每位孩子獨立儲存
        </footer>
      </div>

      {/* Simple modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">{modal.title}</div>
            <div className="mb-4 whitespace-pre-line text-slate-700">{modal.content}</div>
            <div className="text-right">
              <button className="h-9 rounded-md bg-indigo-600 px-3 text-white" onClick={() => setModal(null)}>好的</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
