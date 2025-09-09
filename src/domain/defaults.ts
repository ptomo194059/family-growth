// src/domain/defaults.ts
import type { Task, Achievement } from './types';

/** 預設任務 */
export const DEFAULT_TASKS: Task[] = [
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

/** 驚喜卡 */
export const SURPRISE_CARDS = [
  { id: 'hug', name: { zh: '擁抱券', en: 'Hug Coupon' }, description: { zh: '3 分鐘大抱抱', en: '3-min big hug' } },
  { id: 'story', name: { zh: '加碼睡前故事', en: 'Extra bedtime story' }, description: { zh: '多聽 1 個故事', en: 'One extra story' } },
  { id: 'snack', name: { zh: '小點心券', en: 'Snack Coupon' }, description: { zh: '一份健康小點心', en: 'A healthy snack' } },
  { id: 'park', name: { zh: '公園遊戲時間', en: 'Park playtime' }, description: { zh: '週末 1 小時', en: '1 hour on weekend' } },
  { id: 'game', name: { zh: '休閒遊戲時間', en: 'Game time' }, description: { zh: '加碼 30 分鐘', en: 'Extra 30 min' } },
];

/** 商店商品 */
export const SHOP_ITEMS = [
  { id: 'draw', name: { zh: '抽驚喜卡', en: 'Draw Surprise Card' }, price: 10 as const, action: 'draw' as const },
  { id: 'chest', name: { zh: '開寶箱', en: 'Open Chest' }, price: 30 as const, action: 'chest' as const },
  { id: 'sticker', name: { zh: '可愛貼紙', en: 'Cute Sticker' }, price: 20 as const, action: 'item' as const, payload: { zh: '貼紙 1 張', en: '1 sticker' } },
  { id: 'marker', name: { zh: '彩色筆 1 支', en: '1 Marker Pen' }, price: 30 as const, action: 'item' as const, payload: { zh: '彩色筆', en: 'Marker' } },
  { id: 'book', name: { zh: '小書一本', en: 'A small book' }, price: 80 as const, action: 'item' as const, payload: { zh: '小繪本', en: 'Little book' } },
];

/** 成就 */
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'tc_10', title: { zh: '初入門', en: 'Getting Started' }, desc: { zh: '累計完成 10 項任務', en: 'Complete 10 tasks total' }, target: 10, metric: 'totalCompleted' },
  { id: 'tc_50', title: { zh: '努力不懈', en: 'Keep Going' }, desc: { zh: '累計完成 50 項任務', en: 'Complete 50 tasks total' }, target: 50, metric: 'totalCompleted' },
  { id: 'tc_100', title: { zh: '任務大師', en: 'Task Master' }, desc: { zh: '累計完成 100 項任務', en: 'Complete 100 tasks total' }, target: 100, metric: 'totalCompleted' },
  { id: 'streak_3', title: { zh: '開啟習慣', en: 'Habit Starter' }, desc: { zh: '連續達標 3 天', en: '3-day streak' }, target: 3, metric: 'streak' },
  { id: 'streak_7', title: { zh: '一週達標', en: 'Weekly Winner' }, desc: { zh: '連續達標 7 天', en: '7-day streak' }, target: 7, metric: 'streak' },
  { id: 'streak_14', title: { zh: '堅持兩週', en: 'Two Weeks Strong' }, desc: { zh: '連續達標 14 天', en: '14-day streak' }, target: 14, metric: 'streak' },
  { id: 'star_10', title: { zh: '星星收藏家', en: 'Star Collector' }, desc: { zh: '星星累積 10 顆', en: 'Collect 10 stars' }, target: 10, metric: 'stars' },
  { id: 'balance_100', title: { zh: '小財神', en: 'Little Tycoon' }, desc: { zh: '帳戶餘額達 $100', en: 'Balance reaches $100' }, target: 100, metric: 'balance' },
];
