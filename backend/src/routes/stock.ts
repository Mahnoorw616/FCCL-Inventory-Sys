import { Router } from 'express';
import { getInventory, saveInventory, uid, withLog } from '../data/store.js';
import type { StockDraft } from '../types/inventory.js';
import { nextNumber } from '../utils/inventoryRules.js';

const router = Router();

function stockProblem(d: StockDraft): string {
  if (!d.name || !d.name.trim()) return 'Enter the item name.';
  if (!Number.isInteger(d.quantity) || d.quantity < 0) return 'Quantity must be a whole number, 0 or more.';
  if (!Number.isInteger(d.minimum) || d.minimum < 0) return 'Minimum must be a whole number, 0 or more.';
  return '';
}

// GET all stock items
router.get('/', (_req, res) => {
  const inv = getInventory();
  res.json({ success: true, data: inv.stock });
});

// POST add new stock item
router.post('/', async (req, res) => {
  try {
    const input: StockDraft = req.body;
    const error = stockProblem(input);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const cur = getInventory();
    const cleanItem = {
      ...input,
      name: input.name.trim(),
      category: (input.category || '').trim(),
      location: (input.location || '').trim(),
      id: uid('s'),
      no: nextNumber(cur.stock),
    };

    const next = withLog(
      { ...cur, stock: [...cur.stock, cleanItem] },
      `Added stock item ${cleanItem.name}`,
    );

    await saveInventory(next);
    res.status(201).json({ success: true, data: cleanItem });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to add stock item' });
  }
});

// PUT update stock item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const input: StockDraft = req.body;
    const error = stockProblem(input);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const cur = getInventory();
    const old = cur.stock.find((s) => s.id === id);
    if (!old) {
      return res.status(404).json({ success: false, message: 'Stock item not found.' });
    }

    const updated = {
      ...old,
      ...input,
      name: input.name.trim(),
      category: (input.category || '').trim(),
      location: (input.location || '').trim(),
    };

    const next = withLog(
      { ...cur, stock: cur.stock.map((s) => (s.id === id ? updated : s)) },
      `Updated stock item ${updated.name}`,
    );

    await saveInventory(next);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to update stock item' });
  }
});

// PATCH change stock quantity by delta (increment/decrement)
router.patch('/:id/change', async (req, res) => {
  try {
    const { id } = req.params;
    const { change } = req.body as { change: number };
    const cur = getInventory();
    const old = cur.stock.find((s) => s.id === id);

    if (!old) {
      return res.status(404).json({ success: false, message: 'Stock item not found.' });
    }

    const quantity = Math.max(0, old.quantity + change);
    if (quantity === old.quantity) {
      return res.json({ success: true, data: old });
    }

    const updated = { ...old, quantity };
    const next = withLog(
      { ...cur, stock: cur.stock.map((s) => (s.id === id ? updated : s)) },
      `${old.name}: stock ${old.quantity} → ${quantity}`,
    );

    await saveInventory(next);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to adjust stock' });
  }
});

// DELETE stock item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cur = getInventory();
    const old = cur.stock.find((s) => s.id === id);

    if (!old) {
      return res.status(404).json({ success: false, message: 'Stock item not found.' });
    }

    const next = withLog(
      { ...cur, stock: cur.stock.filter((s) => s.id !== id) },
      `Deleted stock item ${old.name}`,
    );

    await saveInventory(next);
    res.json({ success: true, message: `Deleted stock item ${old.name}` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to delete stock item' });
  }
});

export default router;
