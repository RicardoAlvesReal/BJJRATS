import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { competitions } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { requireFeature } from '../middleware/features.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const uid = (req.query.uid as string) || req.userId!;
  const rows = await db.select().from(competitions).where(eq(competitions.uid, uid)).orderBy(competitions.createdAt);
  res.json(rows);
});

router.post('/', requireAuth, requireFeature('competitions'), async (req: AuthRequest, res) => {
  const id = nanoid();
  const { name, date, location, category, weightClass, result, notes } = req.body;
  const [row] = await db.insert(competitions).values({
    id, uid: req.userId!, name, date, location, category,
    weight_class: weightClass, result, notes,
  }).returning();
  res.status(201).json(row);
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  await db.delete(competitions).where(eq(competitions.id, req.params.id));
  res.json({ success: true });
});

export default router;
