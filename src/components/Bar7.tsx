// src/components/Bar7.tsx
import * as React from 'react';

type Props = {
  data: { day: string; count: number }[];
  label: string;
};

/**
 * 最近 7 天完成數長條圖
 * @param data 例如 [{day: '08-31', count: 3}, ...]
 * @param label 圖表標題
 */
export default function Bar7({ data, label }: Props) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-2 text-sm font-medium">{label}</div>
      <div className="grid grid-cols-7 gap-2">
        {data.map((d) => (
          <div key={d.day} className="flex flex-col items-center gap-1">
            <div className="relative h-20 w-6 overflow-hidden rounded bg-slate-100">
              <div
                className="absolute bottom-0 w-full bg-indigo-500"
                style={{ height: `${Math.min(100, d.count * 20)}%` }}
                title={`${d.count}`}
              />
            </div>
            <div className="text-[10px] text-slate-500">
              {d.day.slice(0, 2)}/{d.day.slice(3)}
            </div>
            <div className="text-xs">{d.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
