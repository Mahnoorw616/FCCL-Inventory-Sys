import { Router, type Request, type Response } from 'express';
import { getInventory, resetInventory } from '../data/store.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const data = getInventory();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to fetch inventory' });
  }
});

router.post('/reset', async (_req: Request, res: Response) => {
  try {
    const data = await resetInventory();
    res.json({ success: true, data, message: 'Sample inventory data restored successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to reset inventory' });
  }
});

export default router;
