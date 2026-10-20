import { Router } from 'express';
import { getInventory } from '../data/store.js';

const router = Router();

// GET all activity logs
router.get('/', (_req, res) => {
  const inv = getInventory();
  res.json({ success: true, data: inv.log });
});

export default router;
