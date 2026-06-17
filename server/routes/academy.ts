import { Router } from 'express';
import { nanoid } from 'nanoid';
import { and, desc, eq, gte, isNotNull, lt, ne, or, sql } from 'drizzle-orm';
import {
  academyProfessorLinks,
  academyRequests,
  academyStudentProfessorAssignments,
  classCheckIns,
  enrollments,
  notifications,
  payments,
  users,
} from '../db/schema.js';
import { db } from '../db/index.js';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.js';

const router = Router();

type ProfessorRelationType = 'internal' | 'partner';

function normalizeRelationType(value: unknown): ProfessorRelationType {
  return value === 'partner' ? 'partner' : 'internal';
}

function readPartnerRevenueSharePercent(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 50;
  return Math.min(100, Math.max(0, Math.round(numeric * 100) / 100));
}

async function getAcademyIdentity(academyUid: string) {
  const [academy] = await db.select({
    uid: users.uid,
    name: users.name,
    academy: users.academy,
    academyName: users.academyName,
  }).from(users).where(eq(users.uid, academyUid)).limit(1);

  return {
    uid: academyUid,
    name: academy?.academyName || academy?.academy || academy?.name || 'Academia',
  };
}

async function assertProfessorCanBecomeInternal(professorUid: string, academyUid: string) {
  const [otherInternal] = await db.select({
    id: academyProfessorLinks.id,
    academyUid: academyProfessorLinks.academyUid,
  })
    .from(academyProfessorLinks)
    .where(and(
      eq(academyProfessorLinks.professorUid, professorUid),
      eq(academyProfessorLinks.relationType, 'internal'),
      eq(academyProfessorLinks.status, 'active'),
    ))
    .limit(1);

  return !otherInternal || otherInternal.academyUid === academyUid;
}

