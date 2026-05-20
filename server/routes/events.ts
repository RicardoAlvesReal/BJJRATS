import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { events } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { academyId } = req.query as Record<string, string>;
  const rows = academyId
    ? await db.select().from(events).where(eq(events.academyId, academyId)).orderBy(desc(events.eventDate))
    : await db.select().from(events).orderBy(desc(events.eventDate));
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const [row] = await db.select().from(events).where(eq(events.id, req.params.id)).limit(1);
  if (!row) { res.status(404).json({ error: 'Evento não encontrado' }); return; }
  res.json(row);
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const [row] = await db.insert(events).values({ id, creatorUid: req.userId!, ...req.body }).returning();
  res.status(201).json(row);
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ creatorUid: events.creatorUid }).from(events).where(eq(events.id, req.params.id)).limit(1);
  if (!existing || existing.creatorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  const { id: _id, creatorUid: _cu, ...data } = req.body;
  const [row] = await db.update(events).set(data).where(eq(events.id, req.params.id)).returning();
  res.json(row);
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ creatorUid: events.creatorUid }).from(events).where(eq(events.id, req.params.id)).limit(1);
  if (!existing || existing.creatorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  await db.delete(events).where(eq(events.id, req.params.id));
  res.json({ success: true });
});

export default router;
