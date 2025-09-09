// src/domain/types.ts

/** 語系 */
export type Lang = 'zh' | 'en';

/** 任務 */
export type Task = {
  id: string;
  // v1.5：任務名稱與分類支援中/英
  name?: { zh: string; en: string };
  category?: { zh: string; en: string };

  // 舊版相容欄位（匯入或老資料會用到，程式會自動轉成 name/category）
  label?: string;
  categoryOld?: string;
};

/** 收支明細 */
export type Ledger = {
  ts: number; // timestamp (ms)
  type: 'earn' | 'spend';
  amount: number;
  note: string;
};

/** 小孩資料 */
export type Kid = {
  id: string;
  name: string;
  createdAt: number; // timestamp (ms)
};

/** 目前版本的設定（與 UI 綁定） */
export type Settings = {
  paidTasksPerDay: number;   // 每日可領現金任務數
  moneyPerPaidTask: number;  // 每項現金獎勵金額
  dailyGoal: number;         // Streak 用的每日目標（完成項數）
  // 月度上限屬於 per-kid 的值，但常與 Settings 一起操作，保留在 Dump 的頂層
};

/** 匯出/匯入用的資料模型（單一孩子命名空間） */
export type Dump = {
  kid: Kid;
  date: string;           // 當前所選日期（YYYY-MM-DD）
  tasks: Task[];
  stars: number;
  balance: number;
  ledger: Ledger[];
  budgetCap: number;      // 月度上限
  paidToday: string[];    // 當日抽中的付費任務 id
  completed: string[];    // 當日完成的任務 id
  settings: Settings;
  totals?: { totalCompleted: number };
  badges?: string[];      // 已解鎖成就 id
};

/** 成就 */
export type Achievement = {
  id: string;
  title: { zh: string; en: string };
  desc: { zh: string; en: string };
  target: number;
  metric: 'totalCompleted' | 'streak' | 'stars' | 'balance';
};
