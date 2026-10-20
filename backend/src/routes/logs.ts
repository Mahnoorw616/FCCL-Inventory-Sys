import { Router, type Request, type Response } from 'express';
import { getInventory } from '../data/store.js';

const router = Router();

// GET all activity logs
router.get('/', (_req: Request, res: Response) => {
  const inv = getInventory();
  res.json({ success: true, data: inv.log });
});

export default router;
