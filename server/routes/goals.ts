import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { goals } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const uid = (req.query.uid as string) || req.userId!;
  res.json(await db.select().from(goals).where(eq(goals.uid, uid)));
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const [row] = await db.insert(goals).values({ id, uid: req.userId!, ...req.body }).returning();
  res.status(201).json(row);
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ uid: goals.uid }).from(goals).where(eq(goals.id, req.params.id)).limit(1);
  if (!existing || existing.uid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  const { id: _id, uid: _uid, ...data } = req.body;
  const [row] = await db.update(goals).set(data).where(eq(goals.id, req.params.id)).returning();
  res.json(row);
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ uid: goals.uid }).from(goals).where(eq(goals.id, req.params.id)).limit(1);
  if (!existing || existing.uid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  await db.delete(goals).where(eq(goals.id, req.params.id));
  res.json({ success: true });
});

export default router;
