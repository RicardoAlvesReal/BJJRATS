import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { payments } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { professorUid, studentUid } = req.query as Record<string, string>;
  const conditions = [];
  if (professorUid) conditions.push(eq(payments.professorUid, professorUid));
  if (studentUid)   conditions.push(eq(payments.studentUid, studentUid));
  const rows = conditions.length
    ? await db.select().from(payments).where(and(...conditions)).orderBy(desc(payments.dueDate))
    : await db.select().from(payments).where(eq(payments.professorUid, req.userId!)).orderBy(desc(payments.dueDate));
  res.json(rows);
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const [row] = await db.insert(payments).values({ id, ...req.body }).returning();
  res.status(201).json(row);
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ professorUid: payments.professorUid }).from(payments).where(eq(payments.id, req.params.id)).limit(1);
  if (!existing || existing.professorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  const { id: _id, ...data } = req.body;
  const [row] = await db.update(payments).set(data).where(eq(payments.id, req.params.id)).returning();
  res.json(row);
});

export default router;
