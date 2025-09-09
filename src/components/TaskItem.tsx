// src/components/TaskItem.tsx
import * as React from 'react';
import type { Task } from '../domain/types';

type Props = {
  task: Task;
  lang: 'zh' | 'en';
  isPaid: boolean;
  done: boolean;
  moneyPerPaidTask: number;
  onToggle: (id: string) => void;
  tName: (t: Task) => string;
  tCat: (t: Task) => string;
  rewardLabel: string;
  rewardCashLabel: string;
  completeLabel: string;
  doneLabel: string;
};

/**
 * 單一任務卡片：
 * - 顯示分類 / 名稱 / 獎勵
 * - 按鈕切換完成 / 未完成
 */
export default function TaskItem({
  task,
  lang,
  isPaid,
  done,
  moneyPerPaidTask,
  onToggle,
  tName,
  tCat,
  rewardLabel,
  rewardCashLabel,
  completeLabel,
  doneLabel,
}: Props) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border p-3 ${
        done ? 'bg-emerald-50' : 'bg-white'
      }`}
    >
      <div>
        <div className="text-xs text-slate-500">{tCat(task)}</div>
        <div className="font-medium text-lg">{tName(task)}</div>
        <div className="text-xs text-slate-500">
          {rewardLabel} {isPaid ? rewardCashLabel.replace('{n}', String(moneyPerPaidTask)) : ''}
        </div>
      </div>
      <button
        onClick={() => onToggle(task.id)}
        className={`h-9 rounded-md px-3 ${
          done ? 'bg-slate-200' : 'bg-indigo-600 text-white'
        }`}
      >
        {done ? doneLabel : completeLabel}
      </button>
    </div>
  );
}
