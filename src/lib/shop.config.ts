// src/lib/shop.config.ts

export type MoneyItem = { id: string; name: string; price: number; note?: string };
export type StarItem  = { id: string; name: string; stars: number; note?: string };

export const DEFAULT_MONEY_ITEMS: MoneyItem[] = [
  { id: "toy-small", name: "小玩具", price: 30, note: "一次性" },
  { id: "snack",     name: "零食券", price: 15, note: "可選一份點心" },
  { id: "movie",     name: "家庭電影夜點心組", price: 50 },
];

export const DEFAULT_STAR_ITEMS: StarItem[] = [
  { id: "sticker-pack", name: "貼紙包", stars: 8 },
  { id: "story-plus",   name: "睡前故事 +1", stars: 10 },
  { id: "choose-dinner",name: "晚餐指定權", stars: 20 },
  { id: "screen-time",  name: "遊戲時間 30 分", stars: 25 },
];
