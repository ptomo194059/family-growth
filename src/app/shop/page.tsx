"use client";

import { useMemo, useState } from "react";
import { Coins, Star, ShoppingBag, X } from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function ShopPage() {
  const childId = useAppStore((s) => s.activeChildId);
  const balance = useAppStore((s) => s.balances[childId] ?? 0);
  const starWallet = useAppStore((s) => s.starWallet[childId] ?? 0);
  const monthSpentMap = useAppStore((s) => s.monthSpent[childId] ?? {});
  const buyWithMoney = useAppStore((s) => s.buyWithMoney);
  const buyWithStars = useAppStore((s) => s.buyWithStars);
  const exchangeStarsToMoney = useAppStore((s) => s.exchangeStarsToMoney);

  const shopConfig = useAppStore((s) => s.shopConfig);
  const rate = useAppStore((s) => s.exchangeRateStarsPerDollar);

  const ym = useMemo(() => {
    const d = new Date();
    const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  }, []);
  const monthSpent = monthSpentMap[ym] ?? 0;

  // 兌換 modal
  const [open, setOpen] = useState<null | { type: "money" | "star"; id: string }>(null);
  const [count, setCount] = useState(1);

  const openBuy = (type: "money" | "star", id: string) => {
    setOpen({ type, id });
    setCount(1);
  };

  const doConfirm = () => {
    if (!open) return;
    if (open.type === "money") {
      const item = shopConfig.moneyItems.find((i) => i.id === open.id);
      if (!item) return;
      const ok = buyWithMoney(childId, item.price * Math.max(1, count));
      if (ok) setOpen(null);
    } else {
      const item = shopConfig.starItems.find((i) => i.id === open.id);
      if (!item) return;
      const ok = buyWithStars(childId, item.stars * Math.max(1, count));
      if (ok) setOpen(null);
    }
  };

  // 星星換錢
  const [exStars, setExStars] = useState(rate);
  const exDollar = Math.floor(exStars / Math.max(1, rate));

  const confirmExchange = () => {
    const ok = exchangeStarsToMoney(childId, exStars);
    if (ok) setExStars(rate);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🛍️ Shop</h1>

      {/* Wallet overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl shadow flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-50"><Coins className="text-emerald-600" /></div>
          <div>
            <div className="text-sm text-gray-500">餘額</div>
            <div className="text-xl font-semibold">${balance}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl shadow flex items-center gap-3">
          <div className="p-2 rounded-xl bg-yellow-50"><Star className="text-yellow-600" /></div>
          <div>
            <div className="text-sm text-gray-500">星星錢包</div>
            <div className="text-xl font-semibold">{starWallet} ⭐️</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl shadow flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-50"><ShoppingBag className="text-rose-600" /></div>
          <div>
            <div className="text-sm text-gray-500">本月已花（$）</div>
            <div className="text-xl font-semibold">${monthSpent}</div>
            <div className="text-[11px] text-gray-400">包含抽卡與用錢購買</div>
          </div>
        </div>
      </div>

      {/* 星星兌換區 */}
      <div className="p-4 bg-white rounded-2xl shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">⭐️ 星星兌換現金（{rate}⭐️ ⇒ $1）</h2>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">欲兌換星星數（需為 {rate} 的倍數）</div>
            <input
              type="number"
              min={rate}
              step={rate}
              value={exStars}
              onChange={(e) => setExStars(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              className="h-10 w-32 rounded-xl border px-3"
            />
          </div>
          <div className="text-sm text-gray-600">可以換得：<span className="font-semibold">${exDollar}</span></div>
          <button
            onClick={confirmExchange}
            disabled={exStars < rate || exStars % rate !== 0 || exStars > starWallet}
            className={`h-10 px-4 rounded-xl ${exStars >= rate && exStars % rate === 0 && exStars <= starWallet ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
          >
            立即兌換
          </button>
          <div className="text-xs text-gray-400">（兌換不計入「本月已花」）</div>
        </div>
      </div>

      {/* 商品清單 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 用星星兌換 */}
        <div className="p-4 bg-white rounded-2xl shadow">
          <h2 className="text-lg font-semibold mb-3">用星星兌換</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {shopConfig.starItems.map((it) => (
              <div key={it.id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{it.name}</div>
                  <div className="text-sm"><span className="font-semibold">{it.stars}</span> ⭐️</div>
                </div>
                {it.note && <div className="text-xs text-gray-500 mt-0.5">{it.note}</div>}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => setOpen({ type: "star", id: it.id })}
                    className={`h-9 px-3 rounded-lg ${starWallet >= it.stars ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
                    disabled={starWallet < it.stars}
                  >
                    兌換
                  </button>
                  <div className="text-xs text-gray-500">目前星星：{starWallet}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 用錢購買 */}
        <div className="p-4 bg-white rounded-2xl shadow">
          <h2 className="text-lg font-semibold mb-3">用錢購買</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {shopConfig.moneyItems.map((it) => (
              <div key={it.id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{it.name}</div>
                  <div className="text-sm">$<span className="font-semibold">{it.price}</span></div>
                </div>
                {it.note && <div className="text-xs text-gray-500 mt-0.5">{it.note}</div>}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => setOpen({ type: "money", id: it.id })}
                    className={`h-9 px-3 rounded-lg ${balance >= it.price ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
                    disabled={balance < it.price}
                  >
                    購買
                  </button>
                  <div className="text-xs text-gray-500">目前餘額：${balance}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-400 mt-3">* 用錢購買會計入「本月已花」。</div>
        </div>
      </div>

      {/* 通用數量選擇 Modal */}
      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(null)} />
          <div className="relative z-50 w-[92%] max-w-sm rounded-2xl bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{open.type === "money" ? "確認購買" : "確認兌換"}</h3>
              <button onClick={() => setOpen(null)} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>

            {open.type === "money" ? (
              (() => {
                const it = shopConfig.moneyItems.find(i => i.id === open.id)!;
                const total = it.price * Math.max(1, count);
                const disabled = total > balance;
                return (
                  <div className="mt-3">
                    <div className="text-sm font-semibold">{it.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">單價：${it.price}</div>
                    <div className="mt-3">
                      <div className="text-xs text-gray-500 mb-1">數量</div>
                      <input
                        type="number"
                        min={1}
                        value={count}
                        onChange={(e) => setCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                        className="h-10 w-24 rounded-xl border px-3"
                      />
                    </div>
                    <div className="mt-3 text-sm">合計：<span className="font-semibold">${total}</span></div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button onClick={() => setOpen(null)} className="h-10 px-4 rounded-xl bg-gray-100">取消</button>
                      <button onClick={() => { if (!disabled) doConfirm(); }} disabled={disabled} className={`h-10 px-4 rounded-xl ${disabled ? "bg-gray-200 text-gray-400" : "bg-gray-900 text-white"}`}>確認</button>
                    </div>
                  </div>
                );
              })()
            ) : (
              (() => {
                const it = shopConfig.starItems.find(i => i.id === open.id)!;
                const total = it.stars * Math.max(1, count);
                const disabled = total > starWallet;
                return (
                  <div className="mt-3">
                    <div className="text-sm font-semibold">{it.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">每份需要：{it.stars} ⭐️</div>
                    <div className="mt-3">
                      <div className="text-xs text-gray-500 mb-1">數量</div>
                      <input
                        type="number"
                        min={1}
                        value={count}
                        onChange={(e) => setCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                        className="h-10 w-24 rounded-xl border px-3"
                      />
                    </div>
                    <div className="mt-3 text-sm">合計：<span className="font-semibold">{total}</span> ⭐️</div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button onClick={() => setOpen(null)} className="h-10 px-4 rounded-xl bg-gray-100">取消</button>
                      <button onClick={() => { if (!disabled) doConfirm(); }} disabled={disabled} className={`h-10 px-4 rounded-xl ${disabled ? "bg-gray-200 text-gray-400" : "bg-gray-900 text-white"}`}>確認</button>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}
    </div>
  );
}
