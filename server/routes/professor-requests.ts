// BJJRats — Professor Request routes (aluno solicita vínculo a professor particular)

import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { professorRequests, enrollments, notifications, users } from '../db/schema.js';
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

// ─── GET /api/professor-requests ──────────────────────────────────────────
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { professorUid, studentUid } = req.query as Record<string, string>;
  const conditions = [];
  if (professorUid) conditions.push(eq(professorRequests.professorUid, professorUid));
  if (studentUid)   conditions.push(eq(professorRequests.studentUid, studentUid));
  const rows = conditions.length
    ? await db.select().from(professorRequests).where(and(...conditions)).orderBy(desc(professorRequests.createdAt))
    : await db.select().from(professorRequests).orderBy(desc(professorRequests.createdAt));
  res.json(rows);
});

// ─── POST /api/professor-requests ─────────────────────────────────────────
// Aluno solicita vínculo a um professor particular
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { professorUid } = req.body || {};
  if (!professorUid) {
    res.status(400).json({ error: 'professorUid é obrigatório' });
    return;
  }

  const studentUid = req.userId!;

  // Verifica se já tem matrícula ativa com esse professor
  const existingEnrollment = await findOpenEnrollment(professorUid, studentUid);
  if (existingEnrollment) {
    res.status(409).json({ error: 'Você já possui vínculo ativo com este professor.' });
    return;
  }

  // Verifica se já tem solicitação pendente
  const [existingReq] = await db
    .select()
    .from(professorRequests)
    .where(and(
      eq(professorRequests.professorUid, professorUid),
      eq(professorRequests.studentUid, studentUid),
      eq(professorRequests.status, 'pending'),
    ))
    .limit(1);

  if (existingReq) {
    res.status(409).json({ error: 'Você já possui uma solicitação pendente com este professor.' });
    return;
  }

  // Busca dados do aluno e professor
  const [student] = await db.select().from(users).where(eq(users.uid, studentUid)).limit(1);
  const [professor] = await db.select().from(users).where(eq(users.uid, professorUid)).limit(1);

  if (!professor || professor.role !== 'professor') {
    res.status(400).json({ error: 'Professor não encontrado.' });
    return;
  }

  const id = nanoid();
  const [row] = await db.insert(professorRequests).values({
    id,
    studentUid,
    studentName: student?.name || '',
    studentEmail: student?.email || '',
    studentPhoto: student?.photo || null,
    studentBelt: student?.belt || 'Branca',
    professorUid,
    professorName: professor.name || '',
    status: 'pending',
  }).returning();

  // Notifica o professor
  await db.insert(notifications).values({
    id: nanoid(),
    toUid: professorUid,
    type: 'professor_request',
    message: `${student?.name || 'Aluno'} deseja se vincular a você como professor particular.`,
    data: { referenceId: id },
    read: false,
  });

  res.status(201).json(row);
});

// ─── PATCH /api/professor-requests/:id ────────────────────────────────────
// Professor aceita ou rejeita a solicitação
router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { status } = req.body || {};
  if (!status || !['accepted', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'Status inválido. Use accepted ou rejected.' });
    return;
  }

  const [reqRow] = await db
    .select()
    .from(professorRequests)
    .where(eq(professorRequests.id, req.params.id))
    .limit(1);

  if (!reqRow) {
    res.status(404).json({ error: 'Solicitação não encontrada.' });
    return;
  }

  if (reqRow.professorUid !== req.userId!) {
    res.status(403).json({ error: 'Apenas o professor pode responder a esta solicitação.' });
    return;
  }

  if (reqRow.status !== 'pending') {
    res.status(409).json({ error: 'Esta solicitação já foi respondida.' });
    return;
  }

  const [updated] = await db
    .update(professorRequests)
    .set({ status })
    .where(eq(professorRequests.id, req.params.id))
    .returning();

  if (status === 'accepted') {
    // Cria matrícula (enrollment)
    await db.insert(enrollments).values({
      id: nanoid(),
      professorUid: reqRow.professorUid,
      professorName: reqRow.professorName,
      studentUid: reqRow.studentUid,
      studentName: reqRow.studentName,
      monthlyFee: 0,
      dueDay: 1,
      status: 'active',
    });

    // Notifica o aluno
    await db.insert(notifications).values({
      id: nanoid(),
      toUid: reqRow.studentUid,
      type: 'professor_request_accepted',
      message: `${reqRow.professorName || 'Professor'} aceitou sua solicitação de vínculo.`,
      data: { referenceId: req.params.id },
      read: false,
    });
  } else {
    // Notifica o aluno da rejeição
    await db.insert(notifications).values({
      id: nanoid(),
      toUid: reqRow.studentUid,
      type: 'professor_request_rejected',
      message: `${reqRow.professorName || 'Professor'} recusou sua solicitação de vínculo.`,
      data: { referenceId: req.params.id },
      read: false,
    });
  }

  res.json(updated);
});

export default router;
