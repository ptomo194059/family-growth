// src/domain/i18n.ts
import type { Lang } from './types';

/** 多語系字串 */
export const STR = {
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
    paidTodayPrefix: { zh: '今日可領現金任務', en: 'Today’s paid tasks' },
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

/** i18n helper */
export function tr(
  s: { zh: string; en: string },
  lang: Lang,
  vars?: Record<string, string | number>
) {
  let txt = s[lang];
  if (vars) {
    for (const k of Object.keys(vars)) {
      txt = txt.replaceAll(`{${k}}`, String(vars[k]));
    }
  }
  return txt;
}
