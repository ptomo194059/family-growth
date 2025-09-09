// src/components/TaskEditor.tsx
import * as React from 'react';
import type { Task } from '../domain/types';

type Props = {
  lang: 'zh' | 'en';
  tasks: Task[];
  onAdd: (label: string, category: string) => void;
  onRemove: (id: string) => void;
  placeholders: { name: string; cat: string };
  addLabel: string;
  deleteLabel: string;
  catOf: (t: Task) => string;
  nameOf: (t: Task) => string;
};

export default function TaskEditor({
  lang,
  tasks,
  onAdd,
  onRemove,
  placeholders,
  addLabel,
  deleteLabel,
  catOf,
  nameOf,
}: Props) {
  const [newLabel, setNewLabel] = React.useState('');
  const [newCategory, setNewCategory] = React.useState('');

  function add() {
    const l = newLabel.trim();
    const c = (newCategory.trim() || (lang === 'zh' ? '其他' : 'Other')).slice(0, 20);
    if (!l) return;
    onAdd(l, c);
    setNewLabel('');
    setNewCategory('');
  }

  return (
    <div className="rounded-2xl border bg-white p-4 space-y-3">
      <div className="grid md:grid-cols-3 gap-2">
        <input
          placeholder={placeholders.name}
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="h-9 rounded-md border px-2"
        />
        <input
          placeholder={placeholders.cat}
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="h-9 rounded-md border px-2"
        />
        <button onClick={add} className="h-9 rounded-md bg-indigo-600 px-3 text-white">
          {addLabel}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-2">
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-xl border p-2 text-sm">
            <div>
              <span className="text-slate-500 mr-2">{catOf(t)}</span>
              {nameOf(t)}
            </div>
            <button onClick={() => onRemove(t.id)} className="h-8 rounded-md border px-3">
              {deleteLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
