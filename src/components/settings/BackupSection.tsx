"use client";

import { useRef, useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";

// 建議：手動更新此版本字串，對應你的 App 版本
const BACKUP_VERSION = "1.2.0";
const APP_NAME = "FamGrow"; // or 家庭成長任務

type Serializable = Record<string, any>;

type BackupFile = {
  app: string;
  version: string;
  createdAt: string; // ISO
  data: Serializable;
};

function nowISO() {
  return new Date().toISOString();
}

function dateStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/** 只序列化可 JSON 的資料（function、自循環會被過濾） */
function snapshotStateForBackup(state: Record<string, any>): Serializable {
  // 1) 先淺拷貝，避免直接動到 store 實體
  const shallow = { ...state };

  // 2) 常見 transient 欄位可在這裡主動排除（如果你的 store 有）
  //   delete shallow.uiTemp;
  //   delete shallow._hydrated;

  // 3) 使用 JSON 序列化去掉 function / symbol
  try {
    return JSON.parse(JSON.stringify(shallow));
  } catch {
    // 若有不可序列化的東西，退而求其次做一個手動過濾
    const clean: Serializable = {};
    for (const [k, v] of Object.entries(shallow)) {
      if (typeof v !== "function" && typeof v !== "symbol") clean[k] = v;
    }
    return clean;
  }
}

/** 將匯入資料合併進現有 store（深度合併，僅物件/陣列/原始值） */
function deepMerge(target: any, source: any) {
  if (Array.isArray(target) && Array.isArray(source)) {
    // 策略：直接以「來源」覆蓋整個陣列（避免 index 對不齊的髒資料）
    return source.slice();
  }
  if (isPlainObject(target) && isPlainObject(source)) {
    const out: Record<string, any> = { ...target };
    for (const key of Object.keys(source)) {
      out[key] = key in target ? deepMerge(target[key], source[key]) : source[key];
    }
    return out;
  }
  return source; // 其他型別直接覆蓋
}

function isPlainObject(v: any) {
  return Object.prototype.toString.call(v) === "[object Object]";
}

export default function BackupSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const getState = useAppStore as any; // 為了能取用 getState/setState
  const rawState = (getState.getState?.() ?? {}) as Record<string, any>;

  const serializableState = useMemo(
    () => snapshotStateForBackup(rawState),
    [rawState]
  );

  const handleExport = () => {
    const payload: BackupFile = {
      app: APP_NAME,
      version: BACKUP_VERSION,
      createdAt: nowISO(),
      data: serializableState,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${APP_NAME}-backup_${BACKUP_VERSION}_${dateStamp()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const safeDownload = (obj: any, filename: string) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const beforeImportBackup = () => {
    // 匯入前自動備份目前資料，讓使用者可還原
    const pre: BackupFile = {
      app: APP_NAME,
      version: BACKUP_VERSION,
      createdAt: nowISO(),
      data: serializableState,
    };
    safeDownload(pre, `${APP_NAME}-pre-import-backup_${dateStamp()}.json`);
  };

  const handleChooseFile = () => fileRef.current?.click();

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 允許同檔再次選取
    if (!file) return;

    try {
      setBusy(true);
      // 0) 匯入前自動備份
      beforeImportBackup();

      const text = await file.text();
      const json: BackupFile = JSON.parse(text);

      // 1) 基本驗證
      if (!json || typeof json !== "object") throw new Error("檔案不是有效的 JSON");
      if (json.app !== APP_NAME) {
        if (
          !confirm(
            `這個備份看起來不是 ${APP_NAME} 建立的（app=${json.app}）。仍要嘗試匯入嗎？`
          )
        )
          return;
      }
      if (!json.data || typeof json.data !== "object") {
        throw new Error("備份檔缺少 data 區塊");
      }

      // 2) 版本提示（非強制）
      if (json.version && json.version !== BACKUP_VERSION) {
        const ok = confirm(
          `備份版本 (${json.version}) 與目前版本 (${BACKUP_VERSION}) 不同。\n一般仍可匯入，但可能有欄位差異。\n要繼續嗎？`
        );
        if (!ok) return;
      }

      // 3) 合併或覆蓋
      const mode = window.prompt(
        "匯入模式：\n輸入 1 = 合併（建議，多數情況適用）\n輸入 2 = 完全覆蓋（小心，會用備份覆蓋目前所有資料）",
        "1"
      );

      const current = getState.getState?.() ?? {};

      let nextState: Record<string, any>;
      if (mode === "2") {
        // 覆蓋：僅保留「方法」與「非資料欄位」，資料以備份的 data 為主
        nextState = { ...current };
        for (const key of Object.keys(current)) {
          if (typeof (current as any)[key] !== "function") {
            delete (nextState as any)[key];
          }
        }
        nextState = { ...nextState, ...json.data };
      } else {
        // 合併：保留現有資料，將備份資料深度合併進來
        nextState = deepMerge(current, json.data);
      }

      // 4) 寫回 store（不會覆蓋 function）
      getState.setState?.(nextState, true);

      alert("匯入完成！");
    } catch (err: any) {
      console.error(err);
      alert(`匯入失敗：${err?.message ?? err}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border p-4 md:p-6 bg-white/80 shadow-sm space-y-4">
      <h2 className="text-xl font-semibold">資料備份與還原</h2>
      <p className="text-sm text-gray-600">
        • 匯出會下載目前的 App 資料（不含功能方法）。<br />
        • 匯入前會自動先下載一份「匯入前備份」，以便還原。<br />
        • 建議定期手動備份，或在重大更新前備份一次。
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:opacity-90 disabled:opacity-50"
          disabled={busy}
        >
          匯出 JSON
        </button>

        <button
          onClick={handleChooseFile}
          className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          disabled={busy}
        >
          匯入 JSON
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      <div className="text-xs text-gray-500">
        <div>App：{APP_NAME}</div>
        <div>Backup 版本：{BACKUP_VERSION}</div>
        <div>目前快照大小：約 {new Blob([JSON.stringify(serializableState)]).size.toLocaleString()} bytes</div>
      </div>
    </section>
  );
}
