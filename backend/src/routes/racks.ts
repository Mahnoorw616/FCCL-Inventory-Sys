import { Router } from 'express';
import { getInventory, saveInventory, uid, withLog } from '../data/store.js';

const router = Router();

// GET all racks
router.get('/', (_req, res) => {
  const inv = getInventory();
  res.json({ success: true, data: inv.racks });
});

// POST add rack
router.post('/', async (req, res) => {
  try {
    const { name, plant, units } = req.body;
    const clean = (name || '').trim();
    if (!clean) {
      return res.status(400).json({ success: false, message: 'Enter the rack name.' });
    }

    const unitsNum = Number(units);
    if (!Number.isInteger(unitsNum) || unitsNum < 1 || unitsNum > 60) {
      return res.status(400).json({
        success: false,
        message: 'Rack size must be a whole number from 1 to 60.',
      });
    }

    const cur = getInventory();
    if (cur.racks.some((r) => r.name.toLowerCase() === clean.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'A rack with this name already exists.',
      });
    }

    const newRack = {
      id: uid('r'),
      name: clean,
      plant: (plant || 'Main Plant').trim(),
      units: unitsNum,
    };

    const next = withLog(
      { ...cur, racks: [...cur.racks, newRack] },
      `Added rack ${clean}`,
    );

    await saveInventory(next);
    res.status(201).json({ success: true, data: newRack });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to add rack' });
  }
});

// DELETE rack
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cur = getInventory();
    const old = cur.racks.find((r) => r.id === id);
    if (!old) {
      return res.status(404).json({ success: false, message: 'Rack not found.' });
    }

    if (cur.devices.some((x) => x.rack === id)) {
      return res.status(400).json({
        success: false,
        message: 'Remove the devices from this rack first.',
      });
    }

    const next = withLog(
      { ...cur, racks: cur.racks.filter((r) => r.id !== id) },
      `Deleted rack ${old.name}`,
    );

    await saveInventory(next);
    res.json({ success: true, message: `Deleted rack ${old.name}` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to delete rack' });
  }
});

export default router;