router.get('/crm', requireAuth, requireRole('academy', 'admin'), async (req: AuthRequest, res) => {
  const academyUid = req.userId!;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    paymentData,
    enrollmentData,
    leadPipeline,
    revenueMonthly,
    recentPayments,
    leadsDetail,
    studentStatusCounts,
    enrollmentMonthly,
    beltDist,
    checkIns30d,
    totalStudents,
    defaultingPayments,
    activeEnrollmentsList,
    lastCheckIns,
  ] = await Promise.all([
    db
      .select({
        totalBilled:  sql<number>`coalesce(sum(${payments.amount}), 0)`,
        totalPaid:    sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'paid'), 0)`,
        totalPending: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'pending'), 0)`,
        totalOverdue: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'overdue'), 0)`,
      })
      .from(payments)
      .where(eq(payments.professorUid, academyUid)),

    db
      .select({
        total: sql<number>`coalesce(sum(${enrollments.monthlyFee}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(enrollments)
      .where(and(eq(enrollments.status, 'active'), eq(enrollments.professorUid, academyUid))),

    db
      .select({
        status: academyRequests.status,
        count: sql<number>`count(*)`,
      })
      .from(academyRequests)
      .where(eq(academyRequests.professorUid, academyUid))
      .groupBy(academyRequests.status),

    db
      .select({
        month: sql<string>`to_char(${payments.paidAt}, 'YYYY-MM')`,
        total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(payments)
      .where(and(eq(payments.status, 'paid'), eq(payments.professorUid, academyUid)))
      .groupBy(sql`to_char(${payments.paidAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${payments.paidAt}, 'YYYY-MM')`),

    db
      .select({
        id: payments.id,
        studentName: payments.studentName,
        studentUid: payments.studentUid,
        amount: payments.amount,
        status: payments.status,
        dueDate: payments.dueDate,
        paidAt: payments.paidAt,
      })
      .from(payments)
      .where(eq(payments.professorUid, academyUid))
      .orderBy(desc(payments.createdAt))
      .limit(20),

    db
      .select({
        id: academyRequests.id,
        studentName: academyRequests.studentName,
        studentEmail: academyRequests.studentEmail,
        studentBelt: academyRequests.studentBelt,
        studentPhoto: academyRequests.studentPhoto,
        studentUid: academyRequests.studentUid,
        status: academyRequests.status,
        createdAt: academyRequests.createdAt,
      })
      .from(academyRequests)
      .where(eq(academyRequests.professorUid, academyUid))
      .orderBy(desc(academyRequests.createdAt)),

    db
      .select({
        status: enrollments.status,
        count: sql<number>`count(*)`,
      })
      .from(enrollments)
      .where(eq(enrollments.professorUid, academyUid))
      .groupBy(enrollments.status),

    db
      .select({
        month: sql<string>`to_char(${enrollments.createdAt}, 'YYYY-MM')`,
        count: sql<number>`count(*)`,
      })
      .from(enrollments)
      .where(eq(enrollments.professorUid, academyUid))
      .groupBy(sql`to_char(${enrollments.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${enrollments.createdAt}, 'YYYY-MM')`),

    db
      .select({
        belt: users.belt,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .where(and(eq(users.role, 'student'), eq(users.academyId, academyUid)))
      .groupBy(users.belt)
      .orderBy(desc(sql`count(*)`)),

    db
      .select({ count: sql<number>`count(*)` })
      .from(classCheckIns)
      .where(and(eq(classCheckIns.academyId, academyUid), gte(classCheckIns.createdAt, thirtyDaysAgo))),

    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.role, 'student'), eq(users.academyId, academyUid))),

    db
      .select({
        id: payments.id,
        studentUid: payments.studentUid,
        studentName: payments.studentName,
        amount: payments.amount,
        dueDate: payments.dueDate,
        status: payments.status,
      })
      .from(payments)
      .where(and(
        eq(payments.professorUid, academyUid),
        or(
          eq(payments.status, 'overdue'),
          and(eq(payments.status, 'pending'), isNotNull(payments.dueDate), lt(payments.dueDate, now)),
        ),
      ))
      .orderBy(desc(payments.dueDate))
      .limit(50),

    db
      .select({
        studentUid: enrollments.studentUid,
        studentName: enrollments.studentName,
      })
      .from(enrollments)
      .where(and(eq(enrollments.status, 'active'), eq(enrollments.professorUid, academyUid))),

    db
      .select({
        studentUid: classCheckIns.studentUid,
        lastDate: sql<Date>`max(${classCheckIns.createdAt})`,
      })
      .from(classCheckIns)
      .where(eq(classCheckIns.academyId, academyUid))
      .groupBy(classCheckIns.studentUid),
  ]);

  const projectedMonthly = Number(enrollmentData[0]?.total ?? 0);
  const activeEnrollmentsCount = Number(enrollmentData[0]?.count ?? 0);
  const checkIns30dCount = Number(checkIns30d[0]?.count ?? 0);
  const totalStudentsCount = Number(totalStudents[0]?.count ?? 0);
  const attendanceRate = totalStudentsCount > 0
    ? Math.round((checkIns30dCount / (totalStudentsCount * 30)) * 10000) / 100
    : 0;

  const lastCheckInMap = new Map<string, Date>();
  for (const checkIn of lastCheckIns) {
    if (checkIn.studentUid && checkIn.lastDate) {
      lastCheckInMap.set(checkIn.studentUid, new Date(checkIn.lastDate));
    }
  }

  const inactiveStudents = activeEnrollmentsList
    .filter(enrollment => {
      const last = enrollment.studentUid ? lastCheckInMap.get(enrollment.studentUid) : undefined;
      if (!last) return true;
      const daysSinceLast = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLast > 14;
    })
    .map(enrollment => ({
      studentUid: enrollment.studentUid,
      studentName: enrollment.studentName,
      daysSinceLastCheckIn: enrollment.studentUid
        ? Math.floor((now.getTime() - (lastCheckInMap.get(enrollment.studentUid)?.getTime() ?? now.getTime())) / (1000 * 60 * 60 * 24))
        : 999,
    }))
    .sort((a, b) => b.daysSinceLastCheckIn - a.daysSinceLastCheckIn);

  res.json({
    revenue: {
      totalBilled: Number(paymentData[0]?.totalBilled ?? 0),
      totalPaid: Number(paymentData[0]?.totalPaid ?? 0),
      totalPending: Number(paymentData[0]?.totalPending ?? 0),
      totalOverdue: Number(paymentData[0]?.totalOverdue ?? 0),
      projectedMonthly,
      projectedAnnual: projectedMonthly * 12,
      activeEnrollments: activeEnrollmentsCount,
    },
    leads: leadPipeline.map(lead => ({ status: lead.status, count: Number(lead.count) })),
    revenueMonthly: revenueMonthly.map(row => ({ month: row.month, total: Number(row.total), count: Number(row.count) })),
    recentPayments: recentPayments.map(payment => ({
      id: payment.id,
      studentName: payment.studentName,
      studentUid: payment.studentUid,
      amount: Number(payment.amount),
      status: payment.status,
      dueDate: payment.dueDate,
      paidAt: payment.paidAt,
    })),
    leadsDetail: leadsDetail.map(lead => ({
      id: lead.id,
      studentName: lead.studentName,
      studentEmail: lead.studentEmail,
      studentBelt: lead.studentBelt,
      studentPhoto: lead.studentPhoto,
      studentUid: lead.studentUid,
      status: lead.status,
      createdAt: lead.createdAt?.toISOString(),
    })),
    studentStats: {
      active: Number(studentStatusCounts.find(status => status.status === 'active')?.count ?? 0),
      suspended: Number(studentStatusCounts.find(status => status.status === 'suspended')?.count ?? 0),
      cancelled: Number(studentStatusCounts.find(status => status.status === 'cancelled')?.count ?? 0),
      total: totalStudentsCount,
    },
    enrollmentEvolution: enrollmentMonthly.map(row => ({ month: row.month, newEnrollments: Number(row.count) })),
    studentsByBelt: beltDist.map(row => ({ belt: row.belt, count: Number(row.count) })),
    attendance: {
      checkInsLast30Days: checkIns30dCount,
      totalStudents: totalStudentsCount,
      rate: attendanceRate,
    },
    inactiveStudents: inactiveStudents.slice(0, 20),
    defaultingStudents: defaultingPayments.map(payment => ({
      id: payment.id,
      studentUid: payment.studentUid,
      studentName: payment.studentName,
      amount: Number(payment.amount),
      dueDate: payment.dueDate,
      status: payment.status,
    })),
  });
});

