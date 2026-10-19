import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Inventory } from '../store/useInventory';
import { PLANTS, type Device, type Rack } from '../types/inventory';
import { btnPrimary, Empty, ErrorText, Field, iconBtn, inputCls, PageTitle, Panel, StatusDot } from './ui';

function RackDiagram({ rack, devices }: { rack: Rack; devices: Device[] }) {
  const units = Array.from({ length: rack.units }, (_, i) => rack.units - i); // top unit first
  const deviceAt = (u: number) => devices.find((d) => d.rackStart <= u && u <= d.rackStart + d.rackUnits - 1);
  return (
    <div className="max-h-[32rem] overflow-y-auto border-t border-slate-100 px-4 py-3">
      {units.map((u) => {
        const d = deviceAt(u);
        const top = d ? u === d.rackStart + d.rackUnits - 1 : false;
        return (
          <div key={u} className="flex items-stretch gap-2">
            <span className="w-7 shrink-0 py-0.5 text-right font-mono text-[11px] text-slate-400">{u}</span>
            <div
              className={`my-px min-h-6 flex-1 px-2 py-0.5 text-xs ${
                d ? `bg-teal-50 text-teal-900 ${top ? 'rounded-t border-t border-teal-200' : ''} ${u === d.rackStart ? 'rounded-b' : ''} border-x border-teal-200` : 'bg-slate-100'
              }`}
            >
              {d && top ? (
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-semibold">
                    <StatusDot online={d.online} />
                    {d.name}
                  </span>
                  <span className="font-mono text-[11px] text-teal-800">{d.serial}</span>
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function RacksView({ inv }: { inv: Inventory }) {
  const { racks, devices } = inv.data;
  const [name, setName] = useState('');
  const [plant, setPlant] = useState(PLANTS[0]);
  const [units, setUnits] = useState('42');
  const [error, setError] = useState('');

  const add = () => {
    const message = inv.addRack(name, plant, Number(units));
    setError(message);
    if (!message) setName('');
  };

  const remove = (r: Rack) => {
    if (!window.confirm(`Delete ${r.name}?`)) return;
    setError(inv.deleteRack(r.id));
  };

  return (
    <div>
      <PageTitle title="Racks" subtitle="See which devices sit in each rack. Unit 1 is at the bottom." />

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_8rem_auto]">
          <Field label="New rack name">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rack C" />
          </Field>
          <Field label="Plant">
            <select className={inputCls} value={plant} onChange={(e) => setPlant(e.target.value)}>
              {PLANTS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Units">
            <input className={inputCls} type="number" min={1} max={60} value={units} onChange={(e) => setUnits(e.target.value)} />
          </Field>
          <button type="button" className={btnPrimary} onClick={add}>
            <Plus size={16} /> Add rack
          </button>
        </div>
        {error ? (
          <div className="mt-3">
            <ErrorText message={error} />
          </div>
        ) : null}
      </div>

      {racks.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <Empty text="No racks yet." />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {racks.map((r) => {
            const inRack = devices.filter((d) => d.rack === r.id);
            const used = inRack.reduce((sum, d) => sum + d.rackUnits, 0);
            return (
              <Panel
                key={r.id}
                title={`${r.name} · ${r.plant}`}
                action={
                  <span className="flex items-center gap-3 text-xs text-slate-500">
                    {used} of {r.units} units used
                    <button type="button" className={iconBtn} onClick={() => remove(r)} aria-label={`Delete ${r.name}`}>
                      <Trash2 size={16} />
                    </button>
                  </span>
                }
              >
                <RackDiagram rack={r} devices={inRack} />
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
