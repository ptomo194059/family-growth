// src/components/Modal.tsx
import * as React from 'react';

type Props = {
  open: boolean;
  title: string;
  content: string;
  okLabel: string;
  onClose: () => void;
};

export default function Modal({ open, title, content, okLabel, onClose }: Props) {
  if (!open) return null;

  function stop(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl"
        onClick={stop}
      >
        <div className="mb-2 text-lg font-semibold">{title}</div>
        <div className="mb-4 whitespace-pre-line text-slate-700">{content}</div>
        <div className="text-right">
          <button
            className="h-9 rounded-md bg-indigo-600 px-3 text-white"
            onClick={onClose}
          >
            {okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
