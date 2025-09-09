// src/storage/local.ts

/** localStorage 的版本標記 */
export const DATA_VERSION = '1.5';

/** localStorage 載入 */
export function load<T>(k: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** localStorage 儲存 */
export function save<T>(k: string, v: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(k, JSON.stringify(v));
}

/** localStorage 移除 */
export function remove(k: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(k);
}

/** 批次移除（刪除孩子用） */
export function removeByPrefix(prefix: string) {
  if (typeof window === 'undefined') return;
  for (const key of Object.keys(window.localStorage)) {
    if (key.startsWith(prefix)) {
      window.localStorage.removeItem(key);
    }
  }
}

/** kid 命名空間用 key */
export const kkey = (kidId: string, k: string) => `fga_${kidId}_${k}`;

/** kid prefix（刪除時用） */
export const kidPrefix = (kidId: string) => `fga_${kidId}_`;

/** 格式化日期：YYYY-MM-DD */
export const fmtDate = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate())
    .toISOString()
    .slice(0, 10);

/** 今天字串 */
export const todayStr = fmtDate();