router.get('/professors', requireAuth, requireRole('academy', 'admin'), async (req: AuthRequest, res) => {
  const academyUid = req.userId!;
  const [links, assignmentCounts] = await Promise.all([
    db.select({
      id: academyProfessorLinks.id,
      academyUid: academyProfessorLinks.academyUid,
      professorUid: academyProfessorLinks.professorUid,
      relationType: academyProfessorLinks.relationType,
      status: academyProfessorLinks.status,
      partnerRevenueSharePercent: academyProfessorLinks.partnerRevenueSharePercent,
      partnerRevenueNotes: academyProfessorLinks.partnerRevenueNotes,
      notes: academyProfessorLinks.notes,
      createdAt: academyProfessorLinks.createdAt,
      updatedAt: academyProfessorLinks.updatedAt,
      professorName: users.name,
      professorEmail: users.email,
      professorPhone: users.phone,
      professorPhoto: users.photo,
      professorPhotoUrl: users.professorPhotoUrl,
      professorBelt: users.belt,
      professorAcademyId: users.academyId,
    })
      .from(academyProfessorLinks)
      .innerJoin(users, eq(users.uid, academyProfessorLinks.professorUid))
      .where(and(eq(academyProfessorLinks.academyUid, academyUid), ne(academyProfessorLinks.status, 'removed')))
      .orderBy(desc(academyProfessorLinks.createdAt)),

    db.select({
      professorUid: academyStudentProfessorAssignments.professorUid,
      status: academyStudentProfessorAssignments.status,
      count: sql<number>`count(*)`,
    })
      .from(academyStudentProfessorAssignments)
      .where(eq(academyStudentProfessorAssignments.academyUid, academyUid))
      .groupBy(academyStudentProfessorAssignments.professorUid, academyStudentProfessorAssignments.status),
  ]);

  const countsByProfessor = new Map<string, Record<string, number>>();
  for (const row of assignmentCounts) {
    const current = countsByProfessor.get(row.professorUid) || {};
    current[row.status || 'active'] = Number(row.count);
    countsByProfessor.set(row.professorUid, current);
  }

  res.json(links.map(link => ({
    ...link,
    assignmentCounts: countsByProfessor.get(link.professorUid) || {},
  })));
});

