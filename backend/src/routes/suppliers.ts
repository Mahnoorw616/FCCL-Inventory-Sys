import { Router, type Request, type Response } from 'express';
import { getInventory, saveInventory, uid, withLog } from '../data/store.js';
import type { SupplierDraft } from '../types/inventory.js';

const router = Router();

// GET all suppliers
router.get('/', (_req: Request, res: Response) => {
  const inv = getInventory();
  res.json({ success: true, data: inv.suppliers });
});

// POST add supplier
router.post('/', async (req: Request, res: Response) => {
  try {
    const input: SupplierDraft = req.body;
    const name = input.name?.trim();
    if (!name) {
      return res.status(400).json({ success: false, message: 'Enter the supplier name.' });
    }

    const clean = {
      name,
      contact: (input.contact || '').trim(),
      phone: (input.phone || '').trim(),
      email: (input.email || '').trim(),
      supplies: (input.supplies || '').trim(),
      id: uid('p'),
    };

    const cur = getInventory();
    const next = withLog(
      { ...cur, suppliers: [...cur.suppliers, clean] },
      `Added supplier ${name}`,
    );

    await saveInventory(next);
    res.status(201).json({ success: true, data: clean });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to add supplier' });
  }
});

// PUT update supplier
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const input: SupplierDraft = req.body;
    const name = input.name?.trim();
    if (!name) {
      return res.status(400).json({ success: false, message: 'Enter the supplier name.' });
    }

    const cur = getInventory();
    const old = cur.suppliers.find((s) => s.id === id);
    if (!old) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    const clean = {
      id,
      name,
      contact: (input.contact || '').trim(),
      phone: (input.phone || '').trim(),
      email: (input.email || '').trim(),
      supplies: (input.supplies || '').trim(),
    };

    const next = withLog(
      { ...cur, suppliers: cur.suppliers.map((s) => (s.id === id ? clean : s)) },
      `Updated supplier ${name}`,
    );

    await saveInventory(next);
    res.json({ success: true, data: clean });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to update supplier' });
  }
});

// DELETE supplier
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cur = getInventory();
    const old = cur.suppliers.find((s) => s.id === id);
    if (!old) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    if (cur.stock.some((s) => s.supplierId === id)) {
      return res.status(400).json({
        success: false,
        message: 'Some stock items use this supplier. Change them first.',
      });
    }

    const next = withLog(
      { ...cur, suppliers: cur.suppliers.filter((s) => s.id !== id) },
      `Deleted supplier ${old.name}`,
    );

    await saveInventory(next);
    res.json({ success: true, message: `Deleted supplier ${old.name}` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to delete supplier' });
  }
});

export default router;
