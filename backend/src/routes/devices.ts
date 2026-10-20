import { Router } from 'express';
import { getInventory, saveInventory, uid, withLog } from '../data/store.js';
import type { DeviceDraft } from '../types/inventory.js';
import { nextNumber, normalizeDraft, validateDevice } from '../utils/inventoryRules.js';

const router = Router();

// GET all devices
router.get('/', (_req, res) => {
  const inv = getInventory();
  res.json({ success: true, data: inv.devices });
});

// POST add a new device
router.post('/', async (req, res) => {
  try {
    const input: DeviceDraft = req.body;
    const draft = normalizeDraft(input);
    const cur = getInventory();
    const error = validateDevice(draft, cur.devices, cur.racks);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const newDevice = { ...draft, id: uid('d'), no: nextNumber(cur.devices) };
    const next = withLog(
      { ...cur, devices: [...cur.devices, newDevice] },
      `Added device ${draft.name} (${draft.serial})`,
    );

    await saveInventory(next);
    res.status(201).json({ success: true, data: newDevice });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to add device' });
  }
});

// PUT update an existing device
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const input: DeviceDraft = req.body;
    const draft = normalizeDraft(input);
    const cur = getInventory();

    const old = cur.devices.find((d) => d.id === id);
    if (!old) {
      return res.status(404).json({ success: false, message: 'This device no longer exists.' });
    }

    const error = validateDevice(draft, cur.devices, cur.racks, id);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const updatedDevice = { ...old, ...draft };
    const next = withLog(
      {
        ...cur,
        devices: cur.devices.map((x) => (x.id === id ? updatedDevice : x)),
        workOrders:
          old.serial === draft.serial
            ? cur.workOrders
            : cur.workOrders.map((w) => (w.deviceSerial === old.serial ? { ...w, deviceSerial: draft.serial } : w)),
      },
      `Updated device ${draft.name} (${draft.serial})`,
    );

    await saveInventory(next);
    res.json({ success: true, data: updatedDevice });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to update device' });
  }
});

// DELETE a device
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cur = getInventory();
    const old = cur.devices.find((d) => d.id === id);
    if (!old) {
      return res.status(404).json({ success: false, message: 'Device not found.' });
    }

    const next = withLog(
      { ...cur, devices: cur.devices.filter((x) => x.id !== id) },
      `Deleted device ${old.name} (${old.serial})`,
    );

    await saveInventory(next);
    res.json({ success: true, message: `Deleted device ${old.name}` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to delete device' });
  }
});

// POST import multiple devices (from CSV)
router.post('/import', async (req, res) => {
  try {
    const drafts: DeviceDraft[] = req.body?.drafts || [];
    if (!Array.isArray(drafts) || drafts.length === 0) {
      return res.status(400).json({ success: false, message: 'No devices provided to import.' });
    }

    const cur = getInventory();
    let no = nextNumber(cur.devices);
    const added = drafts.map((x) => ({ ...x, id: uid('d'), no: no++ }));

    const next = withLog(
      { ...cur, devices: [...cur.devices, ...added] },
      `Imported ${added.length} devices from CSV`,
    );

    await saveInventory(next);
    res.status(201).json({ success: true, count: added.length, data: added });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to import devices' });
  }
});

export default router;