router.get('/professor-invites/mine', requireAuth, async (req: AuthRequest, res) => {
  if (req.userRole !== 'professor') {
    res.status(403).json({ error: 'Apenas professores.' });
    return;
  }

  const rows = await db.select({
    id: academyProfessorLinks.id,
    academyUid: academyProfessorLinks.academyUid,
    professorUid: academyProfessorLinks.professorUid,
    relationType: academyProfessorLinks.relationType,
    status: academyProfessorLinks.status,
    partnerRevenueSharePercent: academyProfessorLinks.partnerRevenueSharePercent,
    partnerRevenueNotes: academyProfessorLinks.partnerRevenueNotes,
    notes: academyProfessorLinks.notes,
    createdAt: academyProfessorLinks.createdAt,
    updatedAt: academyProfessorLinks.updatedAt,
    academyName: users.academyName,
    academy: users.academy,
    academyLogoUrl: users.academyLogoUrl,
  })
    .from(academyProfessorLinks)
    .innerJoin(users, eq(users.uid, academyProfessorLinks.academyUid))
    .where(and(
      eq(academyProfessorLinks.professorUid, req.userId!),
      eq(academyProfessorLinks.relationType, 'partner'),
      eq(academyProfessorLinks.status, 'pending'),
    ))
    .orderBy(desc(academyProfessorLinks.createdAt));

  res.json(rows);
});

router.post('/professors', requireAuth, requireRole('academy', 'admin'), async (req: AuthRequest, res) => {
  const academyUid = req.userId!;
  const relationType = normalizeRelationType(req.body?.relationType);
  const professorUid = String(req.body?.professorUid || '').trim();
  const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : '';
  const partnerRevenueSharePercent = readPartnerRevenueSharePercent(req.body?.partnerRevenueSharePercent);
  const partnerRevenueNotes = typeof req.body?.partnerRevenueNotes === 'string' ? req.body.partnerRevenueNotes.trim() : '';

  // ── Criar novo professor interno (submisso) ──
  const createAccount = req.body?.createAccount === true || req.body?.create_account === true;
  const newEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const newName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const newPassword = typeof req.body?.password === 'string' ? req.body.password : '';

  if (relationType === 'internal' && createAccount) {
    if (!newEmail || !newName || !newPassword) {
      res.status(400).json({ error: 'Nome, email e senha sao obrigatorios para criar uma conta de professor interno.' });
      return;
    }

    // Verificar se email ja existe
    const [existingUser] = await db.select({ uid: users.uid }).from(users).where(eq(users.email, newEmail)).limit(1);
    if (existingUser) {
      res.status(409).json({ error: 'Este e-mail ja esta cadastrado.' });
      return;
    }

    const bcrypt = await import('bcryptjs');
    const newUid = nanoid();
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const academy = await getAcademyIdentity(academyUid);

    await db.insert(users).values({
      uid: newUid,
      name: newName,
      email: newEmail,
      passwordHash,
      role: 'professor',
      belt: 'Preta',
      stripes: 0,
      academyId: academyUid,
      academy: academy.name,
      isAcademyAdmin: false,
      mustChangePassword: true,
    } as any);

    // Criar link de professor
    const linkId = nanoid();

    await db.insert(academyProfessorLinks).values({
      id: linkId,
      academyUid,
      professorUid: newUid,
      createdByUid: req.userId!,
      relationType: 'internal',
      status: 'active',
      notes: notes || null,
      updatedAt: new Date(),
    } as any);

    await db.insert(notifications).values({
      id: nanoid(),
      toUid: newUid,
      fromUid: academyUid,
      fromName: academy.name,
      type: 'academy_professor_internal',
      message: `${academy.name} criou sua conta de professor. Faca login no BJJRats com seu e-mail. A academia gerencia seus alunos e mensalidades.`,
      read: false,
    } as any);

    const [row] = await db.select().from(academyProfessorLinks).where(eq(academyProfessorLinks.id, linkId)).limit(1);
    res.status(201).json(row);
    return;
  }

  if (!professorUid) {
    res.status(400).json({ error: 'Professor obrigatorio.' });
    return;
  }

  const [professor] = await db.select({
    uid: users.uid,
    name: users.name,
    role: users.role,
    isAcademyAdmin: users.isAcademyAdmin,
    academyId: users.academyId,
  }).from(users).where(eq(users.uid, professorUid)).limit(1);

  if (!professor || professor.role !== 'professor' || professor.isAcademyAdmin) {
    res.status(400).json({ error: 'Selecione uma conta de professor valida.' });
    return;
  }

  if (relationType === 'internal') {
    const canBecomeInternal = await assertProfessorCanBecomeInternal(professorUid, academyUid);
    if (!canBecomeInternal || (professor.academyId && professor.academyId !== academyUid)) {
      res.status(409).json({ error: 'Este professor ja esta vinculado a outra academia.' });
      return;
    }
  }

  const academy = await getAcademyIdentity(academyUid);
  const [existing] = await db.select().from(academyProfessorLinks)
    .where(and(eq(academyProfessorLinks.academyUid, academyUid), eq(academyProfessorLinks.professorUid, professorUid)))
    .limit(1);

  const linkStatus = relationType === 'partner'
    ? (existing?.status === 'active' ? 'active' : 'pending')
    : 'active';

  const values = {
    relationType,
    status: linkStatus,
    partnerRevenueSharePercent: relationType === 'partner' ? partnerRevenueSharePercent : null,
    partnerRevenueNotes: relationType === 'partner' ? partnerRevenueNotes || null : null,
    notes: notes || null,
    updatedAt: new Date(),
  };

  const [row] = existing
    ? await db.update(academyProfessorLinks).set(values).where(eq(academyProfessorLinks.id, existing.id)).returning()
    : await db.insert(academyProfessorLinks).values({
      id: nanoid(),
      academyUid,
      professorUid,
      createdByUid: req.userId!,
      ...values,
    }).returning();

  if (relationType === 'internal') {
    await db.update(users).set({ academyId: academyUid, academy: academy.name }).where(eq(users.uid, professorUid));
  }

  await db.insert(notifications).values({
    id: nanoid(),
    toUid: professorUid,
    fromUid: academyUid,
    fromName: academy.name,
    type: relationType === 'internal' ? 'academy_professor_internal' : 'academy_professor_partner',
    message: relationType === 'internal'
      ? `${academy.name} vinculou voce como professor da academia. A academia gerencia alunos e mensalidades.`
      : `${academy.name} convidou voce para ser professor parceiro com proposta de ${partnerRevenueSharePercent}% da mensalidade para o professor. Aceite ou recuse no seu painel.`,
    read: false,
  } as any);

  res.status(existing ? 200 : 201).json(row);
});

