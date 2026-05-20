import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { extraTrainings } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const uid = (req.query.uid as string) || req.userId!;
  const rows = await db.select().from(extraTrainings)
    .where(eq(extraTrainings.uid, uid))
    .orderBy(desc(extraTrainings.trainingDate));
  res.json(rows);
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const [row] = await db.insert(extraTrainings).values({ id, uid: req.userId!, ...req.body }).returning();
  res.status(201).json(row);
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ uid: extraTrainings.uid }).from(extraTrainings).where(eq(extraTrainings.id, req.params.id)).limit(1);
  if (!existing || existing.uid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  const { id: _id, uid: _uid, ...data } = req.body;
  const [row] = await db.update(extraTrainings).set(data).where(eq(extraTrainings.id, req.params.id)).returning();
  res.json(row);
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ uid: extraTrainings.uid }).from(extraTrainings).where(eq(extraTrainings.id, req.params.id)).limit(1);
  if (!existing || existing.uid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  await db.delete(extraTrainings).where(eq(extraTrainings.id, req.params.id));
  res.json({ success: true });
});

export default router;
