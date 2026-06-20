import { Router } from 'express';
import { and, eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { classSchedules, classCheckIns, enrollments, notifications } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { requireActiveEnrollment } from '../middleware/enrollment.js';
import { isInternalAcademyProfessor } from '../services/academyProfessorAccess.js';
import { sendNotificationsWhatsApp } from '../services/notificationWhatsApp.js';
import { sendNotificationsEmail } from '../services/notificationEmail.js';

const router = Router();

type ClassScheduleRow = typeof classSchedules.$inferSelect;

const DAY_LABELS: Record<number, string> = {
  0: 'domingo',
  1: 'segunda',
  2: 'terca',
  3: 'quarta',
  4: 'quinta',
  5: 'sexta',
  6: 'sabado',
};

function describeSchedule(schedule: ClassScheduleRow) {
  const row = schedule as any;
  const days = Array.isArray(row.days)
    ? row.days.join(', ')
    : typeof row.dayOfWeek === 'number'
      ? DAY_LABELS[row.dayOfWeek]
      : '';
  const time = row.time || row.startTime || '';
  const name = row.type || row.className || 'Aula';
  const mode = row.mode || row.modality || '';
  return [name, mode, days, time].filter(Boolean).join(' - ');
}

async function notifyActiveStudentsAboutClass(
  professorUid: string,
  type: 'class_rescheduled' | 'class_cancelled',
  message: string,
  data: Record<string, unknown>,
) {
  const activeStudents = await db.select({ studentUid: enrollments.studentUid })
    .from(enrollments)
    .where(and(eq(enrollments.professorUid, professorUid), eq(enrollments.status, 'active')));

  const studentUids = Array.from(new Set(activeStudents.map(row => row.studentUid).filter(Boolean)));
  if (!studentUids.length) {
    return {
      whatsapp: { enabled: true, recipients: 0, sent: 0, failed: 0 },
      email: { enabled: true, recipients: 0, sent: 0, failed: 0 },
    };
  }

  const rows = studentUids.map(studentUid => ({
    id: nanoid(),
    toUid: studentUid,
    fromUid: professorUid,
    type,
    message,
    data,
    read: false,
  }));

  const inserted = await db.insert(notifications).values(rows).returning();
  const [whatsapp, email] = await Promise.all([
    sendNotificationsWhatsApp(inserted, professorUid),
    sendNotificationsEmail(inserted, professorUid),
  ]);
  return { whatsapp, email };
}

// ─── Schedules ───────────────────────────────────────────────────────────────
router.get('/schedules', requireAuth, async (req: AuthRequest, res) => {
  const { academyId, professorUid } = req.query as Record<string, string | undefined>;
  const conditions = [];

  if (academyId) conditions.push(eq(classSchedules.academyId, academyId));
  if (professorUid) conditions.push(eq(classSchedules.professorUid, professorUid));

  if (!conditions.length && req.userRole !== 'superadmin') {
    if (req.userRole === 'academy' || req.userRole === 'admin') {
      conditions.push(eq(classSchedules.academyId, req.userId!));
    } else if (req.userRole === 'professor') {
      conditions.push(eq(classSchedules.professorUid, req.userId!));
    } else {
      res.json([]);
      return;
    }
  }

  const rows = conditions.length
    ? await db.select().from(classSchedules).where(and(...conditions))
    : await db.select().from(classSchedules);
  res.json(rows);
});

router.post('/schedules', requireAuth, async (req: AuthRequest, res) => {
  if (await isInternalAcademyProfessor(req.userId!, req.userRole)) {
    res.status(403).json({ error: 'Horarios deste professor sao gerenciados pela academia.' });
    return;
  }

  const id = nanoid();
  const {
    id: _id,
    professorUid: requestedProfessorUid,
    academyId: requestedAcademyId,
    createdAt: _createdAt,
    ...data
  } = req.body ?? {};
  const isAcademyOwner = req.userRole === 'academy' || req.userRole === 'admin';
  const academyId = isAcademyOwner ? req.userId! : requestedAcademyId ?? req.userId!;
  const professorUid = isAcademyOwner ? requestedProfessorUid ?? req.userId! : req.userId!;
  const [row] = await db.insert(classSchedules).values({ id, ...data, professorUid, academyId }).returning();

  // Notifica alunos ativos sobre o novo horário
  try {
    await notifyActiveStudentsAboutClass(
      professorUid,
      'class_created',
      `Novo horário de treino disponível: ${describeSchedule(row)}. Confirme sua presença no app!`,
      { scheduleId: row.id, schedule: describeSchedule(row) },
    );
  } catch (err) {
    console.warn('[classes] class created notification failed', err);
  }

  res.status(201).json(row);
});

router.patch('/schedules/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select().from(classSchedules).where(eq(classSchedules.id, req.params.id)).limit(1);
  const canManageAsAcademy = (req.userRole === 'academy' || req.userRole === 'admin') && existing?.academyId === req.userId;
  const canManage = req.userRole === 'superadmin' || existing?.professorUid === req.userId || canManageAsAcademy;
  if (!existing || !canManage) { res.status(403).json({ error: 'Proibido' }); return; }
  if (await isInternalAcademyProfessor(req.userId!, req.userRole)) {
    res.status(403).json({ error: 'Horarios deste professor sao gerenciados pela academia.' });
    return;
  }
  const { id: _id, professorUid: _pu, academyId: _academyId, createdAt: _createdAt, ...data } = req.body ?? {};
  if (!Object.keys(data).length) { res.json(existing); return; }
  const [row] = await db.update(classSchedules).set(data).where(eq(classSchedules.id, req.params.id)).returning();
  let automation = {
    whatsapp: { enabled: true, recipients: 0, sent: 0, failed: 0 },
    email: { enabled: true, recipients: 0, sent: 0, failed: 0 },
  };
  try {
    const before = describeSchedule(existing);
    const after = describeSchedule(row);
    automation = await notifyActiveStudentsAboutClass(
      existing.professorUid,
      'class_rescheduled',
      `Aula remarcada/atualizada: ${before || 'horario anterior'} -> ${after || 'novo horario'}. Confira a grade no app.`,
      { scheduleId: row.id, before, after },
    );
  } catch (err) {
    console.warn('[classes] class reschedule notification failed', err);
  }
  res.json({ ...row, ...automation });
});

