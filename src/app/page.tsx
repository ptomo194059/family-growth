'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';

type Task = { id: string; label: string; category: string };
type Ledger = { ts: number; type: 'earn' | 'spend'; amount: number; note: string };
type Dump = {
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
    shopPin: string;
  };
};

const fmtDate = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
const todayStr = fmtDate();

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

export default function Page() {
  const [date, setDate] = useState<string>(todayStr);
  const [tasks, setTasks] = useState<Task[]>(() => load('fga_tasks', DEFAULT_TASKS));
  const [paidToday, setPaidToday] = useState<string[]>(() => load(`fga_paid_${todayStr}`, []));
  const [completed, setCompleted] = useState<string[]>(() => load(`fga_done_${todayStr}`, []));
  const [stars, setStars] = useState<number>(() => load('fga_stars', 0));
  const [balance, setBalance] = useState<number>(() => load('fga_balance', 0));
  const [ledger, setLedger] = useState<Ledger[]>(() => load('fga_ledger', []));
  const [budgetCap, setBudgetCap] = useState<number>(() => load('fga_budgetCap', 300));

  // 新增：設定面板
  const [paidTasksPerDay, setPaidTasksPerDay] = useState<number>(() => load('fga_paidTasksPerDay', 3));
  const [moneyPerPaidTask, setMoneyPerPaidTask] = useState<number>(() => load('fga_moneyPerPaidTask', 5));
  const [shopPin, setShopPin] = useState<string>(() => load('fga_shopPin', '')); // 空字串=不啟用 PIN

  // UI 狀態
  const [toast, setToast] = useState<string>('');
  const [modal, setModal] = useState<{ title: string; content: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'shop' | 'history' | 'settings'>('tasks');

  // 匯入檔 input 參考
  const fileRef = useRef<HTMLInputElement | null>(null);

  // persist
  useEffect(() => save('fga_tasks', tasks), [tasks]);
  useEffect(() => save('fga_stars', stars), [stars]);
  useEffect(() => save('fga_balance', balance), [balance]);
  useEffect(() => save('fga_ledger', ledger), [ledger]);
  useEffect(() => save('fga_budgetCap', budgetCap), [budgetCap]);
  useEffect(() => save('fga_paidTasksPerDay', paidTasksPerDay), [paidTasksPerDay]);
  useEffect(() => save('fga_moneyPerPaidTask', moneyPerPaidTask), [moneyPerPaidTask]);
  useEffect(() => save('fga_shopPin', shopPin), [shopPin]);
  useEffect(() => save(`fga_paid_${date}`, paidToday), [date, paidToday]);
  useEffect(() => save(`fga_done_${date}`, completed), [date, completed]);

  // switch date -> load that day data
  useEffect(() => {
    setPaidToday(load(`fga_paid_${date}`, []));
    setCompleted(load(`fga_done_${date}`, []));
  }, [date]);

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
        ? `今日有錢任務：${selected.map((id) => tasks.find((t) => t.id === id)?.label).join('、')}`
        : '今日未設定可領現金任務'
    );
  }

  function toggleComplete(id: string) {
    const done = completed.includes(id);
    const next = done ? completed.filter((x) => x !== id) : [...completed, id];
    setCompleted(next);
    if (!done) {
      setStars((s) => s + 1);
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
    }
  }

  // 家長 PIN 檢查
  function verifyPin(): boolean {
    if (!shopPin) return true; // 未啟用 PIN
    const input = window.prompt('請輸入家長 PIN 才能進行購買：') || '';
    if (input === shopPin) return true;
    setToast('PIN 錯誤，無法購買');
    return false;
  }

  function buy(item: (typeof SHOP_ITEMS)[number]) {
    if (!verifyPin()) return;
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

  // 匯出 / 匯入
  function exportJSON() {
    const dump: Dump = {
      date,
      tasks,
      stars,
      balance,
      ledger,
      budgetCap,
      paidToday,
      completed,
      settings: { paidTasksPerDay, moneyPerPaidTask, shopPin },
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fname = `家庭成長任務_備份_${new Date().toISOString().slice(0, 10)}.json`;
    a.download = fname;
    a.click();
    URL.revokeObjectURL(url);
    setToast('已匯出 JSON 備份檔');
  }

  function importJSONFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result as string) as Dump;
        // 邏輯：不覆蓋今天以外的完成/paid 記錄；主要資料、設定覆蓋
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
        setShopPin(obj.settings?.shopPin ?? '');
        setToast('匯入完成');
      } catch {
        setToast('匯入失敗：檔案格式不正確');
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold">🏠 家庭成長任務（平板版 / 進階版）</h1>
          <div className="flex flex-wrap items-center gap-2">
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
          {(['tasks', 'shop', 'history', 'settings'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setActiveTab(k)}
              className={`h-9 rounded-md px-3 border ${activeTab === k ? 'bg-slate-900 text-white' : 'bg-white'}`}
            >
              {k === 'tasks' ? '任務' : k === 'shop' ? '商店' : k === 'history' ? '紀錄' : '設定'}
            </button>
          ))}
        </div>

        {/* Toast */}
        {toast && <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-emerald-700">{toast}</div>}

        {activeTab === 'tasks' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">星星</div><div className="text-2xl font-semibold">{stars}</div></div>
              <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">餘額（$）</div><div className="text-2xl font-semibold">{balance}</div></div>
              <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">本月已花</div><div className="text-2xl font-semibold">{monthSpent}</div></div>
              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs text-slate-500">月度上限</div>
                <input type="number" value={budgetCap} onChange={(e) => setBudgetCap(Math.max(0, Number(e.target.value || 0)))} className="h-9 w-24 rounded-md border px-2" />
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

            {/* Task editor */}
            <div className="rounded-2xl border bg-white p-4 space-y-3">
              <div className="text-sm text-slate-600">自訂任務（新增／刪除）</div>
              <div className="grid md:grid-cols-3 gap-2">
                <input placeholder="任務名稱（例如：背單字 5 個）" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="h-9 rounded-md border px-2" />
                <input placeholder="分類（例如：學業/生活）" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="h-9 rounded-md border px-2" />
                <button onClick={addTask} className="h-9 rounded-md bg-indigo-600 px-3 text-white">新增任務</button>
              </div>
              <div className="grid md:grid-cols-2 gap-2">
                {tasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border p-2 text-sm">
                    <div><span className="text-slate-500 mr-2">{t.category}</span>{t.label}</div>
                    <button onClick={() => removeTask(t.id)} className="h-8 rounded-md border px-3">刪除</button>
                  </div>
                ))}
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
                  <button onClick={() => buy(item)} disabled={!canSpend || balance < item.price} className={`h-9 rounded-md px-3 ${!canSpend || balance < item.price ? 'bg-slate-200' : 'bg-emerald-600 text-white'}`}>兌換</button>
                  {!canSpend && <div className="text-xs text-slate-400">{monthSpent >= budgetCap ? `已達月度上限 ${budgetCap}` : '餘額不足'}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="rounded-2xl border bg-white p-4 space-y-3">
            <div className="font-semibold">收支與任務紀錄</div>
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
                <div className="font-semibold">金錢／上限</div>
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
                <div className="text-xs text-slate-500">建議：若一週 5 天、每日 3 項 × ${moneyPerPaidTask}，月總額 ≈ 5×4×3×{moneyPerPaidTask} 元。</div>
              </div>

              <div className="rounded-xl border p-4 space-y-2">
                <div className="font-semibold">商店家長鎖（PIN）</div>
                <label className="flex items-center gap-2 text-sm">
                  設定 PIN（空白=不啟用）：
                  <input type="password" value={shopPin} onChange={(e) => setShopPin(e.target.value.trim())} className="h-9 rounded-md border px-2" placeholder="例如 1234" />
                </label>
                <div className="text-xs text-slate-500">啟用後，購買前會要求輸入 PIN。</div>
              </div>
            </div>
          </div>
        )}

        <footer className="text-center text-xs text-slate-400 py-6">
          v1.1 • 加入匯出/匯入、設定面板（每日可領現金任務數、每項金額、月度上限）、商店 PIN 鎖
        </footer>
      </div>

      {/* Simple modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">{modal.title}</div>
            <div className="mb-4 text-slate-700">{modal.content}</div>
            <div className="text-right">
              <button className="h-9 rounded-md bg-indigo-600 px-3 text-white" onClick={() => setModal(null)}>好的</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
