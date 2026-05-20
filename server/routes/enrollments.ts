import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { enrollments } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { professorUid, studentUid } = req.query as Record<string, string>;
  const conditions = [];
  if (professorUid) conditions.push(eq(enrollments.professorUid, professorUid));
  if (studentUid)   conditions.push(eq(enrollments.studentUid, studentUid));
  const rows = conditions.length
    ? await db.select().from(enrollments).where(and(...conditions)).orderBy(desc(enrollments.createdAt))
    : await db.select().from(enrollments).orderBy(desc(enrollments.createdAt));
  res.json(rows);
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const [row] = await db.insert(enrollments).values({ id, ...req.body }).returning();
  res.status(201).json(row);
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ professorUid: enrollments.professorUid }).from(enrollments).where(eq(enrollments.id, req.params.id)).limit(1);
  if (!existing || existing.professorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  const { id: _id, ...data } = req.body;
  const [row] = await db.update(enrollments).set(data).where(eq(enrollments.id, req.params.id)).returning();
  res.json(row);
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ professorUid: enrollments.professorUid }).from(enrollments).where(eq(enrollments.id, req.params.id)).limit(1);
  if (!existing || existing.professorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  await db.delete(enrollments).where(eq(enrollments.id, req.params.id));
  res.json({ success: true });
});

export default router;
