// src/app/settings/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAppStore,
  type DailyTask,
  type WeeklyTask,
  type RewardCard,
  type Rarity,
} from "@/lib/store";
import {
  Plus,
  Trash2,
  Save,
  Users,
  Gift,
  DollarSign,
  Ticket,
  Sparkles,
  Lock,
  Wallet,
  Wand2,
} from "lucide-react";
import type { MoneyItem, StarItem } from "@/lib/shop.config";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now()
    .toString()
    .slice(-4)}`;
}

const SESSION_KEY = "famgrow_settings_pin_verified";

export default function SettingsPage() {
  /** ====== PIN Gate ====== */
  const pinCode = useAppStore((s) => s.pinCode);
  const setPinCode = useAppStore((s) => s.setPinCode);

  const [verified, setVerified] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setVerified(window.sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  const submitPin = () => {
    if (pinInput === pinCode) {
      setVerified(true);
      if (typeof window !== "undefined")
        window.sessionStorage.setItem(SESSION_KEY, "1");
    } else {
      alert("PIN 錯誤，請再試一次。");
    }
  };

  /** ====== store selectors ====== */
  const children = useAppStore((s) => s.children);
  const activeChildId = useAppStore((s) => s.activeChildId);
  const setActiveChild = useAppStore((s) => s.setActiveChild);

  const daily = useAppStore((s) => s.daily);
  const weekly = useAppStore((s) => s.weekly);

  const setDailyList = useAppStore((s) => s.setDailyList);
  const setWeeklyList = useAppStore((s) => s.setWeeklyList);

  const setDailyReward = useAppStore((s) => s.setDailyReward);
  const setWeeklyReward = useAppStore((s) => s.setWeeklyReward);
  const setDrawCost = useAppStore((s) => s.setDrawCost);

  const dailyReward = useAppStore((s) => s.dailyFullCompleteReward);
  const weeklyReward = useAppStore((s) => s.weeklyFullCompleteReward);
  const drawCost = useAppStore((s) => s.drawCost);

  const addChild = useAppStore((s) => s.addChild);
  const updateChild = useAppStore((s) => s.updateChild);
  const removeChild = useAppStore((s) => s.removeChild);

  // Shop config
  const shopConfig = useAppStore((s) => s.shopConfig);
  const rate = useAppStore((s) => s.exchangeRateStarsPerDollar);
  const setShopConfig = useAppStore((s) => s.setShopConfig);
  const setExchangeRate = useAppStore((s) => s.setExchangeRate);

  // Top-up
  const balances = useAppStore((s) => s.balances);
  const addBalance = useAppStore((s) => s.addBalance);

  // Reward Pool
  const rewardPool = useAppStore((s) => s.rewardPool);
  const setRewardPool = useAppStore((s) => s.setRewardPool);

  /** ====== local editable copies ====== */
  const [localChildId, setLocalChildId] = useState<string>(activeChildId);
  const selectedChild = useMemo(
    () => children.find((c) => c.id === localChildId) ?? children[0],
    [children, localChildId]
  );

  const [childNameEditing, setChildNameEditing] = useState<string>(
    selectedChild?.name ?? ""
  );

  // task lists
  const [localDaily, setLocalDaily] = useState<DailyTask[]>(
    daily[selectedChild?.id ?? ""] ?? []
  );
  const [localWeekly, setLocalWeekly] = useState<WeeklyTask[]>(
    weekly[selectedChild?.id ?? ""] ?? []
  );

  // rewards
  const [localDailyReward, setLocalDailyReward] = useState<number>(
    dailyReward[selectedChild?.id ?? ""] ?? 20
  );
  const [localWeeklyReward, setLocalWeeklyReward] = useState<number>(
    weeklyReward[selectedChild?.id ?? ""] ?? 50
  );
  const [localDrawCost, setLocalDrawCost] = useState<number>(
    drawCost[selectedChild?.id ?? ""] ?? 20
  );

  // shop config
  const [moneyItems, setMoneyItems] = useState<MoneyItem[]>(
    shopConfig.moneyItems
  );
  const [starItems, setStarItems] = useState<StarItem[]>(
    shopConfig.starItems
  );
  const [localRate, setLocalRate] = useState<number>(rate);

  // reward pool editor
  const [poolRows, setPoolRows] = useState<RewardCard[]>(
    rewardPool.map((c) => ({ ...c }))
  );

  /** ====== when switching child in UI ====== */
  const syncFromChild = (childId: string) => {
    const c = children.find((x) => x.id === childId);
    setLocalChildId(childId);
    setChildNameEditing(c?.name ?? "");
    setLocalDaily((daily[childId] ?? []).map((d) => ({ ...d })));
    setLocalWeekly((weekly[childId] ?? []).map((w) => ({ ...w })));
    setLocalDailyReward(dailyReward[childId] ?? 20);
    setLocalWeeklyReward(weeklyReward[childId] ?? 50);
    setLocalDrawCost(drawCost[childId] ?? 20);
  };

  /** ====== children ops ====== */
  const onAddChild = () => {
    const id = addChild("新成員");
    setActiveChild(id);
    syncFromChild(id);
  };
  const onSaveChildName = () => {
    if (!selectedChild) return;
    updateChild(
      selectedChild.id,
      childNameEditing.trim() || selectedChild.name
    );
    syncFromChild(selectedChild.id);
  };
  const onRemoveChild = () => {
    if (!selectedChild) return;
    if (
      !confirm(
        `確定要刪除「${selectedChild.name}」嗎？相關資料（任務、餘額、歷史）將一併移除。`
      )
    )
      return;
    removeChild(selectedChild.id);
    const next = useAppStore.getState().activeChildId;
    syncFromChild(next);
  };

  /** ====== task list editors ====== */
  const addDailyRow = () =>
    setLocalDaily((prev) => [
      ...prev,
      { id: uid("d"), title: "", points: 1, done: false },
    ]);
  const removeDailyRow = (id: string) =>
    setLocalDaily((prev) => prev.filter((d) => d.id !== id));
  const updateDailyRow = (id: string, patch: Partial<DailyTask>) =>
    setLocalDaily((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const addWeeklyRow = () =>
    setLocalWeekly((prev) => [
      ...prev,
      { id: uid("w"), title: "", points: 1, target: 1, count: 0 },
    ]);
  const removeWeeklyRow = (id: string) =>
    setLocalWeekly((prev) => prev.filter((d) => d.id !== id));
  const updateWeeklyRow = (id: string, patch: Partial<WeeklyTask>) =>
    setLocalWeekly((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  /** ====== persist current child section ====== */
  const onSaveCurrentChildSection = () => {
    const cid = selectedChild?.id;
    if (!cid) return;

    const cleanDaily: DailyTask[] = localDaily
      .filter((t: DailyTask) => (t.title ?? "").trim() !== "")
      .map((t: DailyTask) => ({
        ...t,
        points: Math.max(0, Math.floor(Number(t.points) || 0)),
        done: false,
      }));

    const cleanWeekly: WeeklyTask[] = localWeekly
      .filter((t: WeeklyTask) => (t.title ?? "").trim() !== "")
      .map((t: WeeklyTask) => ({
        ...t,
        points: Math.max(0, Math.floor(Number(t.points) || 0)),
        target: Math.max(1, Math.floor(Number(t.target) || 1)),
        count: Math.max(0, Math.floor(Number(t.count) || 0)),
      }));

    setDailyList(cid, cleanDaily);
    setWeeklyList(cid, cleanWeekly);
    setDailyReward(cid, Math.max(0, Math.floor(localDailyReward || 0)));
    setWeeklyReward(cid, Math.max(0, Math.floor(localWeeklyReward || 0)));
    setDrawCost(cid, Math.max(0, Math.floor(localDrawCost || 0)));
    alert("已儲存此小孩的任務與獎勵設定");
  };

  /** ====== shop settings save ====== */
  const onSaveShop = () => {
    const cleanedMoney: MoneyItem[] = moneyItems
      .filter((i) => i.name.trim() !== "")
      .map((i) => ({
        ...i,
        price: Math.max(0, Math.floor(Number(i.price) || 0)),
        id: i.id || uid("m"),
      }));
    const cleanedStar: StarItem[] = starItems
      .filter((i) => i.name.trim() !== "")
      .map((i) => ({
        ...i,
        stars: Math.max(0, Math.floor(Number(i.stars) || 0)),
        id: i.id || uid("s"),
      }));

    setShopConfig({ moneyItems: cleanedMoney, starItems: cleanedStar });
    setExchangeRate(Math.max(1, Math.floor(localRate || 1)));
    alert("已儲存 Shop 設定");
  };

  /** ====== PIN change ====== */
  const [newPin, setNewPin] = useState<string>("");
  const [newPin2, setNewPin2] = useState<string>("");
  const savePin = () => {
    if (!/^\d{4}$/.test(newPin)) {
      alert("新 PIN 必須是 4 位數字。");
      return;
    }
    if (newPin !== newPin2) {
      alert("兩次輸入不一致。");
      return;
    }
    setPinCode(newPin);
    setNewPin("");
    setNewPin2("");
    if (typeof window !== "undefined")
      window.sessionStorage.removeItem(SESSION_KEY);
    alert("PIN 已更新，下次進入需使用新 PIN");
  };

  /** ====== Top-up local state ====== */
  const [topup, setTopup] = useState<number>(0);
  const currentBalance = selectedChild ? balances[selectedChild.id] ?? 0 : 0;

  const doTopup = () => {
    if (!selectedChild) return;
    const amt = Math.max(0, Math.floor(Number(topup) || 0));
    if (amt <= 0) {
      alert("請輸入要儲值的金額（正整數）。");
      return;
    }
    addBalance(selectedChild.id, amt);
    setTopup(0);
    alert(`已為「${selectedChild.name}」儲值 $${amt}`);
  };

  /** ====== Reward Pool editor ====== */
  const rarityOptions: Rarity[] = ["N", "R", "SR", "SSR"];
  const addPoolRow = () =>
    setPoolRows((prev) => [
      ...prev,
      { id: uid("card"), name: "", rarity: "N", weight: 0, icon: "" },
    ]);
  const removePoolRow = (id: string) =>
    setPoolRows((prev) => prev.filter((r) => r.id !== id));
  const updatePoolRow = (id: string, patch: Partial<RewardCard>) =>
    setPoolRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const savePool = () => {
    const cleaned = poolRows
      .filter((c) => (c.name ?? "").trim() !== "")
      .map((c) => ({
        ...c,
        weight: Math.max(0, Math.floor(Number(c.weight) || 0)),
        rarity: (rarityOptions as readonly string[]).includes(c.rarity)
          ? (c.rarity as Rarity)
          : "N",
        icon: (c.icon ?? "").slice(0, 4),
      }));
    if (cleaned.length === 0) {
      alert("卡池至少需要一張卡片。");
      return;
    }
    setRewardPool(cleaned);
    alert("卡池已更新！");
  };

  /** ====== PIN Gate UI ====== */
  if (!verified) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-[92%] max-w-sm bg-white rounded-2xl shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock />
            <h1 className="text-lg font-semibold">家長設定鎖定</h1>
          </div>
          <p className="text-sm text-gray-500">請輸入 4 位數 PIN 才能進入設定頁。</p>
          <div className="mt-4">
            <input
              value={pinInput}
              onChange={(e) =>
                setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="輸入 PIN（預設 0000）"
              className="h-11 w-full rounded-xl border px-3 tracking-widest text-center text-lg"
            />
          </div>
          <button
            onClick={submitPin}
            disabled={pinInput.length !== 4}
            className={`mt-4 h-11 w-full rounded-xl ${
              pinInput.length === 4
                ? "bg-gray-900 text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            進入設定
          </button>
          <div className="mt-3 text-xs text-gray-400">
            提示：預設 PIN 為 0000，可在進入後變更。
          </div>
        </div>
      </div>
    );
  }

  /** ====== Settings main UI ====== */
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">⚙️ Settings</h1>

      {/* 安全性：修改 PIN */}
      <div className="p-4 bg-white rounded-2xl shadow space-y-3">
        <div className="flex items-center gap-2">
          <Lock />
          <h2 className="text-lg font-semibold">安全性</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">新 PIN（4 位數字）</div>
            <input
              value={newPin}
              onChange={(e) =>
                setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              className="h-10 w-full rounded-xl border px-3"
              placeholder="****"
            />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">再次輸入新 PIN</div>
            <input
              value={newPin2}
              onChange={(e) =>
                setNewPin2(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              className="h-10 w-full rounded-xl border px-3"
              placeholder="****"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={savePin}
              className="h-10 px-4 rounded-xl bg-gray-900 text-white"
            >
              更新 PIN
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          * 變更後本視窗不會立刻鎖定；重新整理或下次進入會要求新 PIN。
        </div>
      </div>

      {/* 小孩設定 */}
      <div className="p-4 bg-white rounded-2xl shadow space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users size={18} /> 小孩設定
          </h2>
          <button
            onClick={onAddChild}
            className="h-9 px-3 rounded-lg bg-gray-900 text-white inline-flex items-center gap-2"
          >
            <Plus size={16} /> 新增小孩
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => syncFromChild(c.id)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                localChildId === c.id ? "bg-gray-900 text-white" : "bg-gray-100"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {selectedChild && (
          <>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <div className="text-xs text-gray-500 mb-1">小孩名稱</div>
                <input
                  value={childNameEditing}
                  onChange={(e) => setChildNameEditing(e.target.value)}
                  className="h-10 w-full rounded-xl border px-3"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={onSaveChildName}
                  className="h-10 px-4 rounded-xl bg-gray-900 text-white inline-flex items-center gap-2"
                >
                  <Save size={16} /> 儲存名稱
                </button>
                <button
                  onClick={onRemoveChild}
                  className="h-10 px-4 rounded-xl bg-rose-50 text-rose-600 inline-flex items-center gap-2"
                >
                  <Trash2 size={16} /> 刪除
                </button>
              </div>
            </div>

            {/* 餘額儲值 */}
            <div className="mt-3 p-3 rounded-xl border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet />
                  <div className="font-medium">
                    餘額儲值（{selectedChild.name}）
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  目前餘額：
                  <span className="font-semibold">
                    ${currentBalance}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-col md:flex-row items-stretch md:items-end gap-2">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">儲值金額（$）</div>
                  <input
                    type="number"
                    min={0}
                    value={topup}
                    onChange={(e) =>
                      setTopup(Math.max(0, Math.floor(Number(e.target.value) || 0)))
                    }
                    className="h-10 w-full rounded-lg border px-3"
                    placeholder="例如 100"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTopup((v) => (v ?? 0) + 10)}
                    className="h-10 px-3 rounded-lg bg-gray-100"
                  >
                    +10
                  </button>
                  <button
                    onClick={() => setTopup((v) => (v ?? 0) + 50)}
                    className="h-10 px-3 rounded-lg bg-gray-100"
                  >
                    +50
                  </button>
                  <button
                    onClick={() => setTopup((v) => (v ?? 0) + 100)}
                    className="h-10 px-3 rounded-lg bg-gray-100"
                  >
                    +100
                  </button>
                </div>
                <button
                  onClick={doTopup}
                  className="h-10 px-4 rounded-lg bg-emerald-600 text-white"
                >
                  儲值
                </button>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                * 儲值只會增加餘額，不會計入「本月已花」。
              </div>
            </div>
          </>
        )}
      </div>

      {/* 任務設定（每日/每週 + 完成獎勵 + 抽卡費用） */}
      {selectedChild && (
        <div className="p-4 bg-white rounded-2xl shadow space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles size={18} /> 任務設定（{selectedChild.name}）
            </h2>
            <button
              onClick={onSaveCurrentChildSection}
              className="h-9 px-3 rounded-lg bg-gray-900 text-white inline-flex items-center gap-2"
            >
              <Save size={16} /> 儲存此小孩設定
            </button>
          </div>

          {/* 每日任務 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600">每日任務</h3>
              <button
                onClick={addDailyRow}
                className="h-8 px-3 rounded-lg bg-gray-100 inline-flex items-center gap-2"
              >
                <Plus size={14} /> 新增任務
              </button>
            </div>
            {localDaily.length === 0 ? (
              <p className="text-sm text-gray-500">
                尚無每日任務，點右上「新增任務」。
              </p>
            ) : (
              <div className="space-y-2">
                {localDaily.map((t) => (
                  <div
                    key={t.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
                  >
                    <input
                      value={t.title}
                      onChange={(e) =>
                        setLocalDaily((prev) =>
                          prev.map((x) =>
                            x.id === t.id ? { ...x, title: e.target.value } : x
                          )
                        )
                      }
                      placeholder="任務名稱"
                      className="md:col-span-7 h-10 rounded-lg border px-3"
                    />
                    <div className="md:col-span-3">
                      <div className="text-xs text-gray-500 mb-1">
                        星星（完成可得）
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={t.points}
                        onChange={(e) =>
                          setLocalDaily((prev) =>
                            prev.map((x) =>
                              x.id === t.id
                                ? {
                                    ...x,
                                    points: Math.max(
                                      0,
                                      Math.floor(Number(e.target.value) || 0)
                                    ),
                                  }
                                : x
                            )
                          )
                        }
                        className="h-10 w-full rounded-lg border px-3"
                      />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <button
                        onClick={() =>
                          setLocalDaily((prev) => prev.filter((x) => x.id !== t.id))
                        }
                        className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 inline-flex items-center justify-center"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 每週任務 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600">每週任務</h3>
              <button
                onClick={addWeeklyRow}
                className="h-8 px-3 rounded-lg bg-gray-100 inline-flex items-center gap-2"
              >
                <Plus size={14} /> 新增任務
              </button>
            </div>
            {localWeekly.length === 0 ? (
              <p className="text-sm text-gray-500">
                尚無每週任務，點右上「新增任務」。
              </p>
            ) : (
              <div className="space-y-2">
                {localWeekly.map((t) => (
                  <div
                    key={t.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
                  >
                    <input
                      value={t.title}
                      onChange={(e) =>
                        setLocalWeekly((prev) =>
                          prev.map((x) =>
                            x.id === t.id ? { ...x, title: e.target.value } : x
                          )
                        )
                      }
                      placeholder="任務名稱"
                      className="md:col-span-5 h-10 rounded-lg border px-3"
                    />
                    <div className="md:col-span-3">
                      <div className="text-xs text-gray-500 mb-1">每次 + 星星</div>
                      <input
                        type="number"
                        min={0}
                        value={t.points}
                        onChange={(e) =>
                          setLocalWeekly((prev) =>
                            prev.map((x) =>
                              x.id === t.id
                                ? {
                                    ...x,
                                    points: Math.max(
                                      0,
                                      Math.floor(Number(e.target.value) || 0)
                                    ),
                                  }
                                : x
                            )
                          )
                        }
                        className="h-10 w-full rounded-lg border px-3"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-xs text-gray-500 mb-1">
                        每週目標次數
                      </div>
                      <input
                        type="number"
                        min={1}
                        value={t.target}
                        onChange={(e) =>
                          setLocalWeekly((prev) =>
                            prev.map((x) =>
                              x.id === t.id
                                ? {
                                    ...x,
                                    target: Math.max(
                                      1,
                                      Math.floor(Number(e.target.value) || 1)
                                    ),
                                  }
                                : x
                            )
                          )
                        }
                        className="h-10 w-full rounded-lg border px-3"
                      />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <button
                        onClick={() =>
                          setLocalWeekly((prev) => prev.filter((x) => x.id !== t.id))
                        }
                        className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 inline-flex items-center justify-center"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 完成獎勵 & 抽卡費用 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border">
              <div className="text-xs text-gray-500 mb-1">每日完成獎勵（$）</div>
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-600" />
                <input
                  type="number"
                  min={0}
                  value={localDailyReward}
                  onChange={(e) =>
                    setLocalDailyReward(
                      Math.max(0, Math.floor(Number(e.target.value) || 0))
                    )
                  }
                  className="h-10 w-32 rounded-lg border px-3"
                />
              </div>
            </div>
            <div className="p-3 rounded-xl border">
              <div className="text-xs text-gray-500 mb-1">每週完成獎勵（$）</div>
              <div className="flex items-center gap-2">
                <Gift size={16} className="text-amber-600" />
                <input
                  type="number"
                  min={0}
                  value={localWeeklyReward}
                  onChange={(e) =>
                    setLocalWeeklyReward(
                      Math.max(0, Math.floor(Number(e.target.value) || 0))
                    )
                  }
                  className="h-10 w-32 rounded-lg border px-3"
                />
              </div>
            </div>
            <div className="p-3 rounded-xl border">
              <div className="text-xs text-gray-500 mb-1">抽卡費用（$ / 次）</div>
              <div className="flex items-center gap-2">
                <Ticket size={16} className="text-indigo-600" />
                <input
                  type="number"
                  min={0}
                  value={localDrawCost}
                  onChange={(e) =>
                    setLocalDrawCost(
                      Math.max(0, Math.floor(Number(e.target.value) || 0))
                    )
                  }
                  className="h-10 w-32 rounded-lg border px-3"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 抽卡卡池設定 */}
      <div className="p-4 bg-white rounded-2xl shadow space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wand2 size={18} /> 抽卡卡池
          </h2>
          <button
            onClick={addPoolRow}
            className="h-9 px-3 rounded-lg bg-gray-100 inline-flex items-center gap-2"
          >
            <Plus size={16} /> 新增卡片
          </button>
        </div>

        {poolRows.length === 0 ? (
          <p className="text-sm text-gray-500">尚無卡片，點右上「新增卡片」。</p>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-3">
            {poolRows.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
              >
                <input
                  value={c.name}
                  onChange={(e) => updatePoolRow(c.id, { name: e.target.value })}
                  placeholder="卡片名稱（例如：寶可夢卡卡包）"
                  className="md:col-span-5 h-10 rounded-lg border px-3"
                />
                <select
                  value={c.rarity}
                  onChange={(e) =>
                    updatePoolRow(c.id, {
                      rarity: e.target.value as Rarity,
                    })
                  }
                  className="md:col-span-2 h-10 rounded-lg border px-3"
                >
                  {(["N", "R", "SR", "SSR"] as Rarity[]).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <div className="md:col-span-2">
                  <div className="text-xs text-gray-500 mb-1">權重（機率權重）</div>
                  <input
                    type="number"
                    min={0}
                    value={c.weight}
                    onChange={(e) =>
                      updatePoolRow(c.id, {
                        weight: Math.max(
                          0,
                          Math.floor(Number(e.target.value) || 0)
                        ),
                      })
                    }
                    className="h-10 w-full rounded-lg border px-3"
                  />
                </div>
                <input
                  value={c.icon ?? ""}
                  onChange={(e) => updatePoolRow(c.id, { icon: e.target.value })}
                  placeholder="Icon（建議 Emoji）"
                  className="md:col-span-2 h-10 rounded-lg border px-3"
                />
                <div className="md:col-span-1 flex justify-end">
                  <button
                    onClick={() => removePoolRow(c.id)}
                    className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 inline-flex items-center justify-center"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-500">
          機率＝權重 ÷（所有卡片權重總和）。建議：N/R 佔大多數，SR 少量，SSR 稀有（約 1%）。
        </div>

        <div className="flex items-center justify-end">
          <button
            onClick={savePool}
            className="h-9 px-3 rounded-lg bg-gray-900 text-white inline-flex items-center gap-2"
          >
            <Save size={16} /> 儲存卡池
          </button>
        </div>
      </div>

      {/* Shop 設定 */}
      <div className="p-4 bg-white rounded-2xl shadow space-y-4">
        <h2 className="text-lg font-semibold">🛍️ Shop 設定</h2>

        {/* 星星兌換匯率 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600">星星兌換匯率</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            設定多少顆 ⭐️ 可以兌換 $1（目前：{rate} ⭐️ ⇒ $1）
          </p>
          <div className="mt-2 flex items-end gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">星星顆數 / $1</div>
              <input
                type="number"
                min={1}
                step={1}
                value={localRate}
                onChange={(e) =>
                  setLocalRate(Math.max(1, Math.floor(Number(e.target.value) || 1)))
                }
                className="h-10 w-40 rounded-xl border px-3"
              />
            </div>
            <div className="text-sm text-gray-600">
              顯示於 Shop：{localRate} ⭐️ ⇒ $1
            </div>
          </div>
        </div>

        {/* 用星星兌換商品 */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-600">用星星兌換商品</h3>
            <button
              onClick={() =>
                setStarItems((prev) => [
                  ...prev,
                  { id: uid("s"), name: "", stars: 0, note: "" },
                ])
              }
              className="h-8 px-3 rounded-lg bg-gray-100 inline-flex items-center gap-2"
            >
              <Plus size={14} /> 新增
            </button>
          </div>

          {starItems.length === 0 ? (
            <p className="text-sm text-gray-500 mt-2">尚無商品，點右上「新增」。</p>
          ) : (
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              {starItems.map((it) => (
                <div key={it.id} className="rounded-xl border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <input
                      value={it.name}
                      onChange={(e) =>
                        setStarItems((prev) =>
                          prev.map((x) =>
                            x.id === it.id ? { ...x, name: e.target.value } : x
                          )
                        )
                      }
                      placeholder="商品名稱"
                      className="h-10 flex-1 rounded-lg border px-3 mr-2"
                    />
                    <button
                      onClick={() =>
                        setStarItems((prev) => prev.filter((x) => x.id !== it.id))
                      }
                      className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 inline-flex items-center justify中心"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">需要星星</div>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={it.stars}
                        onChange={(e) =>
                          setStarItems((prev) =>
                            prev.map((x) =>
                              x.id === it.id
                                ? {
                                    ...x,
                                    stars: Math.max(
                                      0,
                                      Math.floor(Number(e.target.value) || 0)
                                    ),
                                  }
                                : x
                            )
                          )
                        }
                        className="h-10 w-full rounded-lg border px-3"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">備註（可選）</div>
                      <input
                        value={it.note ?? ""}
                        onChange={(e) =>
                          setStarItems((prev) =>
                            prev.map((x) =>
                              x.id === it.id ? { ...x, note: e.target.value } : x
                            )
                          )
                        }
                        placeholder="例：一次性 / 限假日"
                        className="h-10 w-full rounded-lg border px-3"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 用錢購買商品 */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-600">用錢購買商品</h3>
            <button
              onClick={() =>
                setMoneyItems((prev) => [
                  ...prev,
                  { id: uid("m"), name: "", price: 0, note: "" },
                ])
              }
              className="h-8 px-3 rounded-lg bg-gray-100 inline-flex items-center gap-2"
            >
              <Plus size={14} /> 新增
            </button>
          </div>

          {moneyItems.length === 0 ? (
            <p className="text-sm text-gray-500 mt-2">尚無商品，點右上「新增」。</p>
          ) : (
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              {moneyItems.map((it) => (
                <div key={it.id} className="rounded-xl border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <input
                      value={it.name}
                      onChange={(e) =>
                        setMoneyItems((prev) =>
                          prev.map((x) =>
                            x.id === it.id ? { ...x, name: e.target.value } : x
                          )
                        )
                      }
                      placeholder="商品名稱"
                      className="h-10 flex-1 rounded-lg border px-3 mr-2"
                    />
                    <button
                      onClick={() =>
                        setMoneyItems((prev) => prev.filter((x) => x.id !== it.id))
                      }
                      className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 inline-flex items-center justify-center"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">價格（$）</div>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={it.price}
                        onChange={(e) =>
                          setMoneyItems((prev) =>
                            prev.map((x) =>
                              x.id === it.id
                                ? {
                                    ...x,
                                    price: Math.max(
                                      0,
                                      Math.floor(Number(e.target.value) || 0)
                                    ),
                                  }
                                : x
                            )
                          )
                        }
                        className="h-10 w-full rounded-lg border px-3"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">備註（可選）</div>
                      <input
                        value={it.note ?? ""}
                        onChange={(e) =>
                          setMoneyItems((prev) =>
                            prev.map((x) =>
                              x.id === it.id ? { ...x, note: e.target.value } : x
                            )
                          )
                        }
                        placeholder="例：一次性 / 限假日"
                        className="h-10 w-full rounded-lg border px-3"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end">
          <button
            onClick={onSaveShop}
            className="h-9 px-3 rounded-lg bg-gray-900 text-white inline-flex items-center gap-2"
          >
            <Save size={16} /> 儲存 Shop 設定
          </button>
        </div>
      </div>
    </div>
  );
}
