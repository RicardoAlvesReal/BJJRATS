import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { trainings, users } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { requireFeature } from '../middleware/features.js';

const router = Router();

// GET /api/trainings?uid=...
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const uid = (req.query.uid as string) || req.userId!;
  const rows = await db.select().from(trainings)
    .where(eq(trainings.uid, uid))
    .orderBy(desc(trainings.trainingDate));
  res.json(rows);
});

// GET /api/trainings/:id
router.get('/:id', requireAuth, async (req, res) => {
  const [row] = await db.select().from(trainings).where(eq(trainings.id, req.params.id)).limit(1);
  if (!row) { res.status(404).json({ error: 'Treino não encontrado' }); return; }
  res.json(row);
});

// POST /api/trainings
router.post('/', requireAuth, requireFeature('training_tracking'), async (req: AuthRequest, res) => {
  const { uid, createdAt: _ca, updatedAt: _ua, ...rest } = req.body;
  const ownerUid = uid || req.userId!;
  const id = nanoid();
  const [row] = await db.insert(trainings).values({ id, uid: ownerUid, ...rest }).returning();

  // Atualiza estatísticas do usuário
  const duration = Number(rest.duration) || 0;
  const xpGained = Number(rest.xp) || 0;
  const today = rest.trainingDate as string | undefined;
  const [current] = await db.select({
    totalTrainings: users.totalTrainings,
    totalMinutes: users.totalMinutes,
    xp: users.xp,
    streak: users.streak,
    lastTrainingDate: users.lastTrainingDate,
  }).from(users).where(eq(users.uid, ownerUid)).limit(1);

  if (current) {
    const newStreak = calculateStreak(current.lastTrainingDate, today, current.streak ?? 0);
    await db.update(users).set({
      totalTrainings: (current.totalTrainings ?? 0) + 1,
      totalMinutes:   (current.totalMinutes ?? 0) + duration,
      xp:             (current.xp ?? 0) + xpGained,
      streak:         newStreak,
      lastTrainingDate: today ?? null,
    }).where(eq(users.uid, ownerUid));
  }

  res.status(201).json(row);
});

// PATCH /api/trainings/:id
router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ uid: trainings.uid }).from(trainings).where(eq(trainings.id, req.params.id)).limit(1);
  if (!existing) { res.status(404).json({ error: 'Não encontrado' }); return; }
  if (existing.uid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  const { id: _id, uid: _uid, createdAt: _ca, updatedAt: _ua, ...data } = req.body;
  const [row] = await db.update(trainings).set(data).where(eq(trainings.id, req.params.id)).returning();
  res.json(row);
});

// DELETE /api/trainings/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ uid: trainings.uid, duration: trainings.duration, xp: trainings.xp })
    .from(trainings).where(eq(trainings.id, req.params.id)).limit(1);
  if (!existing) { res.status(404).json({ error: 'Não encontrado' }); return; }
  if (existing.uid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  await db.delete(trainings).where(eq(trainings.id, req.params.id));

  // Reverte estatísticas
  const [current] = await db.select({ totalTrainings: users.totalTrainings, totalMinutes: users.totalMinutes, xp: users.xp })
    .from(users).where(eq(users.uid, req.userId!)).limit(1);
  if (current) {
    await db.update(users).set({
      totalTrainings: Math.max(0, (current.totalTrainings ?? 0) - 1),
      totalMinutes:   Math.max(0, (current.totalMinutes ?? 0) - (existing.duration ?? 0)),
      xp:             Math.max(0, (current.xp ?? 0) - (existing.xp ?? 0)),
    }).where(eq(users.uid, req.userId!));
  }
  res.json({ success: true });
});

function calculateStreak(lastDate: string | null, today: string | undefined, currentStreak: number): number {
  if (!today) return currentStreak;
  if (!lastDate) return 1;
  const last = new Date(lastDate);
  const curr = new Date(today);
  const diffDays = Math.round((curr.getTime() - last.getTime()) / 86400000);
  if (diffDays === 0) return currentStreak;
  if (diffDays === 1) return currentStreak + 1;
  return 1;
}

export default router;
