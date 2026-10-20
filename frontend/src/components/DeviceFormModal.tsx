import { useState } from 'react';
import type { Inventory } from '../store/useInventory';
import { CATEGORIES, PLANTS, type Category, type Device, type DeviceDraft } from '../types/inventory';
import { btnOutline, btnPrimary, ErrorText, Field, inputCls, Modal } from './ui';

interface Props {
  inv: Inventory;
  device: Device | null; // null = add a new device
  onClose: () => void;
}

export default function DeviceFormModal({ inv, device, onClose }: Props) {
  const { racks } = inv.data;
  const [serial, setSerial] = useState(device?.serial ?? '');
  const [name, setName] = useState(device?.name ?? '');
  const [category, setCategory] = useState<Category>(device?.category ?? 'Laptop');
  const [model, setModel] = useState(device?.model ?? '');
  const [plant, setPlant] = useState(device?.plant ?? PLANTS[0]);
  const [assignedTo, setAssignedTo] = useState(device?.assignedTo ?? '');
  const [online, setOnline] = useState(device?.online ?? true);
  const [warrantyEnd, setWarrantyEnd] = useState(device?.warrantyEnd ?? '');
  const [rack, setRack] = useState(device?.rack ?? '');
  const [rackStart, setRackStart] = useState(String(device?.rackStart || 1));
  const [rackUnits, setRackUnits] = useState(String(device?.rackUnits || 1));
  const [notes, setNotes] = useState(device?.notes ?? '');
  const [error, setError] = useState('');

  const plantOptions = PLANTS.includes(plant) ? PLANTS : [...PLANTS, plant];

  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const draft: DeviceDraft = {
      serial,
      name,
      category,
      model,
      plant,
      assignedTo,
      online,
      warrantyEnd,
      rack,
      rackStart: Number(rackStart),
      rackUnits: Number(rackUnits),
      notes,
    };
    try {
      const message = await (device ? inv.updateDevice(device.id, draft) : inv.addDevice(draft));
      if (message) {
        setError(message);
        setSaving(false);
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save device');
      setSaving(false);
    }
  };

  return (
    <Modal title={device ? `Edit device #${device.no}` : 'Add device'} onClose={onClose} wide>
      <div className="space-y-4">
        <ErrorText message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Serial number" hint={device ? undefined : 'Each device is identified by its serial number.'}>
            <input className={`${inputCls} font-mono`} value={serial} onChange={(e) => setSerial(e.target.value)} autoFocus />
          </Field>
          <Field label="Device name">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Type">
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Model">
            <input className={inputCls} value={model} onChange={(e) => setModel(e.target.value)} />
          </Field>
          <Field label="Plant">
            <select className={inputCls} value={plant} onChange={(e) => setPlant(e.target.value)}>
              {plantOptions.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Used by">
            <input className={inputCls} value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Person or department" />
          </Field>
          <Field label="Status">
            <select className={inputCls} value={online ? 'online' : 'offline'} onChange={(e) => setOnline(e.target.value === 'online')}>
              <option value="online">Online (green)</option>
              <option value="offline">Offline (orange)</option>
            </select>
          </Field>
          <Field label="Warranty ends">
            <input className={inputCls} type="date" value={warrantyEnd} onChange={(e) => setWarrantyEnd(e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Rack">
            <select className={inputCls} value={rack} onChange={(e) => setRack(e.target.value)}>
              <option value="">Not in a rack</option>
              {racks.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.plant})
                </option>
              ))}
            </select>
          </Field>
          {rack ? (
            <>
              <Field label="Starting unit" hint="Unit 1 is at the bottom.">
                <input className={inputCls} type="number" min={1} value={rackStart} onChange={(e) => setRackStart(e.target.value)} />
              </Field>
              <Field label="Height (units)">
                <input className={inputCls} type="number" min={1} value={rackUnits} onChange={(e) => setRackUnits(e.target.value)} />
              </Field>
            </>
          ) : null}
        </div>

        <Field label="Notes">
          <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <div className="flex justify-end gap-2">
          <button type="button" className={btnOutline} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} onClick={save} disabled={saving}>
            {saving ? 'Saving...' : device ? 'Save changes' : 'Add device'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
