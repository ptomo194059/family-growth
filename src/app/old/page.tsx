// src/app/page.tsx
'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Lang, Task, Kid, Ledger, Dump } from '../../domain/types';
import { STR, tr } from '../../domain/i18n';
import { DEFAULT_TASKS, SURPRISE_CARDS, SHOP_ITEMS, ACHIEVEMENTS } from '../../domain/defaults';
import { load, save, kkey, kidPrefix, removeByPrefix, todayStr, fmtDate } from '../../storage/local';
import { calcMonthSpent, calcLast7, calcStreak } from '../../logic/stats';
import { computeUnlocks, buildUnlockedMessage } from '../../logic/achievements';
import { canSpend, applyPurchase } from '../../logic/shop';

import StatsCard from '../../components/StatsCard';
import Bar7 from '../../components/Bar7';
import Tabs from '../../components/Tabs';
import TaskItem from '../../components/TaskItem';
import TaskEditor from '../../components/TaskEditor';
import Modal from '../../components/Modal';

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
    if (!kids.find((k) => k.id === currentKidId)) {
      setCurrentKidId(kids[0]?.id || 'kid1');
    }
  }, [kids, currentKidId]);
  useEffect(() => save('fga_kids', kids), [kids]);
  useEffect(() => save('fga_currentKidId', currentKidId), [currentKidId]);

  /** per-kid 狀態 */
  const [date, setDate] = useState<string>(todayStr);
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
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
  const [activeTab, setActiveTab] = useState<'tasks' | 'shop' | 'history' | 'settings' | 'badges'>(
    'tasks'
  );

  const fileRef = useRef<HTMLInputElement | null>(null);

  /** 讀取 kid 資料 + 舊版任務相容轉換 */
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
    setTasks(migrated.length ? migrated : DEFAULT_TASKS);

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

  /** 切換日期時載入當天紀錄 */
  useEffect(() => {
    const kidId = currentKidId;
    setPaidToday(load(kkey(kidId, `paid_${date}`), []));
    setCompleted(load(kkey(kidId, `done_${date}`), []));
  }, [date, currentKidId]);

  /** 持久化 */
  useEffect(() => save(kkey(currentKidId, 'tasks'), tasks), [tasks, currentKidId]);
  useEffect(() => save(kkey(currentKidId, 'stars'), stars), [stars, currentKidId]);
  useEffect(() => save(kkey(currentKidId, 'balance'), balance), [balance, currentKidId]);
  useEffect(() => save(kkey(currentKidId, 'ledger'), ledger), [ledger, currentKidId]);
  useEffect(() => save(kkey(currentKidId, 'budgetCap'), budgetCap), [budgetCap, currentKidId]);
  useEffect(
    () => save(kkey(currentKidId, 'paidTasksPerDay'), paidTasksPerDay),
    [paidTasksPerDay, currentKidId]
  );
  useEffect(
    () => save(kkey(currentKidId, 'moneyPerPaidTask'), moneyPerPaidTask),
    [moneyPerPaidTask, currentKidId]
  );
  useEffect(() => save(kkey(currentKidId, 'dailyGoal'), dailyGoal), [dailyGoal, currentKidId]);
  useEffect(
    () => save(kkey(currentKidId, `paid_${date}`), paidToday),
    [date, paidToday, currentKidId]
  );
  useEffect(
    () => save(kkey(currentKidId, `done_${date}`), completed),
    [date, completed, currentKidId]
  );
  useEffect(
    () => save(kkey(currentKidId, 'totalCompleted'), totalCompleted),
    [totalCompleted, currentKidId]
  );
  useEffect(
    () => save(kkey(currentKidId, 'badges'), unlockedBadges),
    [unlockedBadges, currentKidId]
  );

  /** 統計 */
  const monthSpent = useMemo(() => calcMonthSpent(ledger, date), [ledger, date]);
  const last7 = useMemo(() => calcLast7(currentKidId, date), [date, currentKidId]);
  const streak = useMemo(
    () => calcStreak(currentKidId, date, dailyGoal),
    [date, currentKidId, dailyGoal]
  );
  const canSpendNow = canSpend(balance, monthSpent, budgetCap);

  /** 成就 */
  useEffect(() => {
    const { newly, unlockedAll } = computeUnlocks(
      ACHIEVEMENTS,
      { totalCompleted, streak, stars, balance },
      unlockedBadges
    );
    if (newly.length) {
      setUnlockedBadges(unlockedAll);
      setModal({
        title: STR.modals.unlocked[lang],
        content: buildUnlockedMessage(ACHIEVEMENTS, newly, lang),
      });
    }
  }, [totalCompleted, streak, stars, balance, lang]);

  /** 小工具 */
  function tName(t: Task) {
    return t.name?.[lang] ?? t.label ?? '';
  }
  function tCat(t: Task) {
    return t.category?.[lang] ?? t.categoryOld ?? '';
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

  function toggleComplete(id: string) {
    const wasDone = completed.includes(id);
    const next = wasDone ? completed.filter((x) => x !== id) : [...completed, id];
    setCompleted(next);

    if (!wasDone) {
      setStars((s) => s + 1);
      setTotalCompleted((n) => n + 1);
      if (paidToday.includes(id)) {
        const money = moneyPerPaidTask;
        setBalance((b) => b + money);
        setLedger((l) => [
          ...l,
          {
            ts: Date.now(),
            type: 'earn',
            amount: money,
            note:
              (lang === 'zh' ? '完成「' : 'Completed "') + (tName(tasks.find((t) => t.id === id)!) || 'Task') + (lang === 'zh' ? '」' : '"'),
          },
        ]);
      }
      setToast(
        `${lang === 'zh' ? '完成：' : 'Done: '}${tName(tasks.find((t) => t.id === id)!)}` +
          `（⭐+1${paidToday.includes(id) ? `，$+${moneyPerPaidTask}` : ''}）`
      );
    } else {
      setToast(`${lang === 'zh' ? '已取消：' : 'Canceled: '}${tName(tasks.find((t) => t.id === id)!)}`);
    }
  }

  function buy(item: (typeof SHOP_ITEMS)[number]) {
    if (!canSpendNow) {
      setToast(
        monthSpent >= budgetCap
          ? tr(STR.actions.reachedCap, lang, { cap: budgetCap })
          : tr(STR.actions.notEnough, lang)
      );
      return;
    }
    if (balance < item.price) {
      setToast(`${tr(STR.actions.notEnough, lang)} ($${item.price})`);
      return;
    }
    const outcome = applyPurchase(item, lang, SURPRISE_CARDS);

    setModal({ title: STR.modals[outcome.modalKind!][lang], content: outcome.modalContent });

    setBalance((b) => b - outcome.spend);
    setLedger((l) => [
      ...l,
      { ts: Date.now(), type: 'spend', amount: outcome.spend, note: outcome.ledgerNote },
    ]);
  }

  function resetDay() {
    setCompleted([]);
    setPaidToday([]);
    setToast(lang === 'zh' ? '已清空今日紀錄' : 'Cleared today');
  }

  // 任務編輯（供 TaskEditor 呼叫）
  function addTask(label: string, cat: string) {
    const id =
      label.slice(0, 16).replace(/\s+/g, '_') + '_' + Math.random().toString(36).slice(2, 6);
    setTasks((prev) => [
      ...prev,
      { id, name: { zh: label, en: label }, category: { zh: cat, en: cat } },
    ]);
  }
  function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setPaidToday((prev) => prev.filter((pid) => pid !== id)); // 避免殘留
  }

  // 匯出 / 匯入（僅目前孩子）
  function exportJSON() {
    const kid = kids.find((k) => k.id === currentKidId)!;
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
    const fname = `${lang === 'zh' ? '家庭成長任務_備份' : 'Family_Growth_Backup'}_${kid.name}_${
      new Date().toISOString().slice(0, 10)
    }.json`;
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
        const migrated = (obj.tasks ?? DEFAULT_TASKS).map((t) =>
          t.name && t.category
            ? t
            : {
                ...t,
                name: { zh: t.label ?? '未命名任務', en: t.label ?? 'Task' },
                category: {
                  zh: (t as any).category ?? '其他',
                  en: (t as any).category ?? 'Other',
                },
              }
        );
        setDate(obj.date || todayStr);
        setTasks(migrated.length ? migrated : DEFAULT_TASKS);
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
        const kid = kids.find((k) => k.id === currentKidId)!;
        setToast(`${tr(STR.hints.importOk, lang)} ${kid.name}`);
      } catch {
        setToast(tr(STR.hints.importFail, lang));
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  /** 孩子管理 */
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
    setToast((lang === 'zh' ? '已新增孩子：' : 'Kid added: ') + name);
  }
  function renameCurrentKid(name: string) {
    setKids((prev) => prev.map((k) => (k.id === currentKidId ? { ...k, name: name.trim() || k.name } : k)));
  }
  function removeCurrentKid() {
    if (kids.length <= 1) {
      setToast(lang === 'zh' ? '至少保留一位孩子' : 'Keep at least one kid');
      return;
    }
    const kid = kids.find((k) => k.id === currentKidId)!;
    if (
      !window.confirm(
        lang === 'zh'
          ? `確定刪除「${kid.name}」的資料嗎？此動作無法復原。`
          : `Delete "${kid.name}" data? This cannot be undone.`
      )
    )
      return;
    removeByPrefix(kidPrefix(currentKidId));
    const next = kids.filter((k) => k.id !== currentKidId);
    setKids(next);
    setCurrentKidId(next[0].id);
    setToast((lang === 'zh' ? '已刪除：' : 'Deleted: ') + kid.name);
  }

  /** UI */
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">
              {tr(STR.title, lang)}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Language */}
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
              title={lang === 'zh' ? '切換孩子' : 'Switch kid'}
            >
              {kids.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>

            <input
              className="h-9 rounded-md border px-2"
              placeholder={tr(STR.prompts.addKidPlaceholder, lang)}
              value={newKidName}
              onChange={(e) => setNewKidName(e.target.value)}
            />
            <button onClick={addKid} className="h-9 rounded-md border px-3">
              {tr(STR.actions.addKid, lang)}
            </button>
            <button
              onClick={() => {
                const n = window.prompt(
                  tr(STR.prompts.renameKid, lang),
                  kids.find((k) => k.id === currentKidId)?.name || ''
                );
                if (n != null) renameCurrentKid(n);
              }}
              className="h-9 rounded-md border px-3"
            >
              {tr(STR.actions.renameKid, lang)}
            </button>
            <button onClick={removeCurrentKid} className="h-9 rounded-md border px-3">
              {tr(STR.actions.removeKid, lang)}
            </button>

            <span className="mx-2 text-slate-400">|</span>

            {/* Date */}
            <span className="text-sm text-slate-600">{tr(STR.actions.date, lang)}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={fmtDate(new Date(2100, 0, 1))}
              className="h-9 rounded-md border px-2"
            />

            {/* Export / Import */}
            <button onClick={exportJSON} className="h-9 rounded-md border px-3">
              {tr(STR.actions.export, lang)}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJSONFile(f);
                if (fileRef.current) fileRef.current.value = '';
              }}
            />
            <button onClick={() => fileRef.current?.click()} className="h-9 rounded-md border px-3">
              {tr(STR.actions.import, lang)}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={[
            { key: 'tasks', label: tr(STR.tabs.tasks, lang) },
            { key: 'shop', label: tr(STR.tabs.shop, lang) },
            { key: 'history', label: tr(STR.tabs.history, lang) },
            { key: 'settings', label: tr(STR.tabs.settings, lang) },
            { key: 'badges', label: tr(STR.tabs.badges, lang) },
          ]}
          active={activeTab}
          onChange={(k) => setActiveTab(k as any)}
        />

        {/* Toast */}
        {toast && (
          <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-emerald-700 whitespace-pre-line">
            {toast}
          </div>
        )}

        {/* TASKS */}
        {activeTab === 'tasks' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatsCard label={tr(STR.stats.stars, lang)} value={stars} />
              <StatsCard label={tr(STR.stats.balance, lang)} value={balance} />
              <StatsCard label={tr(STR.stats.monthSpent, lang)} value={monthSpent} />
              <StatsCard
                label={tr(STR.stats.monthlyCap, lang)}
                right={
                  <input
                    type="number"
                    value={budgetCap}
                    onChange={(e) => setBudgetCap(Math.max(0, Number(e.target.value || 0)))}
                    className="h-6 w-20 border rounded px-2"
                  />
                }
              />
              <StatsCard
                label={tr(STR.stats.streak, lang, { n: dailyGoal })}
                value={`${streak} ${lang === 'zh' ? '天' : 'days'}`}
                footer={tr(STR.stats.totalCompleted, lang, { n: totalCompleted })}
              />
            </div>

            {/* 最近7日完成數 */}
            <Bar7 data={last7} label={tr(STR.stats.last7, lang)} />

            {/* Tasks */}
            <div className="rounded-2xl border bg-white p-4 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="text-sm text-slate-600">
                  {tr(STR.hints.paidTodayPrefix, lang)}（{paidToday.length}/{paidTasksPerDay}）：{' '}
                  {paidToday.length
                    ? paidToday
                        .map((id) => tName(tasks.find((t) => t.id === id) || { id, name: { zh: '', en: '' } } as Task))
                        .filter(Boolean)
                        .join('、')
                    : tr(STR.hints.notDrawn, lang)}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={drawPaidTasks}
                    className="h-9 rounded-md bg-indigo-600 px-3 text-white"
                  >
                    {tr(STR.actions.drawPaid, lang)}
                  </button>
                  <button onClick={resetDay} className="h-9 rounded-md border px-3">
                    {tr(STR.actions.clearToday, lang)}
                  </button>
                </div>
              </div>

              {/* 任務清單 */}
              <div className="grid md:grid-cols-2 gap-3">
                {tasks.map((t) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    lang={lang}
                    isPaid={paidToday.includes(t.id)}
                    done={completed.includes(t.id)}
                    moneyPerPaidTask={moneyPerPaidTask}
                    onToggle={toggleComplete}
                    tName={tName}
                    tCat={tCat}
                    rewardLabel={tr(STR.hints.reward, lang)}
                    rewardCashLabel={tr(STR.hints.rewardCash, lang)} // 內含 {n}
                    completeLabel={tr(STR.actions.complete, lang)}
                    doneLabel={tr(STR.actions.done, lang)}
                  />
                ))}
              </div>

              {/* 任務編輯器 */}
              <TaskEditor
                lang={lang}
                tasks={tasks}
                onAdd={addTask}
                onRemove={removeTask}
                placeholders={{
                  name: tr(STR.prompts.addTaskName, lang),
                  cat: tr(STR.prompts.addTaskCat, lang),
                }}
                addLabel={tr(STR.actions.addTask, lang)}
                deleteLabel={tr(STR.actions.delete, lang)}
                catOf={tCat}
                nameOf={tName}
              />
            </div>
          </>
        )}

        {/* SHOP */}
        {activeTab === 'shop' && (
          <div className="rounded-2xl border bg-white p-4 space-y-3">
            <div className="text-sm text-slate-600">
              {tr(STR.stats.balance, lang)} {balance} ／ {tr(STR.stats.monthSpent, lang)} {monthSpent} ／{' '}
              {tr(STR.stats.monthlyCap, lang)} {budgetCap}
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              {SHOP_ITEMS.map((item) => {
                const canAfford = balance >= item.price;
                const canSpendAll = canSpendNow && canAfford;

                return (
                  <div key={item.id} className="rounded-xl border p-4 space-y-2">
                    <div className="text-lg font-semibold">{item.name[lang]}</div>
                    <div className="text-sm text-slate-500">
                      {lang === 'zh' ? '價格：' : 'Price: $'}
                      {lang === 'zh' ? `$${item.price}` : item.price}
                    </div>

                    <button
                      onClick={() => {
                        if (!canSpendNow) {
                          setToast(
                            monthSpent >= budgetCap
                              ? tr(STR.actions.reachedCap, lang, { cap: budgetCap })
                              : tr(STR.actions.notEnough, lang)
                          );
                          return;
                        }
                        if (!canAfford) {
                          setToast(`${tr(STR.actions.notEnough, lang)} ($${item.price})`);
                          return;
                        }
                        buy(item);
                      }}
                      disabled={!canSpendAll}
                      className={`h-9 rounded-md px-3 ${
                        canSpendAll ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {tr(STR.actions.buy, lang)}
                    </button>

                    {/* 狀態提示 */}
                    {!canSpendNow && (
                      <div className="text-xs text-slate-400">
                        {monthSpent >= budgetCap
                          ? tr(STR.actions.reachedCap, lang, { cap: budgetCap })
                          : tr(STR.actions.notEnough, lang)}
                      </div>
                    )}
                    {canSpendNow && !canAfford && (
                      <div className="text-xs text-slate-400">
                        {tr(STR.actions.notEnough, lang)} ($${item.price})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* HISTORY */}
        {activeTab === 'history' && (
          <div className="rounded-2xl border bg-white p-4 space-y-3">
            <div className="font-semibold">
              {lang === 'zh' ? '收支與任務紀錄' : 'Ledger & Task History'}（
              {kids.find((k) => k.id === currentKidId)?.name}）
            </div>
            <div className="grid gap-2 max-h-[50vh] overflow-auto">
              {[...ledger].reverse().map((l, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl border p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-white ${
                        l.type === 'earn' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    >
                      {l.type === 'earn' ? '+' : '-'}${l.amount}
                    </span>
                    <span>{l.note}</span>
                  </div>
                  <div className="text-slate-400">{new Date(l.ts).toLocaleString()}</div>
                </div>
              ))}
              {ledger.length === 0 && (
                <div className="text-slate-500 text-sm">
                  {lang === 'zh' ? '目前沒有紀錄' : 'No records yet'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === 'settings' && (
          <div className="rounded-2xl border bg-white p-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border p-4 space-y-2">
                <div className="font-semibold">
                  {lang === 'zh' ? '金錢／上限（僅目前孩子）' : 'Money / Limits (current kid only)'}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  {tr(STR.settings.moneyCountPerDay, lang)}
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={paidTasksPerDay}
                    onChange={(e) => setPaidTasksPerDay(Math.max(0, Number(e.target.value || 0)))}
                    className="h-9 w-24 rounded-md border px-2"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  {tr(STR.settings.moneyPerTask, lang)}
                  <input
                    type="number"
                    min={0}
                    value={moneyPerPaidTask}
                    onChange={(e) => setMoneyPerPaidTask(Math.max(0, Number(e.target.value || 0)))}
                    className="h-9 w-24 rounded-md border px-2"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  {tr(STR.settings.monthlyCap, lang)}
                  <input
                    type="number"
                    min={0}
                    value={budgetCap}
                    onChange={(e) => setBudgetCap(Math.max(0, Number(e.target.value || 0)))}
                    className="h-9 w-28 rounded-md border px-2"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  {tr(STR.settings.dailyGoal, lang)}
                  <input
                    type="number"
                    min={0}
                    value={dailyGoal}
                    onChange={(e) => setDailyGoal(Math.max(0, Number(e.target.value || 0)))}
                    className="h-9 w-28 rounded-md border px-2"
                  />
                </label>
                <div className="text-xs text-slate-500">
                  {tr(STR.hints.suggestBudget, lang, { a: paidTasksPerDay, b: moneyPerPaidTask })}
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-2">
                <div className="font-semibold">{tr(STR.settings.kidManage, lang)}</div>
                <div className="text-sm text-slate-600">
                  {tr(STR.hints.kidNow, lang)}
                  {kids.find((k) => k.id === currentKidId)?.name}
                </div>
                <div className="text-xs text-slate-500">{tr(STR.hints.kidDeleteWarn, lang)}</div>
              </div>
            </div>
          </div>
        )}

        {/* BADGES */}
        {activeTab === 'badges' && (
          <div className="rounded-2xl border bg-white p-4 space-y-4">
            <div className="font-semibold">{lang === 'zh' ? '成就徽章' : 'Achievements'}</div>
            <div className="grid md:grid-cols-3 gap-3">
              {ACHIEVEMENTS.map((a) => {
                const cur =
                  a.metric === 'totalCompleted'
                    ? totalCompleted
                    : a.metric === 'streak'
                    ? streak
                    : a.metric === 'stars'
                    ? stars
                    : balance;
                const pct = Math.min(100, Math.round((cur / a.target) * 100));
                const owned = unlockedBadges.includes(a.id);
                return (
                  <div
                    key={a.id}
                    className={`rounded-xl border p-4 ${
                      owned ? 'bg-amber-50 border-amber-200' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-semibold">
                        {owned ? '🏅 ' : '🔒 '}
                        {a.title[lang]}
                      </div>
                      <div className="text-xs text-slate-500">
                        {cur}/{a.target}
                      </div>
                    </div>
                    <div className="text-sm text-slate-600 mt-1">{a.desc[lang]}</div>
                    <div className="h-2 w-full bg-slate-200 rounded mt-3 overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                    </div>
                    {!owned && (
                      <div className="text-xs text-slate-500 mt-1">
                        {lang === 'zh' ? '再努力一下就解鎖了！' : 'Almost there!'}
                      </div>
                    )}
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

      {/* Modal */}
      <Modal
        open={!!modal}
        title={modal?.title || ''}
        content={modal?.content || ''}
        okLabel={STR.modals.ok[lang]}
        onClose={() => setModal(null)}
      />
    </div>
  );
}
