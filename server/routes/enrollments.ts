import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { enrollments, notifications, users } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { notifyEnrollmentReactivated } from '../services/enrollmentNotifications.js';

const router = Router();

function isOpenEnrollmentStatus(status?: string | null) {
  return status !== 'cancelled' && status !== 'rejected';
}

function enrollmentStatusPriority(status?: string | null) {
  if (status === 'active') return 4;
  if (status === 'suspended') return 3;
  if (status === 'pending') return 2;
  return 1;
}

function enrollmentCreatedAtTime(row: { createdAt?: Date | string | null }) {
  if (!row.createdAt) return 0;
  const date = row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function dedupeEnrollmentRows<T extends { professorUid: string; studentUid: string; status?: string | null; createdAt?: Date | string | null }>(rows: T[]) {
  const openByPair = new Map<string, T>();
  const closedRows: T[] = [];

  for (const row of rows) {
    if (!isOpenEnrollmentStatus(row.status)) {
      closedRows.push(row);
      continue;
    }

    const key = `${row.professorUid}:${row.studentUid}`;
    const current = openByPair.get(key);
    if (!current) {
      openByPair.set(key, row);
      continue;
    }

    const currentScore = enrollmentStatusPriority(current.status);
    const rowScore = enrollmentStatusPriority(row.status);
    if (rowScore > currentScore || (rowScore === currentScore && enrollmentCreatedAtTime(row) > enrollmentCreatedAtTime(current))) {
      openByPair.set(key, row);
    }
  }

  return [...Array.from(openByPair.values()), ...closedRows];
}

async function findOpenEnrollment(professorUid: string, studentUid: string, excludeId?: string) {
  const rows = await db.select().from(enrollments).where(and(
    eq(enrollments.professorUid, professorUid),
    eq(enrollments.studentUid, studentUid),
  ));
  return rows.find(row => row.id !== excludeId && isOpenEnrollmentStatus(row.status)) ?? null;
}

async function findOpenEnrollmentDuplicates(professorUid: string, studentUid: string, excludeId?: string) {
  const rows = await db.select().from(enrollments).where(and(
    eq(enrollments.professorUid, professorUid),
    eq(enrollments.studentUid, studentUid),
  ));
  return rows.filter(row => row.id !== excludeId && isOpenEnrollmentStatus(row.status));
}

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { professorUid, studentUid } = req.query as Record<string, string>;
  const conditions = [];
  if (professorUid) conditions.push(eq(enrollments.professorUid, professorUid));
  if (studentUid)   conditions.push(eq(enrollments.studentUid, studentUid));
  const rows = conditions.length
    ? await db.select().from(enrollments).where(and(...conditions)).orderBy(desc(enrollments.createdAt))
    : await db.select().from(enrollments).orderBy(desc(enrollments.createdAt));
  res.json(dedupeEnrollmentRows(rows));
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const body = req.body as Record<string, any>;
  const professorUid = String(body.professorUid || '');
  const studentUid = String(body.studentUid || '');
  if (!professorUid || !studentUid) {
    res.status(400).json({ error: 'Professor e aluno são obrigatórios' });
    return;
  }

  const createdByStudent = req.userId === studentUid;
  const createdByProfessor = req.userId === professorUid;
  if (!createdByStudent && !createdByProfessor) {
    res.status(403).json({ error: 'Proibido' });
    return;
  }

  const duplicate = await findOpenEnrollment(professorUid, studentUid);
  if (duplicate) {
    const isPending = duplicate.status === 'pending';
    res.status(409).json({
      error: isPending
        ? 'Já existe um convite de matrícula pendente para este aluno.'
        : 'Este aluno já possui uma matrícula ativa com este professor.',
      enrollment: duplicate,
    });
    return;
  }

  const status = createdByStudent ? (body.status || 'active') : 'pending';
  const [row] = await db.insert(enrollments).values({
    id,
    professorUid,
    professorName: body.professorName || null,
    academyName: body.academyName || null,
    studentUid,
    studentName: body.studentName || null,
    monthlyFee: Number(body.monthlyFee) || 0,
    dueDay: Number(body.dueDay) || 1,
    status,
    pixKey: body.pixKey || null,
  } as any).returning();

  if (status === 'active') {
    const profileUpdate: Record<string, string | null> = { academyId: row.professorUid };
    if (row.academyName) profileUpdate.academy = row.academyName;
    await db.update(users).set(profileUpdate).where(eq(users.uid, row.studentUid));
  } else {
    await db.insert(notifications).values({
      id: nanoid(),
      toUid: studentUid,
      fromUid: req.userId!,
      fromName: body.professorName || body.academyName || 'Professor',
      type: 'enrollment_invite',
      message: `${body.professorName || 'Seu professor'} enviou um convite de matrícula${body.academyName ? ` para ${body.academyName}` : ''}. Aceite para ativar o vínculo.`,
      data: {
        enrollmentId: row.id,
        professorUid,
        professorName: body.professorName || null,
        academyName: body.academyName || null,
        monthlyFee: Number(body.monthlyFee) || 0,
        dueDay: Number(body.dueDay) || 1,
        billingMode: body.billingMode || null,
        firstAmount: Number(body.firstAmount) || Number(body.monthlyFee) || 0,
        firstDueDate: body.firstDueDate || null,
        firstMonth: body.firstMonth || null,
        pixKey: body.pixKey || null,
      },
      read: false,
    } as any);
  }
  res.status(201).json(row);
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({
    professorUid: enrollments.professorUid,
    studentUid: enrollments.studentUid,
    studentName: enrollments.studentName,
    academyName: enrollments.academyName,
    status: enrollments.status,
  }).from(enrollments).where(eq(enrollments.id, req.params.id)).limit(1);
  if (!existing) { res.status(404).json({ error: 'Não encontrado' }); return; }
  const { id: _id, ...data } = req.body;

  if (existing.studentUid === req.userId && existing.status === 'pending') {
    if (data.status === 'active') {
      const duplicates = await findOpenEnrollmentDuplicates(existing.professorUid, existing.studentUid, req.params.id);
      const blocking = duplicates.find(row => row.status === 'active' || row.status === 'suspended');
      if (blocking) {
        res.status(409).json({ error: 'Este aluno já possui uma matrícula ativa com este professor.' });
        return;
      }
      for (const duplicate of duplicates.filter(row => row.status === 'pending')) {
        await db.update(enrollments).set({ status: 'cancelled' }).where(eq(enrollments.id, duplicate.id));
      }

      const [row] = await db.update(enrollments).set({ status: 'active' }).where(eq(enrollments.id, req.params.id)).returning();
      const profileUpdate: Record<string, string | null> = { academyId: existing.professorUid };
      if (existing.academyName) profileUpdate.academy = existing.academyName;
      await db.update(users).set(profileUpdate).where(eq(users.uid, existing.studentUid));
      await db.insert(notifications).values({
        id: nanoid(),
        toUid: existing.professorUid,
        fromUid: req.userId!,
        type: 'enrollment_invite_accepted',
        message: `${existing.studentName || 'Aluno'} aceitou o convite de matrícula.`,
        read: false,
      });
      res.json(row);
      return;
    }

    if (data.status === 'rejected' || data.status === 'cancelled') {
      const [row] = await db.update(enrollments).set({ status: 'cancelled' }).where(eq(enrollments.id, req.params.id)).returning();
      await db.insert(notifications).values({
        id: nanoid(),
        toUid: existing.professorUid,
        fromUid: req.userId!,
        type: 'enrollment_invite_rejected',
        message: `${existing.studentName || 'Aluno'} recusou o convite de matrícula.`,
        read: false,
      });
      res.json(row);
      return;
    }
  }

  if (existing.professorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  if (existing.status === 'pending' && data.status === 'active') {
    res.status(403).json({ error: 'O aluno precisa aceitar a matrícula' });
    return;
  }

  const [row] = await db.update(enrollments).set(data).where(eq(enrollments.id, req.params.id)).returning();
  if (row && existing.status === 'suspended' && data.status === 'active') {
    await notifyEnrollmentReactivated(row, req.userId!);
  }
  res.json(row);
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ professorUid: enrollments.professorUid }).from(enrollments).where(eq(enrollments.id, req.params.id)).limit(1);
  if (!existing || existing.professorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  await db.delete(enrollments).where(eq(enrollments.id, req.params.id));
  res.json({ success: true });
});

export default router;