router.patch('/professors/:id/respond', requireAuth, async (req: AuthRequest, res) => {
  if (req.userRole !== 'professor') {
    res.status(403).json({ error: 'Apenas professores.' });
    return;
  }

  const accepted = req.body?.status === 'accepted';
  const rejected = req.body?.status === 'rejected';
  if (!accepted && !rejected) {
    res.status(400).json({ error: 'Status invalido.' });
    return;
  }

  const [existing] = await db.select().from(academyProfessorLinks)
    .where(and(
      eq(academyProfessorLinks.id, req.params.id),
      eq(academyProfessorLinks.professorUid, req.userId!),
      eq(academyProfessorLinks.relationType, 'partner'),
      eq(academyProfessorLinks.status, 'pending'),
    ))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: 'Convite nao encontrado.' });
    return;
  }

  const [row] = await db.update(academyProfessorLinks)
    .set({ status: accepted ? 'active' : 'rejected', updatedAt: new Date() })
    .where(eq(academyProfessorLinks.id, existing.id))
    .returning();

  const [professor] = await db.select({ name: users.name }).from(users).where(eq(users.uid, req.userId!)).limit(1);
  await db.insert(notifications).values({
    id: nanoid(),
    toUid: existing.academyUid,
    fromUid: req.userId!,
    fromName: professor?.name || 'Professor',
    type: accepted ? 'academy_partner_invite_accepted' : 'academy_partner_invite_rejected',
    message: `${professor?.name || 'Professor'} ${accepted ? 'aceitou' : 'recusou'} o convite de parceria.`,
    data: { linkId: existing.id, professorUid: req.userId },
    read: false,
  } as any);

  res.json(row);
});

