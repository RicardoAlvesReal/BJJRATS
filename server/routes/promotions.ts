import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { promotions, users } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { professorUid, studentUid } = req.query as Record<string, string>;
  const rows = professorUid
    ? await db.select().from(promotions).where(eq(promotions.professorUid, professorUid)).orderBy(desc(promotions.promotedAt))
    : studentUid
    ? await db.select().from(promotions).where(eq(promotions.studentUid, studentUid)).orderBy(desc(promotions.promotedAt))
    : await db.select().from(promotions).orderBy(desc(promotions.promotedAt));
  res.json(rows);
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const { studentUid, toBelt, toStripes, ...rest } = req.body as {
    studentUid: string; toBelt: string; toStripes: number; [k: string]: unknown;
  };
  const [row] = await db.insert(promotions).values({
    id, professorUid: req.userId!, studentUid, toBelt, toStripes, ...rest
  }).returning();

  // Aplica promoção no perfil do atleta
  await db.update(users).set({ belt: toBelt, stripes: toStripes }).where(eq(users.uid, studentUid));

  res.status(201).json(row);
});

export default router;
