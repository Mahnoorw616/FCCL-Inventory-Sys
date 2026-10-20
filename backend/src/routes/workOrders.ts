import { Router } from 'express';
import { getInventory, saveInventory, uid, withLog } from '../data/store.js';
import type { Priority, WorkOrderDraft, WorkStatus } from '../types/inventory.js';
import { nextNumber } from '../utils/inventoryRules.js';

const router = Router();

// GET all work orders
router.get('/', (_req, res) => {
  const inv = getInventory();
  res.json({ success: true, data: inv.workOrders });
});

// POST add work order
router.post('/', async (req, res) => {
  try {
    const input: WorkOrderDraft = req.body;
    const title = input.title?.trim();
    if (!title) {
      return res.status(400).json({ success: false, message: 'Enter what needs to be done.' });
    }

    const cur = getInventory();
    const newWorkOrder = {
      id: uid('w'),
      no: nextNumber(cur.workOrders),
      title,
      deviceSerial: input.deviceSerial || '',
      priority: input.priority || ('Medium' as Priority),
      status: 'Open' as WorkStatus,
      assignee: (input.assignee || 'IT team').trim(),
      notes: (input.notes || '').trim(),
      createdAt: new Date().toISOString(),
    };

    const next = withLog(
      { ...cur, workOrders: [...cur.workOrders, newWorkOrder] },
      `Created work order: ${title}`,
    );

    await saveInventory(next);
    res.status(201).json({ success: true, data: newWorkOrder });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to create work order' });
  }
});

// PATCH update status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: WorkStatus };
    const cur = getInventory();
    const old = cur.workOrders.find((w) => w.id === id);

    if (!old) {
      return res.status(404).json({ success: false, message: 'Work order not found.' });
    }

    if (old.status === status) {
      return res.json({ success: true, data: old });
    }

    const updated = { ...old, status };
    const next = withLog(
      {
        ...cur,
        workOrders: cur.workOrders.map((w) => (w.id === id ? updated : w)),
      },
      `Work order #${old.no} is now ${status.toLowerCase()}`,
    );

    await saveInventory(next);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to update work order status' });
  }
});

// PATCH update priority
router.patch('/:id/priority', async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body as { priority: Priority };
    const cur = getInventory();
    const old = cur.workOrders.find((w) => w.id === id);

    if (!old) {
      return res.status(404).json({ success: false, message: 'Work order not found.' });
    }

    const updated = { ...old, priority };
    const next = {
      ...cur,
      workOrders: cur.workOrders.map((w) => (w.id === id ? updated : w)),
    };

    await saveInventory(next);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to update priority' });
  }
});

// DELETE work order
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cur = getInventory();
    const old = cur.workOrders.find((w) => w.id === id);

    if (!old) {
      return res.status(404).json({ success: false, message: 'Work order not found.' });
    }

    const next = withLog(
      { ...cur, workOrders: cur.workOrders.filter((w) => w.id !== id) },
      `Deleted work order #${old.no}`,
    );

    await saveInventory(next);
    res.json({ success: true, message: `Deleted work order #${old.no}` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to delete work order' });
  }
});

export default router;
