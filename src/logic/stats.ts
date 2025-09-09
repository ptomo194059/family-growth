// src/logic/stats.ts
import { Ledger } from '../domain/types';
import { load, kkey, fmtDate } from '../storage/local';

/** 計算當月已花金額 */
export function calcMonthSpent(ledger: Ledger[], date: string) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth();
  const start = new Date(y, m, 1).getTime();
  const end = new Date(y, m + 1, 1).getTime();

  return ledger
    .filter((l) => l.type === 'spend' && l.ts >= start && l.ts < end)
    .reduce((s, l) => s + l.amount, 0);
}

/** 最近七日完成數 */
export function calcLast7(currentKidId: string, date: string) {
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
}

/** 連續達標天數 (streak) */
export function calcStreak(currentKidId: string, date: string, dailyGoal: number) {
  let s = 0;
  for (let i = 0; ; i++) {
    const d = new Date(date);
    d.setDate(d.getDate() - i);
    const ds = fmtDate(d);
    const cnt = load<string[]>(kkey(currentKidId, `done_${ds}`), []).length;
    if (cnt >= dailyGoal) s++;
    else break;
    if (i > 365) break; // safety
  }
  return s;
}
