import { useState } from 'react';
import type { Inventory } from '../store/useInventory';
import { CATEGORIES, PLANTS, type Category, type Device, type DeviceDraft } from '../types/inventory';
import { nextNumber } from '../utils/inventoryRules';
import { btnOutline, btnPrimary, ErrorText, FormRow, FormSectionHeader, inputCls, Modal } from './ui';

interface Props {
  inv: Inventory;
  device: Device | null; // null = add a new device
  onClose: () => void;
}

export default function DeviceFormModal({ inv, device, onClose }: Props) {
  const { racks, devices } = inv.data;
  const assignedNo = device?.no ?? nextNumber(devices);

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
  const [saving, setSaving] = useState(false);

  const plantOptions = PLANTS.includes(plant) ? PLANTS : [...PLANTS, plant];

  const save = async () => {
    setSaving(true);
    setError('');
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
    <Modal
      title={device ? `Edit Device #${device.no}` : 'Register New Device'}
      subtitle={`Assigned Number: Device #${assignedNo}`}
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

        {/* Device Number (Read-only) */}
        <FormRow label="Device Number" hint="Auto-incremented running index">
          <input
            className={`${inputCls} bg-slate-50 font-mono text-slate-500 cursor-not-allowed`}
            value={`Device #${assignedNo}`}
            disabled
            readOnly
          />
        </FormRow>

        {/* Serial Number (Primary ID) */}
        <FormRow label="Serial Number (Primary ID)" required hint="Unique hardware serial key">
          <input
            className={`${inputCls} font-mono`}
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            placeholder="e.g. SN-839528"
            autoFocus={!device}
            required
          />
        </FormRow>

        {/* Device Name */}
        <FormRow label="Device Name" required hint="Common friendly name">
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Main file server"
            required
          />
        </FormRow>

        {/* Equipment Category */}
        <FormRow label="Equipment Category">
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FormRow>

        {/* Model Name */}
        <FormRow label="Model Name">
          <input
            className={inputCls}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. Dell PowerEdge R650"
          />
        </FormRow>

        {/* Plant Location */}
        <FormRow label="Plant Location">
          <select className={inputCls} value={plant} onChange={(e) => setPlant(e.target.value)}>
            {plantOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </FormRow>

        {/* Used by / Custody */}
        <FormRow label="Used by / Custody" hint="Custodian person or department">
          <input
            className={inputCls}
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="Person or department (e.g. IT Department)"
          />
        </FormRow>

        {/* Status */}
        <FormRow label="Status">
          <select
            className={inputCls}
            value={online ? 'online' : 'offline'}
            onChange={(e) => setOnline(e.target.value === 'online')}
          >
            <option value="online">Online (green)</option>
            <option value="offline">Offline (orange)</option>
          </select>
        </FormRow>

        {/* Warranty Ends */}
        <FormRow label="Warranty ends">
          <input
            className={inputCls}
            type="date"
            value={warrantyEnd}
            onChange={(e) => setWarrantyEnd(e.target.value)}
          />
        </FormRow>

        {/* Rack Mounting (Optional) Section */}
        <FormSectionHeader title="Rack Mounting (Optional)" description="Cabinet placement if installed in a server rack" />

        <FormRow label="Rack Cabinet">
          <select className={inputCls} value={rack} onChange={(e) => setRack(e.target.value)}>
            <option value="">None (Standalone)</option>
            {racks.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.plant} - {r.units}U)
              </option>
            ))}
          </select>
        </FormRow>

        {rack ? (
          <>
            <FormRow label="Start U Position" hint="Lowest rack unit (1 is at bottom)">
              <input
                className={inputCls}
                type="number"
                min={1}
                value={rackStart}
                onChange={(e) => setRackStart(e.target.value)}
              />
            </FormRow>
            <FormRow label="Height (U)" hint="Unit height occupied in rack">
              <input
                className={inputCls}
                type="number"
                min={1}
                value={rackUnits}
                onChange={(e) => setRackUnits(e.target.value)}
              />
            </FormRow>
          </>
        ) : null}

        {/* Notes */}
        <FormRow label="Notes">
          <textarea
            className={inputCls}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional specifications, IP addresses, maintenance history..."
          />
        </FormRow>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" className={btnOutline} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Saving...' : device ? 'Save Changes' : 'Register Device'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
