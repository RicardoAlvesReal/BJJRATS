import { Router } from 'express';
import { eq, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { challenges, users } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { requireFeature } from '../middleware/features.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const isModOrSuper = req.userRole === 'superadmin' || (req as any).isCommunityModerator;
  const { academyId } = req.query as Record<string, string>;

  // Professor: só vê desafios da própria academia
  if (!isModOrSuper) {
    const scopeId = academyId || req.userId!;
    const rows = await db.select().from(challenges).where(eq(challenges.academyId, scopeId)).orderBy(desc(challenges.createdAt));
    res.json(rows); return;
  }

  // Superadmin/moderador: com filtro opcional
  const rows = academyId
    ? await db.select().from(challenges).where(eq(challenges.academyId, academyId)).orderBy(desc(challenges.createdAt))
    : await db.select().from(challenges).orderBy(desc(challenges.createdAt));
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const [row] = await db.select().from(challenges).where(eq(challenges.id, req.params.id)).limit(1);
  if (!row) { res.status(404).json({ error: 'Desafio não encontrado' }); return; }
  res.json(row);
});

router.post('/', requireAuth, requireFeature('challenges'), async (req: AuthRequest, res) => {
  const isModOrSuper = req.userRole === 'superadmin' || (req as any).isCommunityModerator;

  // Apenas professor, academy, superadmin e moderadores podem criar desafios
  if (!isModOrSuper && req.userRole !== 'professor' && req.userRole !== 'admin' && req.userRole !== 'academy') {
    res.status(403).json({ error: 'Apenas professores podem criar desafios' }); return;
  }

  // Professor/academy: academyId é sempre o próprio uid — impede desafios globais
  const bodyAcademyId = isModOrSuper ? req.body.academyId : req.userId;
  const id = nanoid();
  const [row] = await db.insert(challenges).values({ id, creatorUid: req.userId!, ...req.body, academyId: bodyAcademyId }).returning();
  res.status(201).json(row);
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({
    creatorUid: challenges.creatorUid,
    academyId: challenges.academyId,
    target: challenges.target,
    title: challenges.title,
    participants: challenges.participants,
  }).from(challenges).where(eq(challenges.id, req.params.id)).limit(1);
  if (!existing) { res.status(404).json({ error: 'Desafio não encontrado' }); return; }
  const { id: _id, creatorUid: _cu, ...data } = req.body;

  // Qualquer usuário pode participar/sair do desafio (atualizar apenas participants)
  const onlyParticipants = Object.keys(data).length === 1 && 'participants' in data;
  if (!onlyParticipants) {
    const isModOrSuper = req.userRole === 'superadmin' || (req as any).isCommunityModerator;
    const isAcademyOwner = (req.userRole === 'academy' || req.userRole === 'admin') && existing.academyId === req.userId;
    if (!isModOrSuper && !isAcademyOwner && existing.creatorUid !== req.userId) {
      res.status(403).json({ error: 'Proibido' });
      return;
    }
  }

  const [row] = await db.update(challenges).set(data).where(eq(challenges.id, req.params.id)).returning();

  // Verifica se algum participante completou o desafio e premia com XP
  if (data.participants && existing.target > 0) {
    const prevParticipants: any[] = Array.isArray(existing.participants) ? existing.participants : [];
    const newParticipants: any[] = Array.isArray(data.participants) ? data.participants : [];
    for (const p of newParticipants) {
      const prev = prevParticipants.find((pp: any) => pp.uid === p.uid);
      const prevProgress = prev?.progress ?? 0;
      if (p.progress >= existing.target && prevProgress < existing.target) {
        // Completou! +30 XP
        const challengeXp = 30;
        await db.update(users).set({
          xp: sql`COALESCE(xp, 0) + ${challengeXp}`,
        }).where(eq(users.uid, p.uid));
        console.log(`[challenges] XP concedido: +${challengeXp} para ${p.uid} (desafio "${existing.title}")`);
      }
    }
  }

  res.json(row);
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ creatorUid: challenges.creatorUid, academyId: challenges.academyId }).from(challenges).where(eq(challenges.id, req.params.id)).limit(1);
  if (!existing) { res.status(404).json({ error: 'Desafio não encontrado' }); return; }
  const isModOrSuper = req.userRole === 'superadmin' || (req as any).isCommunityModerator;
  const isAcademyOwner = (req.userRole === 'academy' || req.userRole === 'admin') && existing.academyId === req.userId;
  if (!isModOrSuper && !isAcademyOwner && existing.creatorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  await db.delete(challenges).where(eq(challenges.id, req.params.id));
  res.json({ success: true });
});

export default router;
