import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { academyRequests, enrollments, notifications, users } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

function isOpenEnrollmentStatus(status?: string | null) {
  return status !== 'cancelled' && status !== 'rejected';
}

async function findOpenEnrollment(professorUid: string, studentUid: string) {
  const rows = await db.select().from(enrollments).where(and(
    eq(enrollments.professorUid, professorUid),
    eq(enrollments.studentUid, studentUid),
  ));
  return rows.find(row => isOpenEnrollmentStatus(row.status)) ?? null;
}

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
    id, studentUid: req.userId!, status: 'pending',
    ...body,
  }).returning();

  // Notifica o professor sobre a nova solicitação
  const notifId = nanoid();
  await db.insert(notifications).values({
    id: notifId,
    toUid: body.professorUid,
    fromUid: req.userId!,
    type: 'new_request',
    message: `${body.studentName || 'Aluno'} (${body.studentBelt || '—'}) quer se vincular à sua academia.`,
    read: false,
  });

  res.status(201).json(row);
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({
    professorUid: academyRequests.professorUid,
    studentUid: academyRequests.studentUid,
    studentName: academyRequests.studentName,
    academyName: academyRequests.academyName,
    status: academyRequests.status,
  })
    .from(academyRequests).where(eq(academyRequests.id, req.params.id)).limit(1);
  if (!existing) { res.status(404).json({ error: 'Não encontrado' }); return; }

  // Quem pode aprovar/rejeitar: o professor OU o admin da academia do professor
  const [prof] = await db.select({ academyId: users.academyId })
    .from(users).where(eq(users.uid, existing.professorUid)).limit(1);

  const canAct = existing.professorUid === req.userId
    || (prof?.academyId === req.userId);
  if (!canAct) {
    res.status(403).json({ error: 'Proibido' }); return;
  }
  const { id: _id, status: newStatus, ...data } = req.body;

  if (newStatus === 'accepted') {
    await db.update(academyRequests).set({ ...data, status: 'accepted' }).where(eq(academyRequests.id, req.params.id));

    const existingEnrollment = await findOpenEnrollment(existing.professorUid, existing.studentUid);
    if (existingEnrollment?.status === 'pending') {
      await db.update(enrollments).set({ status: 'active' }).where(eq(enrollments.id, existingEnrollment.id));
    } else if (!existingEnrollment) {
      const enrollmentId = nanoid();
      await db.insert(enrollments).values({
        id: enrollmentId,
        professorUid: existing.professorUid,
        academyName: existing.academyName ?? null,
        studentUid: existing.studentUid,
        studentName: existing.studentName ?? null,
        status: 'active',
      });
    }

    await db.update(users).set({
      academyId: existing.professorUid,
      academy: existing.academyName,
    }).where(eq(users.uid, existing.studentUid));

    const notifId = nanoid();
    await db.insert(notifications).values({
      id: notifId,
      toUid: existing.studentUid,
      fromUid: req.userId!,
      type: 'request_accepted',
      message: `Sua solicitação de ingresso em ${existing.academyName} foi aprovada! Bem-vindo!`,
      read: false,
    });
  } else if (newStatus === 'rejected') {
    await db.update(academyRequests).set({ ...data, status: 'rejected' }).where(eq(academyRequests.id, req.params.id));

    const notifId = nanoid();
    await db.insert(notifications).values({
      id: notifId,
      toUid: existing.studentUid,
      fromUid: req.userId!,
      type: 'request_rejected',
      message: `Sua solicitação de ingresso em ${existing.academyName} foi recusada.`,
      read: false,
    });
  } else {
    const [row] = await db.update(academyRequests).set({ ...data, status: newStatus }).where(eq(academyRequests.id, req.params.id)).returning();
    res.json(row);
    return;
  }

  const [row] = await db.select().from(academyRequests).where(eq(academyRequests.id, req.params.id)).limit(1);
  res.json(row);
});

export default router;
