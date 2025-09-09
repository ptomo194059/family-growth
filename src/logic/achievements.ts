// src/logic/achievements.ts
import type { Achievement, Lang } from '../domain/types';

/** 供外部傳入的目前指標值 */
export type Metrics = {
  totalCompleted: number;
  streak: number;
  stars: number;
  balance: number;
};

/**
 * 比對成就清單與目前指標，回傳新解鎖與完整清單
 * @param achievements 成就定義清單
 * @param metrics 目前數值（由畫面計算好丟進來）
 * @param unlocked 已擁有的成就 id 清單
 */
export function computeUnlocks(
  achievements: Achievement[],
  metrics: Metrics,
  unlocked: string[]
): { newly: string[]; unlockedAll: string[] } {
  const owned = new Set(unlocked);
  const newly: string[] = [];

  for (const a of achievements) {
    if (owned.has(a.id)) continue;
    const cur = valueOfMetric(metrics, a.metric);
    if (cur >= a.target) {
      newly.push(a.id);
      owned.add(a.id);
    }
  }

  return { newly, unlockedAll: Array.from(owned) };
}

/** 把新解鎖的成就組成提示字串（依語系） */
export function buildUnlockedMessage(
  achievements: Achievement[],
  newlyIds: string[],
  lang: Lang
): string {
  if (!newlyIds.length) return '';
  const byId = new Map(achievements.map(a => [a.id, a]));
  const titles = newlyIds
    .map(id => byId.get(id)?.title?.[lang])
    .filter((t): t is string => Boolean(t))
    .map(t => `🏅 ${t}`)
    .join('、');
  return titles;
}

/** 取對應指標值 */
export function valueOfMetric(metrics: Metrics, metric: Achievement['metric']): number {
  switch (metric) {
    case 'totalCompleted': return metrics.totalCompleted;
    case 'streak': return metrics.streak;
    case 'stars': return metrics.stars;
    case 'balance': return metrics.balance;
    default: return 0;
  }
}
