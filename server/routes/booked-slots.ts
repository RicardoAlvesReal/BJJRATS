// BJJRats — Booked Slots (Agenda de aulas)
// Alunos agendam aulas nos horários disponíveis do professor/academia

import { Router } from 'express';
import { eq, and, desc, gte } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { bookedSlots, notifications } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// ─── GET /api/booked-slots ─────────────────────────────────────────────────
// ?professorUid=xxx  → agenda do professor (aluno vê seus agendamentos)
// ?studentUid=xxx    → agendamentos do aluno
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { professorUid, studentUid } = req.query as Record<string, string>;
  const conditions = [];
  if (professorUid) conditions.push(eq(bookedSlots.professorUid, professorUid));
  if (studentUid) conditions.push(eq(bookedSlots.studentUid, studentUid));

  // Por padrão, só retorna agendamentos futuros (data >= hoje)
  const today = new Date().toISOString().split('T')[0];
  conditions.push(gte(bookedSlots.date, today));

  const rows = conditions.length
    ? await db.select().from(bookedSlots).where(and(...conditions)).orderBy(bookedSlots.date, bookedSlots.time)
    : await db.select().from(bookedSlots).where(gte(bookedSlots.date, today)).orderBy(bookedSlots.date, bookedSlots.time);
  res.json(rows);
});

// ─── POST /api/booked-slots ────────────────────────────────────────────────
// Aluno agenda uma aula
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { professorUid, scheduleId, date, time, notes, className } = req.body || {};

  if (!professorUid || !date || !time) {
    res.status(400).json({ error: 'professorUid, date e time são obrigatórios' });
    return;
  }

  // Valida data futura
  const today = new Date().toISOString().split('T')[0];
  if (date < today) {
    res.status(400).json({ error: 'Não é possível agendar em data passada.' });
    return;
  }

  // Verifica se já existe agendamento no mesmo horário com o mesmo professor
  const [existing] = await db
    .select()
    .from(bookedSlots)
    .where(and(
      eq(bookedSlots.professorUid, professorUid),
      eq(bookedSlots.date, date),
      eq(bookedSlots.time, time),
      eq(bookedSlots.status, 'confirmed'),
    ))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: 'Este horário já está reservado.' });
    return;
  }

  const id = nanoid();
  const [row] = await db.insert(bookedSlots).values({
    id,
    professorUid,
    studentUid: req.userId!,
    studentName: req.body?.studentName || req.userId!,
    scheduleId: scheduleId || null,
    date,
    time,
    durationMin: 60,
    className: className || 'Aula',
    notes: notes || null,
    status: 'confirmed',
  }).returning();

  // Notifica o professor
  try {
    await db.insert(notifications).values({
      id: nanoid(),
      toUid: professorUid,
      type: 'class_booked',
      message: `Nova aula agendada: ${date} às ${time} - ${className || 'Aula'}`,
      data: { slotId: id, date, time, className: className || 'Aula' },
      read: false,
    });
  } catch { /* notificação opcional */ }

  res.status(201).json(row);
});

// ─── PATCH /api/booked-slots/:id ───────────────────────────────────────────
// Cancelar agendamento (aluno ou professor)
router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select().from(bookedSlots).where(eq(bookedSlots.id, req.params.id)).limit(1);
  if (!existing) { res.status(404).json({ error: 'Agendamento não encontrado' }); return; }

  const isStudent = existing.studentUid === req.userId;
  const isProfessor = existing.professorUid === req.userId;
  if (!isStudent && !isProfessor) { res.status(403).json({ error: 'Proibido' }); return; }

  const { status } = req.body || {};
  if (status === 'cancelled' || status === 'completed') {
    const [row] = await db.update(bookedSlots).set({ status }).where(eq(bookedSlots.id, req.params.id)).returning();

    // Notifica a outra parte
    const notifyUid = isStudent ? existing.professorUid : existing.studentUid;
    try {
      await db.insert(notifications).values({
        id: nanoid(),
        toUid: notifyUid,
        type: status === 'cancelled' ? 'class_cancelled' : 'class_completed',
        message: status === 'cancelled'
          ? `Aula de ${existing.date} às ${existing.time} foi cancelada.`
          : `Aula de ${existing.date} às ${existing.time} foi concluída.`,
        data: { slotId: req.params.id },
        read: false,
      });
    } catch { /* opcional */ }

    res.json(row);
    return;
  }

  res.status(400).json({ error: 'Status inválido. Use cancelled ou completed.' });
});

export default router;
