// src/components/Tabs.tsx
import * as React from 'react';

type TabKey = string;

type Props = {
  tabs: { key: TabKey; label: string }[];
  active: TabKey;
  onChange: (key: TabKey) => void;
  className?: string;
  buttonClassName?: (key: TabKey, isActive: boolean) => string;
};

/**
 * 極簡 Tabs：
 * - tabs: [{key,label}]
 * - active: 目前分頁 key
 * - onChange: 切換事件
 * - 可用 buttonClassName 自訂樣式
 */
export default function Tabs({
  tabs,
  active,
  onChange,
  className = '',
  buttonClassName,
}: Props) {
  return (
    <div className={`flex gap-2 ${className}`}>
      {tabs.map(({ key, label }) => {
        const isActive = key === active;
        const base = `h-9 rounded-md px-3 border ${
          isActive ? 'bg-slate-900 text-white' : 'bg-white'
        }`;
        const cls = buttonClassName ? buttonClassName(key, isActive) : base;
        return (
          <button key={key} onClick={() => onChange(key)} className={cls}>
            {label}
          </button>
        );
      })}
    </div>
  );
}
