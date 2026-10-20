import { useEffect } from 'react';
import { RotateCcw, X } from 'lucide-react';
import type { ViewId } from '../types/inventory';
import { MORE_NAV, PRIMARY_NAV, type NavItem } from './navItems';
import { iconBtn } from './ui';

interface Props {
  open: boolean;
  view: ViewId;
  onClose: () => void;
  onNavigate: (v: ViewId) => void;
  onReset: () => void;
}

function Group({ title, items, view, onNavigate }: { title: string; items: NavItem[]; view: ViewId; onNavigate: (v: ViewId) => void }) {
  return (
    <div className="mb-4">
      <p className="px-3 pb-1 text-xs font-semibold text-slate-500">{title}</p>
      {items.map(({ id, label, icon: Icon }) => {
        const active = view === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            aria-current={active ? 'page' : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              active ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function SideDrawer({ open, view, onClose, onNavigate, onReset }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-xl" aria-label="Menu">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
          <span className="text-base font-bold text-slate-900">Menu</span>
          <button type="button" className={iconBtn} onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <Group title="Main" items={PRIMARY_NAV} view={view} onNavigate={onNavigate} />
          <Group title="More" items={MORE_NAV} view={view} onNavigate={onNavigate} />
        </div>
        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={onReset}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            <RotateCcw size={18} />
            Reset to sample data
          </button>
        </div>
      </aside>
    </div>
  );
}