router.delete('/schedules/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select().from(classSchedules).where(eq(classSchedules.id, req.params.id)).limit(1);
  const canManageAsAcademy = (req.userRole === 'academy' || req.userRole === 'admin') && existing?.academyId === req.userId;
  const canManage = req.userRole === 'superadmin' || existing?.professorUid === req.userId || canManageAsAcademy;
  if (!existing || !canManage) { res.status(403).json({ error: 'Proibido' }); return; }
  if (await isInternalAcademyProfessor(req.userId!, req.userRole)) {
    res.status(403).json({ error: 'Horarios deste professor sao gerenciados pela academia.' });
    return;
  }
  await db.delete(classSchedules).where(eq(classSchedules.id, req.params.id));
  let automation = {
    whatsapp: { enabled: true, recipients: 0, sent: 0, failed: 0 },
    email: { enabled: true, recipients: 0, sent: 0, failed: 0 },
  };
  try {
    const schedule = describeSchedule(existing);
    automation = await notifyActiveStudentsAboutClass(
      existing.professorUid,
      'class_cancelled',
      `Aula cancelada/removida da grade: ${schedule || 'horario removido'}. Confira a grade no app ou fale com o professor.`,
      { scheduleId: existing.id, schedule },
    );
  } catch (err) {
    console.warn('[classes] class cancellation notification failed', err);
  }
  res.json({ success: true, ...automation });
});

// ─── Check-ins ───────────────────────────────────────────────────────────────
router.get('/check-ins', requireAuth, async (req: AuthRequest, res) => {
  const { academyId, studentUid } = req.query as Record<string, string>;
  const rows = academyId
    ? await db.select().from(classCheckIns).where(eq(classCheckIns.academyId, academyId)).orderBy(desc(classCheckIns.checkInDate))
    : await db.select().from(classCheckIns).where(eq(classCheckIns.studentUid, studentUid || req.userId!)).orderBy(desc(classCheckIns.checkInDate));
  res.json(rows);
});

router.post('/check-ins', requireAuth, requireActiveEnrollment(req => ({
  professorUid: req.body?.professorUid,
  studentUid: req.userId!,
})), async (req: AuthRequest, res) => {
  const id = nanoid();
  const [row] = await db.insert(classCheckIns).values({ id, studentUid: req.userId!, ...req.body }).returning();
  res.status(201).json(row);
});

export default router;