router.patch('/professors/:id', requireAuth, requireRole('academy', 'admin'), async (req: AuthRequest, res) => {
  const academyUid = req.userId!;
  const [existing] = await db.select().from(academyProfessorLinks)
    .where(and(eq(academyProfessorLinks.id, req.params.id), eq(academyProfessorLinks.academyUid, academyUid)))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: 'Vinculo nao encontrado.' });
    return;
  }

  const relationType = req.body?.relationType ? normalizeRelationType(req.body.relationType) : normalizeRelationType(existing.relationType);
  const status = req.body?.status === 'removed'
    ? 'removed'
    : req.body?.status === 'active'
      ? 'active'
      : existing.status || 'active';
  const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : existing.notes;
  const partnerRevenueSharePercent = Object.prototype.hasOwnProperty.call(req.body || {}, 'partnerRevenueSharePercent')
    ? readPartnerRevenueSharePercent(req.body.partnerRevenueSharePercent)
    : (existing.partnerRevenueSharePercent ?? 50);
  const partnerRevenueNotes = Object.prototype.hasOwnProperty.call(req.body || {}, 'partnerRevenueNotes')
    ? (typeof req.body.partnerRevenueNotes === 'string' ? req.body.partnerRevenueNotes.trim() : '')
    : existing.partnerRevenueNotes;

  if (relationType === 'internal') {
    const canBecomeInternal = await assertProfessorCanBecomeInternal(existing.professorUid, academyUid);
    if (!canBecomeInternal) {
      res.status(409).json({ error: 'Este professor ja esta vinculado a outra academia.' });
      return;
    }
  }

  const [row] = await db.update(academyProfessorLinks)
    .set({
      relationType,
      status,
      partnerRevenueSharePercent: relationType === 'partner' ? partnerRevenueSharePercent : null,
      partnerRevenueNotes: relationType === 'partner' ? partnerRevenueNotes || null : null,
      notes: notes || null,
      updatedAt: new Date(),
    })
    .where(eq(academyProfessorLinks.id, existing.id))
    .returning();

  if (status === 'removed' || (existing.relationType === 'internal' && relationType === 'partner')) {
    await db.update(users)
      .set({ academyId: null, academy: '' })
      .where(and(eq(users.uid, existing.professorUid), eq(users.academyId, academyUid)));
  } else if (relationType === 'internal') {
    const academy = await getAcademyIdentity(academyUid);
    await db.update(users).set({ academyId: academyUid, academy: academy.name }).where(eq(users.uid, existing.professorUid));
  }

  res.json(row);
});

router.get('/student-assignments', requireAuth, requireRole('academy', 'admin'), async (req: AuthRequest, res) => {
  const academyUid = req.userId!;
  const { professorUid } = req.query as Record<string, string>;
  const conditions = [eq(academyStudentProfessorAssignments.academyUid, academyUid)];
  if (professorUid) conditions.push(eq(academyStudentProfessorAssignments.professorUid, professorUid));

  const rows = await db.select({
    id: academyStudentProfessorAssignments.id,
    academyUid: academyStudentProfessorAssignments.academyUid,
    professorUid: academyStudentProfessorAssignments.professorUid,
    studentUid: academyStudentProfessorAssignments.studentUid,
    relationType: academyStudentProfessorAssignments.relationType,
    status: academyStudentProfessorAssignments.status,
    studentName: academyStudentProfessorAssignments.studentName,
    professorName: academyStudentProfessorAssignments.professorName,
    notes: academyStudentProfessorAssignments.notes,
    decidedAt: academyStudentProfessorAssignments.decidedAt,
    createdAt: academyStudentProfessorAssignments.createdAt,
    professorPhoto: users.professorPhotoUrl,
  })
    .from(academyStudentProfessorAssignments)
    .innerJoin(users, eq(users.uid, academyStudentProfessorAssignments.professorUid))
    .where(and(...conditions))
    .orderBy(desc(academyStudentProfessorAssignments.createdAt));

  res.json(rows);
});

