import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { userAchievements } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const uid = (req.query.uid as string) || req.userId!;
  res.json(await db.select().from(userAchievements).where(eq(userAchievements.uid, uid)));
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const [row] = await db.insert(userAchievements).values({ id, uid: req.userId!, ...req.body }).returning();
  res.status(201).json(row);
});

export default router;
