import { Router } from 'express';
import { and, eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { classSchedules, classCheckIns, enrollments, notifications } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { sendNotificationsWhatsApp } from '../services/notificationWhatsApp.js';

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
  if (!studentUids.length) return { enabled: true, recipients: 0, sent: 0, failed: 0 };

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
  return sendNotificationsWhatsApp(inserted, professorUid);
}

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
  const [existing] = await db.select().from(classSchedules).where(eq(classSchedules.id, req.params.id)).limit(1);
  if (!existing || existing.professorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  const { id: _id, professorUid: _pu, ...data } = req.body;
  const [row] = await db.update(classSchedules).set(data).where(eq(classSchedules.id, req.params.id)).returning();
  let whatsapp = { enabled: true, recipients: 0, sent: 0, failed: 0 };
  try {
    const before = describeSchedule(existing);
    const after = describeSchedule(row);
    whatsapp = await notifyActiveStudentsAboutClass(
      req.userId!,
      'class_rescheduled',
      `Aula remarcada/atualizada: ${before || 'horario anterior'} -> ${after || 'novo horario'}. Confira a grade no app.`,
      { scheduleId: row.id, before, after },
    );
  } catch (err) {
    console.warn('[classes] class reschedule notification failed', err);
  }
  res.json({ ...row, whatsapp });
});

router.delete('/schedules/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select().from(classSchedules).where(eq(classSchedules.id, req.params.id)).limit(1);
  if (!existing || existing.professorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  await db.delete(classSchedules).where(eq(classSchedules.id, req.params.id));
  let whatsapp = { enabled: true, recipients: 0, sent: 0, failed: 0 };
  try {
    const schedule = describeSchedule(existing);
    whatsapp = await notifyActiveStudentsAboutClass(
      req.userId!,
      'class_cancelled',
      `Aula cancelada/removida da grade: ${schedule || 'horario removido'}. Confira a grade no app ou fale com o professor.`,
      { scheduleId: existing.id, schedule },
    );
  } catch (err) {
    console.warn('[classes] class cancellation notification failed', err);
  }
  res.json({ success: true, whatsapp });
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
