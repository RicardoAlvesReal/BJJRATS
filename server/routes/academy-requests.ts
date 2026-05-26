import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { academyRequests, enrollments } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { professorUid, studentUid } = req.query as Record<string, string>;
  const conditions = [];
  if (professorUid) conditions.push(eq(academyRequests.professorUid, professorUid));
  if (studentUid)   conditions.push(eq(academyRequests.studentUid, studentUid));
  const rows = conditions.length
    ? await db.select().from(academyRequests).where(and(...conditions)).orderBy(desc(academyRequests.createdAt))
    : await db.select().from(academyRequests).orderBy(desc(academyRequests.createdAt));
  res.json(rows);
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const body = req.body as {
    professorUid: string; professorName?: string; academyName?: string;
    studentName?: string; studentEmail?: string; studentPhoto?: string; studentBelt?: string;
  };

  const [row] = await db.insert(academyRequests).values({
    id, studentUid: req.userId!, status: 'accepted',
    ...body,
  }).returning();

  // Cria matrícula automaticamente
  const enrollmentId = nanoid();
  await db.insert(enrollments).values({
    id: enrollmentId,
    professorUid: body.professorUid,
    professorName: body.professorName ?? null,
    academyName: body.academyName ?? null,
    studentUid: req.userId!,
    studentName: body.studentName ?? null,
    status: 'active',
  });

  res.status(201).json(row);
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ professorUid: academyRequests.professorUid, studentUid: academyRequests.studentUid })
    .from(academyRequests).where(eq(academyRequests.id, req.params.id)).limit(1);
  if (!existing || (existing.professorUid !== req.userId && existing.studentUid !== req.userId)) {
    res.status(403).json({ error: 'Proibido' }); return;
  }
  const { id: _id, ...data } = req.body;
  const [row] = await db.update(academyRequests).set(data).where(eq(academyRequests.id, req.params.id)).returning();
  res.json(row);
});

export default router;
