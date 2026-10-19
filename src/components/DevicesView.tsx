import { useMemo, useRef, useState } from 'react';
import { Download, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import type { Inventory } from '../store/useInventory';
import { CATEGORIES, PLANTS, type Device } from '../types/inventory';
import { devicesToCsv, matchesQuery, parseDevicesCsv, warrantyState } from '../utils/inventoryRules';
import { Badge, btnOutline, btnPrimary, Empty, formatDate, iconBtn, inputCls, PageTitle, StatusDot } from './ui';

interface Props {
  inv: Inventory;
  query: string;
  onClearQuery: () => void;
  onAdd: () => void;
  onEdit: (d: Device) => void;
}

export default function DevicesView({ inv, query, onClearQuery, onAdd, onEdit }: Props) {
  const { devices, racks } = inv.data;
  const [plant, setPlant] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; lines: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const plants = useMemo(() => Array.from(new Set([...PLANTS, ...devices.map((d) => d.plant)])), [devices]);

  const shown = devices.filter(
    (d) =>
      matchesQuery(d, query) &&
      (!plant || d.plant === plant) &&
      (!category || d.category === category) &&
      (!status || (status === 'online') === d.online),
  );

  const exportCsv = () => {
    const blob = new Blob([devicesToCsv(devices)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fccl-devices.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const { drafts, errors } = parseDevicesCsv(text, devices);
    inv.importDevices(drafts);
    setMessage({
      ok: drafts.length > 0 && errors.length === 0,
      lines: [`${drafts.length} device${drafts.length === 1 ? '' : 's'} added.`, ...errors.slice(0, 8), ...(errors.length > 8 ? [`...and ${errors.length - 8} more problems.`] : [])],
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  const remove = (d: Device) => {
    if (window.confirm(`Delete ${d.name} (${d.serial})?`)) inv.deleteDevice(d.id);
  };

  const rackName = (id: string) => racks.find((r) => r.id === id)?.name ?? '';

  return (
    <div>
      <PageTitle
        title="Devices"
        subtitle={`${shown.length} of ${devices.length} devices`}
        actions={
          <>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => importCsv(e.target.files?.[0])} />
            <button type="button" className={btnOutline} onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Import CSV
            </button>
            <button type="button" className={btnOutline} onClick={exportCsv}>
              <Download size={16} /> Export CSV
            </button>
            <button type="button" className={btnPrimary} onClick={onAdd}>
              <Plus size={16} /> Add device
            </button>
          </>
        }
      />

      {message ? (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${message.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-orange-200 bg-orange-50 text-orange-900'}`}>
          {message.lines.map((l) => (
            <p key={l}>{l}</p>
          ))}
          <button type="button" className="mt-1 font-semibold underline" onClick={() => setMessage(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className={`${inputCls} w-auto`} value={plant} onChange={(e) => setPlant(e.target.value)} aria-label="Filter by plant">
          <option value="">All plants</option>
          {plants.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select className={`${inputCls} w-auto`} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by type">
          <option value="">All types</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className={`${inputCls} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">Online and offline</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
        {query ? (
          <button type="button" className={btnOutline} onClick={onClearQuery}>
            Clear search “{query}”
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {shown.length === 0 ? (
          <Empty text="No devices match." />
        ) : (
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-2.5">No.</th>
                <th className="px-4 py-2.5">Serial number</th>
                <th className="px-4 py-2.5">Device</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Plant</th>
                <th className="px-4 py-2.5">Used by</th>
                <th className="px-4 py-2.5">Warranty</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((d) => {
                const w = warrantyState(d.warrantyEnd);
                return (
                  <tr key={d.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-500">{d.no}</td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2.5">
                        <StatusDot online={d.online} />
                        <span className="font-mono text-xs text-slate-800">{d.serial}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="block font-medium text-slate-900">{d.name}</span>
                      <span className="block text-xs text-slate-500">
                        {d.model}
                        {d.rack ? ` · ${rackName(d.rack)}, unit ${d.rackStart}` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{d.category}</td>
                    <td className="px-4 py-2.5 text-slate-700">{d.plant}</td>
                    <td className="px-4 py-2.5 text-slate-700">{d.assignedTo || '—'}</td>
                    <td className="px-4 py-2.5">
                      {w === 'none' ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <Badge tone={w === 'expired' ? 'red' : w === 'soon' ? 'orange' : 'gray'}>{formatDate(d.warrantyEnd)}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex justify-end gap-1">
                        <button type="button" className={iconBtn} onClick={() => onEdit(d)} aria-label={`Edit ${d.name}`}>
                          <Pencil size={16} />
                        </button>
                        <button type="button" className={iconBtn} onClick={() => remove(d)} aria-label={`Delete ${d.name}`}>
                          <Trash2 size={16} />
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500" /> Online
        <span className="mx-1 ml-4 inline-block h-2 w-2 rounded-full bg-orange-500" /> Offline
      </p>
    </div>
  );
}
