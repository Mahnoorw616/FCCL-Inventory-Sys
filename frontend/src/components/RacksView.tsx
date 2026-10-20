import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Inventory } from '../store/useInventory';
import { PLANTS, type Device, type Rack } from '../types/inventory';
import { btnOutline, btnPrimary, Empty, ErrorText, FormRow, iconBtn, inputCls, Modal, PageTitle, Panel, StatusDot } from './ui';

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

function AddRackModal({ inv, onClose }: { inv: Inventory; onClose: () => void }) {
  const [name, setName] = useState('');
  const [plant, setPlant] = useState(PLANTS[0]);
  const [units, setUnits] = useState('42');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const message = await inv.addRack(name, plant, Number(units));
      if (message) {
        setError(message);
        setSaving(false);
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to add rack');
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Register Rack Cabinet"
      subtitle="Define cabinet height and datacenter plant allocation"
      onClose={onClose}
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="space-y-3"
      >
        <ErrorText message={error} />

        <FormRow label="Rack Name" required hint="Identifier or label">
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rack C / Network Cabinet 1"
            autoFocus
            required
          />
        </FormRow>

        <FormRow label="Plant Location" hint="Facility where rack is stationed">
          <select className={inputCls} value={plant} onChange={(e) => setPlant(e.target.value)}>
            {PLANTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </FormRow>

        <FormRow label="Total Units (U)" required hint="Rack height in U (standard is 42U)">
          <input
            className={inputCls}
            type="number"
            min={1}
            max={60}
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            required
          />
        </FormRow>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" className={btnOutline} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Registering...' : 'Register Rack'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function RacksView({ inv }: { inv: Inventory }) {
  const { racks, devices } = inv.data;
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');

  const remove = async (r: Rack) => {
    if (!window.confirm(`Delete ${r.name}?`)) return;
    try {
      const err = await inv.deleteRack(r.id);
      setError(err);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete rack');
    }
  };

  return (
    <div>
      <PageTitle
        title="Racks"
        subtitle="See which devices sit in each rack. Unit 1 is at the bottom."
        actions={
          <button type="button" className={btnPrimary} onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Register Rack
          </button>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorText message={error} />
        </div>
      ) : null}

      {racks.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <Empty text="No racks registered yet. Click 'Register Rack' to add one." />
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
                    <span>
                      {used} / {r.units} U ({r.units - used} free)
                    </span>
                    <button
                      type="button"
                      className={iconBtn}
                      onClick={() => remove(r)}
                      aria-label={`Delete ${r.name}`}
                      title={inRack.length > 0 ? 'Empty the rack before deleting' : `Delete ${r.name}`}
                    >
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

      {showAdd && <AddRackModal inv={inv} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
