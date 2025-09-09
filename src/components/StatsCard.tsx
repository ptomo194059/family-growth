// src/components/StatsCard.tsx
import * as React from 'react';

type Props = {
  /** 卡片左上角的小標 */
  label: string;
  /** 主要數值（會以較大字體呈現） */
  value?: React.ReactNode;
  /** 右上角可放入自訂節點（例如輸入框或按鈕） */
  right?: React.ReactNode;
  /** 底部的輔助文字或內容 */
  footer?: React.ReactNode;
  /** 額外樣式 */
  className?: string;
};

/**
 * 簡潔統計卡片：
 * - label（小字）
 * - value（大字）
 * - right（同一行右側可塞 input/按鈕）
 * - footer（次要說明）
 */
export default function StatsCard({
  label,
  value,
  right,
  footer,
  className = '',
}: Props) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs text-slate-500">{label}</div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      {value !== undefined && (
        <div className="mt-1 text-2xl font-semibold leading-tight">{value}</div>
      )}

      {footer ? (
        <div className="mt-1 text-xs text-slate-500">{footer}</div>
      ) : null}
    </div>
  );
}
