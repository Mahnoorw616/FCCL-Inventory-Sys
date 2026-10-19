import type { ReactNode } from 'react';
import type { Inventory } from '../store/useInventory';
import type { ViewId } from '../types/inventory';
import { isLowStock, warrantyState } from '../utils/inventoryRules';
import { Badge, Empty, formatDate, PageTitle, Panel, StatusDot } from './ui';

function Stat({ label, value, tone, onClick }: { label: string; value: number; tone: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-teal-700">
      <span className="block text-sm text-slate-500">{label}</span>
      <span className={`mt-1 block text-3xl font-bold ${tone}`}>{value}</span>
    </button>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <li className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 text-sm last:border-b-0">{children}</li>;
}

export default function DashboardOverview({ inv, onNavigate }: { inv: Inventory; onNavigate: (v: ViewId) => void }) {
  const { devices, workOrders, stock } = inv.data;
  const online = devices.filter((d) => d.online).length;
  const offlineDevices = devices.filter((d) => !d.online);
  const openOrders = workOrders.filter((w) => w.status !== 'Done');
  const lowStock = stock.filter(isLowStock);
  const warranty = devices.filter((d) => ['expired', 'soon'].includes(warrantyState(d.warrantyEnd)));

  return (
    <div>
      <PageTitle title="Overview" subtitle="What needs attention right now" />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Devices" value={devices.length} tone="text-slate-900" onClick={() => onNavigate('devices')} />
        <Stat label="Online" value={online} tone="text-green-600" onClick={() => onNavigate('devices')} />
        <Stat label="Offline" value={offlineDevices.length} tone="text-orange-600" onClick={() => onNavigate('devices')} />
        <Stat label="Open work orders" value={openOrders.length} tone="text-slate-900" onClick={() => onNavigate('work')} />
        <Stat label="Low stock" value={lowStock.length} tone={lowStock.length ? 'text-red-600' : 'text-slate-900'} onClick={() => onNavigate('stock')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Offline devices">
          {offlineDevices.length === 0 ? (
            <Empty text="All devices are online." />
          ) : (
            <ul>
              {offlineDevices.map((d) => (
                <Row key={d.id}>
                  <span className="flex min-w-0 items-center gap-3">
                    <StatusDot online={d.online} />
                    <span className="truncate font-medium text-slate-800">{d.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-slate-500">{d.serial}</span>
                </Row>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Open work orders">
          {openOrders.length === 0 ? (
            <Empty text="No open work orders." />
          ) : (
            <ul>
              {openOrders.slice(0, 6).map((w) => (
                <Row key={w.id}>
                  <span className="min-w-0 truncate text-slate-800">
                    <span className="mr-2 text-slate-400">#{w.no}</span>
                    {w.title}
                  </span>
                  <Badge tone={w.priority === 'High' ? 'red' : w.priority === 'Medium' ? 'orange' : 'gray'}>{w.priority}</Badge>
                </Row>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Low stock">
          {lowStock.length === 0 ? (
            <Empty text="Nothing is running low." />
          ) : (
            <ul>
              {lowStock.map((s) => (
                <Row key={s.id}>
                  <span className="truncate text-slate-800">{s.name}</span>
                  <span className="shrink-0 text-slate-600">
                    {s.quantity} left (minimum {s.minimum})
                  </span>
                </Row>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Warranty ended or ending soon">
          {warranty.length === 0 ? (
            <Empty text="No warranty needs attention." />
          ) : (
            <ul>
              {warranty.map((d) => (
                <Row key={d.id}>
                  <span className="truncate text-slate-800">
                    {d.name} <span className="font-mono text-xs text-slate-500">{d.serial}</span>
                  </span>
                  <Badge tone={warrantyState(d.warrantyEnd) === 'expired' ? 'red' : 'orange'}>
                    {warrantyState(d.warrantyEnd) === 'expired' ? 'Ended' : 'Ends'} {formatDate(d.warrantyEnd)}
                  </Badge>
                </Row>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
