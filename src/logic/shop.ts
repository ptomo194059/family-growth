// src/logic/shop.ts
import type { Lang } from '../domain/types';

/** 商店品項型別（對應 domain/defaults.ts 的結構） */
export type ShopItem = {
  id: string;
  name: { zh: string; en: string };
  price: number;
  action: 'draw' | 'chest' | 'item';
  payload?: { zh: string; en: string };
};

/** 是否可消費（有餘額且未達本月上限） */
export function canSpend(balance: number, monthSpent: number, monthlyCap: number) {
  return balance > 0 && monthSpent < monthlyCap;
}

/** 取得一個 chest 隨機獎勵（依語系） */
export function randomChestReward(lang: Lang) {
  const chestRewards =
    lang === 'zh'
      ? ['貼紙包', '小玩具', '家庭活動券（公園）', '故事加碼券', '健康小點心']
      : ['Stickers pack', 'Small toy', 'Family park time', 'Extra story', 'Healthy snack'];
  const r = chestRewards[Math.floor(Math.random() * chestRewards.length)];
  return r;
}

/** 從驚喜卡池挑一張，回傳顯示文字 */
export function surpriseCardContent(
  cards: { id: string; name: { zh: string; en: string }; description: { zh: string; en: string } }[],
  lang: Lang
) {
  const pick = cards[Math.floor(Math.random() * cards.length)];
  return `${pick.name[lang]} — ${pick.description[lang]}`;
}

/**
 * 購買行為的統一結果
 * - spend: 扣款金額
 * - ledgerNote: 要寫入帳本的文字（不含 +/- 符號，由呼叫端補）
 * - modalKind: 'card' | 'chest' | 'item' | null （由頁面決定要用哪個 modal 標題）
 * - modalContent: Modal 內容字串
 */
export type PurchaseOutcome = {
  spend: number;
  ledgerNote: string;
  modalKind: 'card' | 'chest' | 'itemOk' | null;
  modalContent: string;
};

/**
 * 將一個購買行為標準化為結果（不直接改 state，回傳由頁面套用）
 * @param item 商店品項
 * @param lang 語系
 * @param cards 驚喜卡池（若 action==='draw' 需要）
 */
export function applyPurchase(
  item: ShopItem,
  lang: Lang,
  cards: { id: string; name: { zh: string; en: string }; description: { zh: string; en: string } }[] = []
): PurchaseOutcome {
  const notePrefix = lang === 'zh' ? '購買：' : 'Redeem: ';
  const spend = item.price;

  if (item.action === 'draw') {
    const content = cards.length ? surpriseCardContent(cards, lang) : (lang === 'zh' ? '驚喜卡' : 'Surprise card');
    return {
      spend,
      ledgerNote: `${notePrefix}${item.name[lang]}`,
      modalKind: 'card',
      modalContent: content,
    };
  }

  if (item.action === 'chest') {
    const content = (lang === 'zh' ? '獲得：' : 'Got: ') + randomChestReward(lang);
    return {
      spend,
      ledgerNote: `${notePrefix}${item.name[lang]}`,
      modalKind: 'chest',
      modalContent: content,
    };
  }

  // item.action === 'item'
  const content = item.payload ? item.payload[lang] : item.name[lang];
  return {
    spend,
    ledgerNote: `${notePrefix}${item.name[lang]}`,
    modalKind: 'itemOk',
    modalContent: content,
  };
}
