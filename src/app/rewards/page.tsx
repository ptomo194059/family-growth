"use client";

import { useMemo, useState, useCallback } from "react";
import { Gift, Sparkles, Coins, Trophy, RefreshCw, CheckCircle2, Circle, X } from "lucide-react";
import { useAppStore, RewardCard, Rarity, Achievement } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";

function rarityColor(r: Rarity) {
  switch (r) {
    case "SSR":
      return "from-yellow-400 via-pink-400 to-purple-500";
    case "SR":
      return "from-purple-400 to-blue-400";
    case "R":
      return "from-emerald-400 to-teal-400";
    default:
      return "from-gray-200 to-gray-300";
  }
}
function rarityLabel(r: Rarity) {
  if (r === "SSR") return "SSR";
  if (r === "SR") return "SR";
  if (r === "R") return "R";
  return "N";
}

export default function RewardsPage() {
  const childId = useAppStore((s) => s.activeChildId);
  const pool = useAppStore((s) => s.rewardPool);
  const drawCost = useAppStore((s) => s.drawCost[childId] ?? 0);
  const balance = useAppStore((s) => s.balances[childId] ?? 0);
  const inv = useAppStore((s) => s.inventories[childId] ?? []);
  const badges = useAppStore((s) => s.badges[childId] ?? []);
  const drawCard = useAppStore((s) => s.drawCard);
  const setDrawCost = useAppStore((s) => s.setDrawCost);

  // 🚫 避免以 use 開頭：改名避免被 ESLint 當作 Hook
  const consumeInventoryCard = useAppStore((s) => s.useInventoryCard);

  const achievements = useAppStore((s) => s.achievementsConfig);
  const history = useAppStore((s) => s.history[childId] ?? []);
  const daily = useAppStore((s) => s.daily[childId] ?? []);
  const todayWeeklyStars = useAppStore((s) => s.todayWeeklyStars[childId] ?? 0);
  const totalCompleted = useAppStore((s) => s.statsChoresCompleted[childId] ?? 0);

  // 語系偵測（default zh）
  const lang = typeof document !== "undefined" ? document.documentElement.lang || "zh" : "zh";
  const t = <T extends { zh: string; en: string }>(obj: T) => (lang.startsWith("zh") ? obj.zh : obj.en);

  // 機率（依權重計算比例）
  const rarityRates = useMemo(() => {
    const byRarity: Record<Rarity, number> = { N: 0, R: 0, SR: 0, SSR: 0 };
    let total = 0;
    for (const c of pool) {
      byRarity[c.rarity] += Math.max(0, c.weight);
      total += Math.max(0, c.weight);
    }
    (Object.keys(byRarity) as Rarity[]).forEach((k) => {
      byRarity[k] = total > 0 ? Math.round((byRarity[k] / total) * 1000) / 10 : 0;
    });
    return byRarity;
  }, [pool]);

  const [tab, setTab] = useState<"gacha" | "badges">("gacha");
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<RewardCard | null>(null);

  // 使用卡片的 modal 狀態
  const [useOpen, setUseOpen] = useState(false);
  const [useCardId, setUseCardId] = useState<string | null>(null);

  const canDraw = balance >= drawCost && !rolling;

  const onDraw = useCallback(async () => {
    if (!canDraw) return;
    setResult(null);
    setRolling(true);
    await new Promise((r) => setTimeout(r, 700));
    const card = drawCard(childId);
    if (!card) {
      setRolling(false);
      return;
    }
    await new Promise((r) => setTimeout(r, 900));
    setResult(card);
    await new Promise((r) => setTimeout(r, 600));
    setRolling(false);
  }, [canDraw, drawCard, childId]);

  const invCount = useMemo(() => {
    const count = new Map<string, number>();
    for (const o of inv) count.set(o.cardId, (count.get(o.cardId) ?? 0) + 1);
    return count;
  }, [inv]);

  const sortedPool = useMemo(() => {
    const order: Record<Rarity, number> = { SSR: 0, SR: 1, R: 2, N: 3 };
    return [...pool].sort((a, b) => order[a.rarity] - order[b.rarity]);
  }, [pool]);

  // === Progress helpers (與 store 的計算一致) ===
  const todayStars = useMemo(() => {
    const dailyEarned = daily.filter((t) => t.done).reduce((s, t) => s + t.points, 0);
    return dailyEarned + todayWeeklyStars;
  }, [daily, todayWeeklyStars]);

  const streak = useMemo(() => {
    const today = new Date();
    const todayISO = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today
      .getDate()
      .toString()
      .padStart(2, "0")}`;
    const logs = [...history, { dateISO: todayISO, stars: todayStars, completed: 0, total: 0 }];
    const map = new Map(logs.map((l) => [l.dateISO, l.stars]));
    let count = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
        .getDate()
        .toString()
        .padStart(2, "0")}`;
      const s = map.get(iso) ?? 0;
      if (s > 0) count++;
      else break;
    }
    return count;
  }, [history, todayStars]);

  const starsTotal = useMemo(() => {
    const past = history.reduce((sum, h) => sum + (h.stars ?? 0), 0);
    return past + todayStars;
  }, [history, todayStars]);

  // 成就分組顯示
  const groupedAchievements = useMemo(() => {
    return {
      totalCompleted: achievements.filter((a) => a.metric === "totalCompleted"),
      streak: achievements.filter((a) => a.metric === "streak"),
      stars: achievements.filter((a) => a.metric === "stars"),
      balance: achievements.filter((a) => a.metric === "balance"),
    };
  }, [achievements]);

  // 單一成就的進度
  const achievementProgress = (a: Achievement) => {
    const value =
      a.metric === "totalCompleted"
        ? totalCompleted
        : a.metric === "streak"
        ? streak
        : a.metric === "stars"
        ? starsTotal
        : balance;
    const pct = Math.max(0, Math.min(100, Math.round((value / a.target) * 100)));
    const badgeId = `achv-${a.id}`;
    const owned = badges.some((b) => b.id === badgeId);
    const achieved = value >= a.target || owned;
    return { value, pct, achieved, owned };
  };

  // 取得卡池項目 by id（顯示名稱與稀有度）
  const getCard = (id: string | null) => (id ? pool.find((c) => c.id === id) || null : null);

  // ✅ 確認使用（不再呼叫以 use 開頭的函式名，避免 hooks 規則）
  const confirmUse = useCallback(() => {
    if (!useCardId) return;
    consumeInventoryCard(childId, useCardId);
    setUseOpen(false);
    setUseCardId(null);
  }, [consumeInventoryCard, childId, useCardId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🎁 Rewards</h1>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-white shadow flex items-center gap-2">
            <Coins size={18} className="text-emerald-600" />
            <span className="text-sm text-gray-500">餘額</span>
            <span className="font-bold text-emerald-700">${balance}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white shadow flex items-center gap-2">
            <Gift size={18} className="text-gray-700" />
            <span className="text-sm text-gray-500">每抽</span>
            <span className="font-bold">${drawCost}</span>
            <button
              onClick={() => setDrawCost(childId, Math.max(0, drawCost + 5))}
              className="ml-2 text-xs px-2 py-1 rounded bg-gray-100"
            >
              +5
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-xl bg-gray-100 p-1">
        <button
          onClick={() => setTab("gacha")}
          className={`px-3 py-1.5 rounded-lg text-sm ${tab === "gacha" ? "bg-white shadow font-semibold" : "text-gray-600"}`}
        >
          抽卡（驚喜卡）
        </button>
        <button
          onClick={() => setTab("badges")}
          className={`px-3 py-1.5 rounded-lg text-sm ${tab === "badges" ? "bg-white shadow font-semibold" : "text-gray-600"}`}
        >
          徽章 & 成就
        </button>
      </div>

      {tab === "gacha" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左：抽卡機 + 動畫 */}
          <div className="p-4 bg-white rounded-2xl shadow flex flex-col items-center justify-center">
            <div className="w-full max-w-sm">
              <div className="relative h-56 overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center">
                {/* 漩渦動畫 */}
                <AnimatePresence>
                  {rolling && (
                    <motion.div
                      key="spin"
                      className="absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, rotate: 360 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.2, ease: "easeInOut" }}
                      style={{
                        background:
                          "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 60%)",
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* 閃光 */}
                <AnimatePresence>
                  {rolling && (
                    <motion.div
                      key="shine"
                      className="absolute -left-1/3 top-0 h-full w-1/3 bg-white/30 blur-md"
                      initial={{ x: "-150%" }}
                      animate={{ x: "250%" }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.0, repeat: 1, ease: "easeInOut" }}
                    />
                  )}
                </AnimatePresence>

                {/* 結果展示卡片 */}
                <AnimatePresence>
                  {result && !rolling && (
                    <motion.div
                      key={result.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`relative w-64 h-40 rounded-xl bg-gradient-to-br ${rarityColor(
                        result.rarity,
                      )} flex flex-col items-center justify-center text-white`}
                    >
                      <div className="absolute -top-3 right-3 bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold">
                        {rarityLabel(result.rarity)}
                      </div>
                      <div className="text-5xl mb-2">{result.icon ?? "🎁"}</div>
                      <div className="text-base font-bold">{result.name}</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!result && !rolling && (
                  <div className="text-white/80 text-sm flex flex-col items-center">
                    <Sparkles className="mb-2" />
                    點擊下方「抽卡」開始！
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={onDraw}
                  disabled={!canDraw}
                  className={`h-11 px-5 rounded-xl inline-flex items-center gap-2 ${
                    canDraw ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <Gift size={18} />
                  抽卡（${drawCost}）
                </button>
                <button onClick={() => setResult(null)} className="h-11 px-4 rounded-xl bg-white border inline-flex items-center gap-2">
                  <RefreshCw size={16} />
                  重置展示
                </button>
              </div>

              {balance < drawCost && <p className="mt-2 text-center text-xs text-red-600">餘額不足，無法抽卡</p>}
            </div>
          </div>

          {/* 中：機率表 */}
          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="text-lg font-semibold mb-3">稀有度機率</h2>
            <ul className="space-y-2">
              {(["SSR", "SR", "R", "N"] as Rarity[]).map((r) => (
                <li key={r} className="flex items-center justify-between rounded-lg bg-gray-50 p-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-3 w-3 rounded-full bg-gradient-to-br ${rarityColor(r)}`} />
                    <span className="font-semibold">{rarityLabel(r)}</span>
                  </div>
                  <span className="tabular-nums">{rarityRates[r]}%</span>
                </li>
              ))}
            </ul>

            <h3 className="text-sm font-semibold mt-4 mb-2">卡池一覽</h3>
            <div className="grid grid-cols-2 gap-2">
              {sortedPool.map((c) => (
                <div key={c.id} className={`rounded-lg p-3 text-sm bg-gradient-to-br ${rarityColor(c.rarity)} text-white`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-xs opacity-80">{rarityLabel(c.rarity)}</span>
                  </div>
                  <div className="mt-1 text-2xl">{c.icon ?? "🎁"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 右：背包（可使用） */}
          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="text-lg font-semibold mb-3">背包（持有卡片）</h2>
            {inv.length === 0 ? (
              <p className="text-sm text-gray-500">還沒有卡片，去抽一抽吧！</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {sortedPool.map((c) => {
                  const cnt = invCount.get(c.id) ?? 0;
                  if (cnt === 0) return null;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setUseCardId(c.id);
                        setUseOpen(true);
                      }}
                      className={`text-left rounded-lg p-3 bg-gradient-to-br ${rarityColor(
                        c.rarity,
                      )} text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{c.name}</span>
                        <span className="text-xs opacity-80">{rarityLabel(c.rarity)}</span>
                      </div>
                      <div className="mt-1 text-3xl">{c.icon ?? "🎁"}</div>
                      <div className="mt-1 text-xs opacity-90">持有：x{cnt}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Badges & Achievements
        <div className="space-y-6">
          {/* 已獲得徽章 */}
          <div className="p-4 bg-white rounded-2xl shadow">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">已獲得徽章</h2>
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" />
                已獲得：{badges.length}
              </div>
            </div>

            {badges.length === 0 ? (
              <p className="text-sm text-gray-500">還沒有徽章。抽卡里程碑、抽到 SSR，或完成成就即可獲得。</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {badges
                  .slice()
                  .sort((a, b) => b.earnedAt - a.earnedAt)
                  .map((b) => (
                    <div key={b.id} className="rounded-xl border bg-gray-50 p-3">
                      <div className="text-3xl">{b.icon ?? "🏅"}</div>
                      <div className="mt-1 text-sm font-semibold">{b.title}</div>
                      {b.description && <div className="text-xs text-gray-500 mt-0.5">{b.description}</div>}
                      <div className="text-[10px] text-gray-400 mt-1">{new Date(b.earnedAt).toLocaleString()}</div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* 成就（進度） */}
          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="text-lg font-semibold mb-3">成就（進度）</h2>

            <div className="space-y-5">
              {/* 累計完成任務 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">累計完成任務</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {groupedAchievements.totalCompleted.map((a) => {
                    const p = achievementProgress(a);
                    return (
                      <div key={a.id} className="rounded-xl border bg-gray-50 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{a.icon ?? "🧹"}</span>
                            <div className="text-sm font-semibold">{t(a.title)}</div>
                          </div>
                          {p.achieved ? (
                            <CheckCircle2 className="text-green-600" size={18} />
                          ) : (
                            <Circle className="text-gray-300" size={18} />
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{t(a.desc)}</div>
                        <div className="mt-2 h-2 w-full rounded-full bg-white overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${p.pct}%` }} />
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          進度：<span className="tabular-nums">{p.value}</span> / {a.target}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 連續達標天數 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">連續達標天數</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {groupedAchievements.streak.map((a) => {
                    const p = achievementProgress(a);
                    return (
                      <div key={a.id} className="rounded-xl border bg-gray-50 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{a.icon ?? "🔥"}</span>
                            <div className="text-sm font-semibold">{t(a.title)}</div>
                          </div>
                          {p.achieved ? (
                            <CheckCircle2 className="text-green-600" size={18} />
                          ) : (
                            <Circle className="text-gray-300" size={18} />
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{t(a.desc)}</div>
                        <div className="mt-2 h-2 w-full rounded-full bg-white overflow-hidden">
                          <div className="h-full bg-orange-500" style={{ width: `${p.pct}%` }} />
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          進度：<span className="tabular-nums">{p.value}</span> / {a.target}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 累計星星 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">累計星星</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:gridCols-3 gap-3">
                  {groupedAchievements.stars.map((a) => {
                    const p = achievementProgress(a);
                    return (
                      <div key={a.id} className="rounded-xl border bg-gray-50 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{a.icon ?? "⭐"}</span>
                            <div className="text-sm font-semibold">{t(a.title)}</div>
                          </div>
                          {p.achieved ? (
                            <CheckCircle2 className="text-green-600" size={18} />
                          ) : (
                            <Circle className="text-gray-300" size={18} />
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{t(a.desc)}</div>
                        <div className="mt-2 h-2 w-full rounded-full bg-white overflow-hidden">
                          <div className="h-full bg-violet-500" style={{ width: `${p.pct}%` }} />
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          進度：<span className="tabular-nums">{p.value}</span> / {a.target}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 餘額達標 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">帳戶餘額</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {groupedAchievements.balance.map((a) => {
                    const p = achievementProgress(a);
                    return (
                      <div key={a.id} className="rounded-xl border bg-gray-50 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{a.icon ?? "💰"}</span>
                            <div className="text-sm font-semibold">{t(a.title)}</div>
                          </div>
                          {p.achieved ? (
                            <CheckCircle2 className="text-green-600" size={18} />
                          ) : (
                            <Circle className="text-gray-300" size={18} />
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{t(a.desc)}</div>
                        <div className="mt-2 h-2 w-full rounded-full bg-white overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${p.pct}%` }} />
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          進度：$<span className="tabular-nums">{p.value}</span> / {a.target}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 使用卡片的 Modal */}
      <AnimatePresence>
        {useOpen && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setUseOpen(false)} />
            <motion.div
              className="relative z-50 w-[92%] max-w-sm rounded-2xl bg-white p-4 shadow-lg"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">使用卡片</h3>
                <button onClick={() => setUseOpen(false)} className="p-1 rounded hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>

              {(() => {
                const card = getCard(useCardId);
                const count = useCardId ? invCount.get(useCardId) ?? 0 : 0;
                if (!card || count <= 0) {
                  return <p className="mt-3 text-sm text-gray-500">找不到卡片或數量不足。</p>;
                }
                return (
                  <>
                    <div className={`mt-3 rounded-xl p-3 text-white bg-gradient-to-br ${rarityColor(card.rarity)}`}>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">{card.name}</div>
                        <span className="text-xs opacity-80">{rarityLabel(card.rarity)}</span>
                      </div>
                      <div className="mt-1 text-4xl">{card.icon ?? "🎁"}</div>
                      <div className="mt-1 text-xs opacity-90">目前持有：x{count}</div>
                    </div>

                    <p className="mt-3 text-sm text-gray-600">
                      確定要使用 1 張「{card.name}」嗎？使用後此卡片數量會減少 1。
                    </p>

                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button onClick={() => setUseOpen(false)} className="h-10 px-4 rounded-xl bg-gray-100">
                        取消
                      </button>
                      <button onClick={confirmUse} className="h-10 px-4 rounded-xl bg-gray-900 text-white">
                        使用
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs text-gray-500">※ 點擊背包卡片即可「使用」並扣除數量；當數量為 0 時，該卡片會自動從背包列表消失。</p>
    </div>
  );
}