router.get('/student-assignments/mine', requireAuth, async (req: AuthRequest, res) => {
  if (req.userRole !== 'professor') {
    res.status(403).json({ error: 'Apenas professores.' });
    return;
  }

  const rows = await db.select({
    id: academyStudentProfessorAssignments.id,
    academyUid: academyStudentProfessorAssignments.academyUid,
    professorUid: academyStudentProfessorAssignments.professorUid,
    studentUid: academyStudentProfessorAssignments.studentUid,
    relationType: academyStudentProfessorAssignments.relationType,
    status: academyStudentProfessorAssignments.status,
    studentName: academyStudentProfessorAssignments.studentName,
    professorName: academyStudentProfessorAssignments.professorName,
    notes: academyStudentProfessorAssignments.notes,
    decidedAt: academyStudentProfessorAssignments.decidedAt,
    createdAt: academyStudentProfessorAssignments.createdAt,
    academyName: users.academyName,
    academy: users.academy,
  })
    .from(academyStudentProfessorAssignments)
    .innerJoin(users, eq(users.uid, academyStudentProfessorAssignments.academyUid))
    .where(and(
      eq(academyStudentProfessorAssignments.professorUid, req.userId!),
      ne(academyStudentProfessorAssignments.status, 'cancelled'),
    ))
    .orderBy(desc(academyStudentProfessorAssignments.createdAt));

  res.json(rows);
});

router.post('/professors/:professorUid/assignments', requireAuth, requireRole('academy', 'admin'), async (req: AuthRequest, res) => {
  const academyUid = req.userId!;
  const professorUid = req.params.professorUid;
  const studentUid = String(req.body?.studentUid || '').trim();
  const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : '';
  if (!studentUid) {
    res.status(400).json({ error: 'Aluno obrigatorio.' });
    return;
  }

  const [link] = await db.select().from(academyProfessorLinks)
    .where(and(
      eq(academyProfessorLinks.academyUid, academyUid),
      eq(academyProfessorLinks.professorUid, professorUid),
      eq(academyProfessorLinks.status, 'active'),
    ))
    .limit(1);
  if (!link) {
    res.status(404).json({ error: 'Professor nao esta vinculado a esta academia.' });
    return;
  }

  const [student] = await db.select({
    uid: users.uid,
    name: users.name,
    role: users.role,
    academyId: users.academyId,
  }).from(users).where(eq(users.uid, studentUid)).limit(1);
  if (!student || student.role !== 'student') {
    res.status(400).json({ error: 'Aluno invalido.' });
    return;
  }

  const [academyEnrollment] = await db.select({ id: enrollments.id }).from(enrollments)
    .where(and(
      eq(enrollments.professorUid, academyUid),
      eq(enrollments.studentUid, studentUid),
      ne(enrollments.status, 'cancelled'),
    ))
    .limit(1);

  if (student.academyId !== academyUid && !academyEnrollment) {
    res.status(403).json({ error: 'Este aluno nao pertence a esta academia.' });
    return;
  }

  const [professor] = await db.select({ name: users.name }).from(users).where(eq(users.uid, professorUid)).limit(1);
  const relationType = normalizeRelationType(link.relationType);
  const assignmentStatus = relationType === 'partner' ? 'pending' : 'active';
  const [existing] = await db.select().from(academyStudentProfessorAssignments)
    .where(and(
      eq(academyStudentProfessorAssignments.academyUid, academyUid),
      eq(academyStudentProfessorAssignments.professorUid, professorUid),
      eq(academyStudentProfessorAssignments.studentUid, studentUid),
    ))
    .limit(1);

  const values = {
    relationType,
    status: assignmentStatus,
    studentName: student.name,
    professorName: professor?.name || null,
    notes: notes || null,
    createdByUid: req.userId!,
    decidedAt: relationType === 'internal' ? new Date() : null,
    updatedAt: new Date(),
  } as any;

  const [row] = existing
    ? await db.update(academyStudentProfessorAssignments).set(values).where(eq(academyStudentProfessorAssignments.id, existing.id)).returning()
    : await db.insert(academyStudentProfessorAssignments).values({
      id: nanoid(),
      academyUid,
      professorUid,
      studentUid,
      ...values,
    }).returning();

  const academy = await getAcademyIdentity(academyUid);
  await db.insert(notifications).values({
    id: nanoid(),
    toUid: professorUid,
    fromUid: academyUid,
    fromName: academy.name,
    type: relationType === 'partner' ? 'academy_partner_student_referral' : 'academy_internal_student_assignment',
    message: relationType === 'partner'
      ? `${academy.name} indicou ${student.name} para voce. Aceite ou recuse no seu painel.`
      : `${academy.name} atribuiu ${student.name} para seu acompanhamento.`,
    data: { assignmentId: row.id, studentUid, academyUid },
    read: false,
  } as any);

  if (relationType === 'internal') {
    await db.insert(notifications).values({
      id: nanoid(),
      toUid: studentUid,
      fromUid: academyUid,
      fromName: academy.name,
      type: 'academy_student_assigned_professor',
      message: `${academy.name} definiu ${professor?.name || 'um professor'} para acompanhar seus treinos.`,
      data: { assignmentId: row.id, professorUid, academyUid },
      read: false,
    } as any);
  }

  res.status(existing ? 200 : 201).json(row);
});

