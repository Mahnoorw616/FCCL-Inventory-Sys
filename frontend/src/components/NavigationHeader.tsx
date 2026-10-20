import { Menu, Plus, Search } from 'lucide-react';
import type { ViewId } from '../types/inventory';
import { PRIMARY_NAV } from './navItems';
import { btnPrimary, iconBtn } from './ui';

import type { BackendStatus } from '../store/useInventory';

interface Props {
  view: ViewId;
  query: string;
  status?: BackendStatus;
  isSyncing?: boolean;
  onRefresh?: () => void;
  onQuery: (q: string) => void;
  onNavigate: (v: ViewId) => void;
  onOpenDrawer: () => void;
  onAddDevice: () => void;
}

export default function NavigationHeader({
  view,
  query,
  status = 'connected',
  isSyncing = false,
  onRefresh,
  onQuery,
  onNavigate,
  onOpenDrawer,
  onAddDevice,
}: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <button type="button" className={iconBtn} onClick={onOpenDrawer} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <button type="button" className="text-left" onClick={() => onNavigate('overview')}>
          <span className="block text-base font-bold leading-tight text-slate-900">FCCL Inventory</span>
          <span className="hidden text-xs text-slate-500 sm:block">Devices, stock and work orders</span>
        </button>

        <div className="hidden items-center gap-1.5 sm:flex">
          {status === 'connected' && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200"
              title="Connected to Render backend service"
            >
              <span className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${isSyncing ? 'animate-ping' : ''}`} />
              Backend Live
            </span>
          )}
          {status === 'connecting' && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200"
              title="Connecting to Render backend service (free tier cold-start may take ~30s)"
            >
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-amber-500" />
              Connecting...
            </span>
          )}
          {status === 'offline' && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-200 border border-slate-200"
              title="Using local cache. Click to reconnect"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Offline (retry)
            </button>
          )}
        </div>

        <div className="relative ml-auto w-full max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Find by serial number"
            aria-label="Find a device by serial number"
            className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20"
          />
        </div>

        <button type="button" className={`${btnPrimary} shrink-0`} onClick={onAddDevice}>
          <Plus size={16} />
          <span className="hidden sm:inline">Add device</span>
        </button>
      </div>

      <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4" aria-label="Main sections">
        {PRIMARY_NAV.map(({ id, label, icon: Icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              aria-current={active ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                active ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
