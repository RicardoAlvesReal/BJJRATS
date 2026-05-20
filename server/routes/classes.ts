import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { classSchedules, classCheckIns } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// ─── Schedules ───────────────────────────────────────────────────────────────
router.get('/schedules', requireAuth, async (req: AuthRequest, res) => {
  const { academyId } = req.query as Record<string, string>;
  const rows = academyId
    ? await db.select().from(classSchedules).where(eq(classSchedules.academyId, academyId))
    : await db.select().from(classSchedules);
  res.json(rows);
});

router.post('/schedules', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const [row] = await db.insert(classSchedules).values({ id, professorUid: req.userId!, ...req.body }).returning();
  res.status(201).json(row);
});

router.patch('/schedules/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ professorUid: classSchedules.professorUid }).from(classSchedules).where(eq(classSchedules.id, req.params.id)).limit(1);
  if (!existing || existing.professorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  const { id: _id, professorUid: _pu, ...data } = req.body;
  const [row] = await db.update(classSchedules).set(data).where(eq(classSchedules.id, req.params.id)).returning();
  res.json(row);
});

router.delete('/schedules/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ professorUid: classSchedules.professorUid }).from(classSchedules).where(eq(classSchedules.id, req.params.id)).limit(1);
  if (!existing || existing.professorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  await db.delete(classSchedules).where(eq(classSchedules.id, req.params.id));
  res.json({ success: true });
});

// ─── Check-ins ───────────────────────────────────────────────────────────────
router.get('/check-ins', requireAuth, async (req: AuthRequest, res) => {
  const { academyId, studentUid } = req.query as Record<string, string>;
  const rows = academyId
    ? await db.select().from(classCheckIns).where(eq(classCheckIns.academyId, academyId)).orderBy(desc(classCheckIns.checkInDate))
    : await db.select().from(classCheckIns).where(eq(classCheckIns.studentUid, studentUid || req.userId!)).orderBy(desc(classCheckIns.checkInDate));
  res.json(rows);
});

router.post('/check-ins', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const [row] = await db.insert(classCheckIns).values({ id, studentUid: req.userId!, ...req.body }).returning();
  res.status(201).json(row);
});

export default router;