router.patch('/student-assignments/:id/respond', requireAuth, async (req: AuthRequest, res) => {
  if (req.userRole !== 'professor') {
    res.status(403).json({ error: 'Apenas professores.' });
    return;
  }
  const status = req.body?.status === 'accepted' ? 'accepted' : req.body?.status === 'rejected' ? 'rejected' : null;
  if (!status) {
    res.status(400).json({ error: 'Status invalido.' });
    return;
  }

  const [existing] = await db.select().from(academyStudentProfessorAssignments)
    .where(and(
      eq(academyStudentProfessorAssignments.id, req.params.id),
      eq(academyStudentProfessorAssignments.professorUid, req.userId!),
      eq(academyStudentProfessorAssignments.relationType, 'partner'),
    ))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: 'Indicacao nao encontrada.' });
    return;
  }

  const [row] = await db.update(academyStudentProfessorAssignments)
    .set({ status, decidedAt: new Date(), updatedAt: new Date() })
    .where(eq(academyStudentProfessorAssignments.id, existing.id))
    .returning();

  const [professor] = await db.select({ name: users.name }).from(users).where(eq(users.uid, req.userId!)).limit(1);
  await db.insert(notifications).values({
    id: nanoid(),
    toUid: existing.academyUid,
    fromUid: req.userId!,
    fromName: professor?.name || 'Professor',
    type: status === 'accepted' ? 'academy_partner_referral_accepted' : 'academy_partner_referral_rejected',
    message: `${professor?.name || 'Professor'} ${status === 'accepted' ? 'aceitou' : 'recusou'} acompanhar ${existing.studentName || 'o aluno indicado'}.`,
    data: { assignmentId: row.id, studentUid: existing.studentUid, professorUid: req.userId },
    read: false,
  } as any);

  if (status === 'accepted') {
    await db.insert(notifications).values({
      id: nanoid(),
      toUid: existing.studentUid,
      fromUid: req.userId!,
      fromName: professor?.name || 'Professor',
      type: 'partner_professor_referral_accepted',
      message: `${professor?.name || 'Professor'} aceitou acompanhar sua indicacao pela academia.`,
      data: { assignmentId: row.id, professorUid: req.userId },
      read: false,
    } as any);
  }

  res.json(row);
});

// ─── PATCH /api/academy/student-assignments/:id ──────────────────────────
// Academia cancela/remove atribuição de aluno
router.patch('/student-assignments/:id', requireAuth, requireRole('academy', 'admin'), async (req: AuthRequest, res) => {
  const academyUid = req.userId!;
  const [existing] = await db.select().from(academyStudentProfessorAssignments)
    .where(and(
      eq(academyStudentProfessorAssignments.id, req.params.id),
      eq(academyStudentProfessorAssignments.academyUid, academyUid),
    ))
    .limit(1);
  if (!existing) { res.status(404).json({ error: 'Atribuicao nao encontrada.' }); return; }

  const [row] = await db.update(academyStudentProfessorAssignments)
    .set({ status: 'cancelled', updatedAt: new Date() } as any)
    .where(eq(academyStudentProfessorAssignments.id, existing.id))
    .returning();
  res.json(row);
});

export default router;
