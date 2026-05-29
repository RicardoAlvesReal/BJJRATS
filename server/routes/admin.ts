import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { eq, sql, and, or, gte, lt, desc, isNotNull, ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, trainings, classCheckIns, payments, enrollments, academyRequests, posts, comments, events, challenges, plans, subscriptions, settings } from '../db/schema.js';
import {
  requireAuth,
  requireRole,
  ROLE_HIERARCHY,
  type AuthRequest,
} from '../middleware/auth.js';

const router = Router();

// Retorna true se o ator pode gerenciar o targetRole
function canManage(actorRole: string, targetRole: string): boolean {
  return (ROLE_HIERARCHY[actorRole] ?? 0) > (ROLE_HIERARCHY[targetRole] ?? 0);
}

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// Lista usuários com role abaixo do solicitante
router.get(
  '/users',
  requireAuth,
  requireRole('superadmin', 'admin', 'professor'),
  async (req: AuthRequest, res) => {
    const actorRole = req.userRole!;
    const academyUid = actorRole !== 'superadmin' ? req.userId! : null;
    const { search } = req.query as Record<string, string>;

    let query = db
      .select({
        uid:         users.uid,
        name:        users.name,
        email:       users.email,
        role:        users.role,
        belt:        users.belt,
        stripes:     users.stripes,
        academyId:   users.academyId,
        academyName: users.academyName,
        academy:     users.academy,
        academyCity: users.academyCity,
        phone:       users.phone,
        createdAt:   users.createdAt,
        communityModerator: users.communityModerator,
        trialEndsAt: users.trialEndsAt,
      })
      .from(users);

    const conditions: any[] = [];
    if (academyUid) {
      conditions.push(
        or(
          eq(users.academyId, academyUid),
          eq(users.uid, academyUid),
        )
      );
    }
    if (search) {
      conditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.academy, `%${search}%`),
          ilike(users.academyName, `%${search}%`),
          ilike(users.academyCity, `%${search}%`),
        )
      );
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const all = await query;
    const filtered = all.filter((u) => canManage(actorRole, u.role ?? 'student'));
    res.json({ users: filtered });
  }
);

// ─── POST /api/admin/users ────────────────────────────────────────────────────
// Cria um usuário com role abaixo do solicitante
router.post(
  '/users',
  requireAuth,
  requireRole('superadmin', 'admin', 'professor'),
  async (req: AuthRequest, res) => {
    const actorRole = req.userRole!;
    const {
      name, email, password,
      role = 'student',
      belt = 'Branca',
      ...rest
    } = req.body as Record<string, string>;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'name, email e password são obrigatórios' });
      return;
    }

    if (!canManage(actorRole, role)) {
      res.status(403).json({ error: `Você não pode criar usuários com role "${role}"` });
      return;
    }

    const existing = await db
      .select({ uid: users.uid })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing.length) {
      res.status(409).json({ error: 'E-mail já cadastrado' });
      return;
    }

    const uid          = nanoid();
    const passwordHash = await bcrypt.hash(password, 10);

    await db.insert(users).values({
      uid,
      name,
      email:          email.toLowerCase(),
      passwordHash,
      belt,
      role,
      academy:        rest.academy        || '',
      academyId:      rest.academyId || (actorRole !== 'superadmin' ? req.userId! : null),
      professor:      rest.professor      || '',
      academyName:    rest.academyName    || null,
      academyAddress: rest.academyAddress || null,
      academyCity:    rest.academyCity    || null,
      academyState:   rest.academyState   || null,
      academyCnpj:    rest.academyCnpj    || null,
      academyCep:     rest.academyCep     || null,
      academyNumber:  rest.academyNumber  || null,
      academyNeighborhood: rest.academyNeighborhood || null,
      academyComplement:    rest.academyComplement   || null,
      phone:          rest.phone          || null,
      subscriptionExempt: true,
    });

    const [user] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    res.status(201).json({ user: sanitize(user) });
  }
);

// ─── PATCH /api/admin/users/:uid ─────────────────────────────────────────────
// Edita dados ou role de um usuário
router.patch(
  '/users/:uid',
  requireAuth,
  requireRole('superadmin', 'admin'),
  async (req: AuthRequest, res) => {
    const actorRole = req.userRole!;
    const { uid } = req.params;

    const [target] = await db
      .select({ uid: users.uid, role: users.role, academyId: users.academyId })
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (!target) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }
    if (!canManage(actorRole, target.role ?? 'student')) {
      res.status(403).json({ error: 'Sem permissão para editar este usuário' });
      return;
    }
    if (actorRole !== 'superadmin' && target.academyId !== req.userId) {
      res.status(403).json({ error: 'Sem permissão para editar este usuário' });
      return;
    }

    const { password, role: newRole, communityModerator: _ignored, ...fields } = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { ...fields };

    if (password) {
      updates.passwordHash = await bcrypt.hash(password as string, 10);
    }
    if (newRole) {
      if (!canManage(actorRole, newRole as string)) {
        res.status(403).json({ error: `Você não pode atribuir o role "${newRole}"` });
        return;
      }
      updates.role = newRole;
    }

    await db.update(users).set(updates).where(eq(users.uid, uid));
    const [updated] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    res.json({ user: sanitize(updated) });
  }
);

// ─── DELETE /api/admin/users/:uid ────────────────────────────────────────────
router.delete(
  '/users/:uid',
  requireAuth,
  requireRole('superadmin', 'admin'),
  async (req: AuthRequest, res) => {
    const actorRole = req.userRole!;
    const { uid } = req.params;

    if (uid === req.userId) {
      res.status(400).json({ error: 'Você não pode deletar a si mesmo' });
      return;
    }

    const [target] = await db
      .select({ uid: users.uid, role: users.role, academyId: users.academyId })
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (!target) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }
    if (!canManage(actorRole, target.role ?? 'student')) {
      res.status(403).json({ error: 'Sem permissão para deletar este usuário' });
      return;
    }
    if (actorRole !== 'superadmin' && target.academyId !== req.userId) {
      res.status(403).json({ error: 'Sem permissão para deletar este usuário' });
      return;
    }

    await db.delete(users).where(eq(users.uid, uid));
    res.json({ success: true });
  }
);

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
// Estatísticas gerais da plataforma
router.get(
  '/stats',
  requireAuth,
  requireRole('superadmin', 'admin'),
  async (req: AuthRequest, res) => {
    const actorRole = req.userRole!;
    const academyUid = actorRole !== 'superadmin' ? req.userId! : null;
    const days = Math.min(Math.max(parseInt(req.query.days as string) || 0, 0), 365);
    const today = new Date().toISOString().slice(0, 10);
    const rangeStart = days > 0 ? new Date(Date.now() - days * 86400000).toISOString().slice(0, 10) : null;

    const [
      trainingStats,
      checkInsToday,
      usersByMonth,
      beltDist,
      stateDist,
    ] = await Promise.all([
      // Estatísticas de treinos
      (() => {
        let q = db.select({
          total: sql<number>`count(*)`,
          totalXp: sql<number>`coalesce(sum(${trainings.xp}), 0)`,
          totalHours: sql<number>`coalesce(sum(${trainings.duration}), 0) / 60.0`,
          today: sql<number>`count(*) filter (where ${trainings.trainingDate} = ${today})`,
          inRange: rangeStart ? sql<number>`count(*) filter (where ${trainings.trainingDate} >= ${rangeStart})` : sql<number>`count(*)`,
        }).from(trainings);
        if (academyUid) {
          q = q
            .innerJoin(users, eq(trainings.uid, users.uid))
            .where(
              or(
                eq(users.academyId, academyUid),
                eq(trainings.uid, academyUid),
              )
            );
        }
        return q;
      })(),

      // Check-ins hoje
      (() => {
        const conditions = [gte(classCheckIns.checkInDate, today)];
        if (academyUid) conditions.push(eq(classCheckIns.academyId, academyUid));
        return db
          .select({ count: sql<number>`count(*)` })
          .from(classCheckIns)
          .where(and(...conditions))
          .then(r => Number(r[0]?.count ?? 0));
      })(),

      // Novos usuários por mês (últimos 6)
      (() => {
        let q = db
          .select({
            month: sql<string>`to_char(${users.createdAt}, 'YYYY-MM')`,
            count: sql<number>`count(*)`,
          })
          .from(users)
          .groupBy(sql`to_char(${users.createdAt}, 'YYYY-MM')`)
          .orderBy(sql`to_char(${users.createdAt}, 'YYYY-MM')`);
        if (academyUid) {
          q = q.where(
            or(
              eq(users.academyId, academyUid),
              eq(users.uid, academyUid),
            )
          );
        }
        return q;
      })(),

      // Distribuição por faixa
      (() => {
        let q = db
          .select({
            belt: users.belt,
            count: sql<number>`count(*)`,
          })
          .from(users)
          .groupBy(users.belt)
          .orderBy(users.belt);
        if (academyUid) {
          q = q.where(
            or(
              eq(users.academyId, academyUid),
              eq(users.uid, academyUid),
            )
          );
        }
        return q;
      })(),

      // Academias por estado
      (() => {
        let q = db
          .select({
            state: users.academyState,
            count: sql<number>`count(*)`,
          })
          .from(users)
          .where(and(sql`${users.academyState} is not null`, sql`${users.academyState} != ''`))
          .groupBy(users.academyState)
          .orderBy(users.academyState);
        if (academyUid) {
          q = q.where(
            or(
              eq(users.academyId, academyUid),
              eq(users.uid, academyUid),
            )
          );
        }
        return q;
      })(),
    ]);

    res.json({
      trainings: {
        total: Number(trainingStats[0]?.total ?? 0),
        totalXP: Number(trainingStats[0]?.totalXp ?? 0),
        totalHours: Math.round(Number(trainingStats[0]?.totalHours ?? 0) * 10) / 10,
        today: Number(trainingStats[0]?.today ?? 0),
        inRange: Number(trainingStats[0]?.inRange ?? 0),
      },
      checkInsToday: checkInsToday,
      userGrowth: usersByMonth.slice(-6).map(r => ({ month: r.month, count: Number(r.count) })),
      beltDistribution: beltDist.map(r => ({ belt: r.belt, count: Number(r.count) })),
      academiesByState: stateDist.map(r => ({ state: r.state, count: Number(r.count) })),
    });
  }
);

// ─── GET /api/admin/crm ──────────────────────────────────────────────────────
// Dados completos do CRM: faturamento, leads, alunos, frequência, inadimplência
router.get(
  '/crm',
  requireAuth,
  requireRole('superadmin', 'admin'),
  async (req: AuthRequest, res) => {
    const actorRole = req.userRole!;
    const academyUid = actorRole !== 'superadmin' ? req.userId! : null;
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
      // 1. Resumo financeiro geral
      (() => {
        const cond: any[] = [];
        if (academyUid) cond.push(eq(payments.professorUid, academyUid));
        return db
          .select({
            totalBilled:  sql<number>`coalesce(sum(${payments.amount}), 0)`,
            totalPaid:    sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'paid'), 0)`,
            totalPending: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'pending'), 0)`,
            totalOverdue: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'overdue'), 0)`,
          })
          .from(payments)
          .where(cond.length ? and(...cond) : undefined);
      })(),

      // 2. Mensalidades previstas
      (() => {
        const cond: any[] = [eq(enrollments.status, 'active')];
        if (academyUid) cond.push(eq(enrollments.professorUid, academyUid));
        return db
          .select({
            total: sql<number>`coalesce(sum(${enrollments.monthlyFee}), 0)`,
            count: sql<number>`count(*)`,
          })
          .from(enrollments)
          .where(and(...cond));
      })(),

      // 3. Pipeline de leads (agrupado)
      (() => {
        const cond: any[] = [];
        if (academyUid) cond.push(eq(academyRequests.professorUid, academyUid));
        return db
          .select({
            status: academyRequests.status,
            count: sql<number>`count(*)`,
          })
          .from(academyRequests)
          .where(cond.length ? and(...cond) : undefined)
          .groupBy(academyRequests.status);
      })(),

      // 4. Faturamento mensal (recebido)
      (() => {
        const cond: any[] = [eq(payments.status, 'paid')];
        if (academyUid) cond.push(eq(payments.professorUid, academyUid));
        return db
          .select({
            month: sql<string>`to_char(${payments.paidAt}, 'YYYY-MM')`,
            total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
            count: sql<number>`count(*)`,
          })
          .from(payments)
          .where(and(...cond))
          .groupBy(sql`to_char(${payments.paidAt}, 'YYYY-MM')`)
          .orderBy(sql`to_char(${payments.paidAt}, 'YYYY-MM')`);
      })(),

      // 5. Últimos pagamentos
      (() => {
        const cond: any[] = [];
        if (academyUid) cond.push(eq(payments.professorUid, academyUid));
        return db
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
          .where(cond.length ? and(...cond) : undefined)
          .orderBy(desc(payments.createdAt))
          .limit(20);
      })(),

      // 6. Leads detalhados
      (() => {
        const cond: any[] = [];
        if (academyUid) cond.push(eq(academyRequests.professorUid, academyUid));
        return db
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
          .where(cond.length ? and(...cond) : undefined)
          .orderBy(desc(academyRequests.createdAt));
      })(),

      // 7. Alunos por status de matrícula
      (() => {
        const cond: any[] = [];
        if (academyUid) cond.push(eq(enrollments.professorUid, academyUid));
        return db
          .select({
            status: enrollments.status,
            count: sql<number>`count(*)`,
          })
          .from(enrollments)
          .where(cond.length ? and(...cond) : undefined)
          .groupBy(enrollments.status);
      })(),

      // 8. Matrículas por mês
      (() => {
        const cond: any[] = [];
        if (academyUid) cond.push(eq(enrollments.professorUid, academyUid));
        return db
          .select({
            month: sql<string>`to_char(${enrollments.createdAt}, 'YYYY-MM')`,
            count: sql<number>`count(*)`,
          })
          .from(enrollments)
          .where(cond.length ? and(...cond) : undefined)
          .groupBy(sql`to_char(${enrollments.createdAt}, 'YYYY-MM')`)
          .orderBy(sql`to_char(${enrollments.createdAt}, 'YYYY-MM')`);
      })(),

      // 9. Alunos por faixa
      (() => {
        const cond: any[] = [eq(users.role, 'student')];
        if (academyUid) cond.push(
          or(
            eq(users.academyId, academyUid),
            eq(users.uid, academyUid),
          )
        );
        return db
          .select({
            belt: users.belt,
            count: sql<number>`count(*)`,
          })
          .from(users)
          .where(and(...cond))
          .groupBy(users.belt)
          .orderBy(desc(sql`count(*)`));
      })(),

      // 10. Check-ins nos últimos 30 dias
      (() => {
        const cond: any[] = [gte(classCheckIns.createdAt, thirtyDaysAgo)];
        if (academyUid) cond.push(eq(classCheckIns.academyId, academyUid));
        return db
          .select({ count: sql<number>`count(*)` })
          .from(classCheckIns)
          .where(and(...cond));
      })(),

      // 11. Total de alunos (role = 'student')
      (() => {
        const cond: any[] = [eq(users.role, 'student')];
        if (academyUid) cond.push(
          or(
            eq(users.academyId, academyUid),
            eq(users.uid, academyUid),
          )
        );
        return db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(and(...cond));
      })(),

      // 12. Pagamentos inadimplentes (overdue ou pending com dueDate passado)
      (() => {
        const cond: any[] = [
          or(
            eq(payments.status, 'overdue'),
            and(
              eq(payments.status, 'pending'),
              lt(payments.dueDate, now),
              isNotNull(payments.dueDate),
            ),
          ),
        ];
        if (academyUid) cond.push(eq(payments.professorUid, academyUid));
        return db
          .select({
            id: payments.id,
            studentUid: payments.studentUid,
            studentName: payments.studentName,
            amount: payments.amount,
            dueDate: payments.dueDate,
            status: payments.status,
          })
          .from(payments)
          .where(and(...cond))
          .orderBy(desc(payments.dueDate))
          .limit(50);
      })(),

      // 13. Matrículas ativas (para cálculo de inativos)
      (() => {
        const cond: any[] = [eq(enrollments.status, 'active')];
        if (academyUid) cond.push(eq(enrollments.professorUid, academyUid));
        return db
          .select({
            studentUid: enrollments.studentUid,
            studentName: enrollments.studentName,
          })
          .from(enrollments)
          .where(and(...cond));
      })(),

      // 14. Último check-in por aluno ativo
      (() => {
        const cond: any[] = [];
        if (academyUid) cond.push(eq(classCheckIns.academyId, academyUid));
        return db
          .select({
            studentUid: classCheckIns.studentUid,
            lastDate: sql<Date>`max(${classCheckIns.createdAt})`,
          })
          .from(classCheckIns)
          .where(cond.length ? and(...cond) : undefined)
          .groupBy(classCheckIns.studentUid);
      })(),
    ]);

    const projectedMonthly = Number(enrollmentData[0]?.total ?? 0);
    const activeEnrollmentsCount = Number(enrollmentData[0]?.count ?? 0);
    const checkIns30dCount = Number(checkIns30d[0]?.count ?? 0);
    const totalStudentsCount = Number(totalStudents[0]?.count ?? 0);
    const attendanceRate = totalStudentsCount > 0
      ? Math.round((checkIns30dCount / (totalStudentsCount * 30)) * 10000) / 100
      : 0;

    // Mapa de último check-in por aluno
    const lastCheckInMap = new Map<string, Date>();
    for (const ci of lastCheckIns) {
      if (ci.studentUid && ci.lastDate) {
        lastCheckInMap.set(ci.studentUid, ci.lastDate);
      }
    }

    // Alunos inativos (matrícula ativa sem check-in há mais de 14 dias)
    const inactiveStudents = activeEnrollmentsList
      .filter(e => {
        const last = e.studentUid ? lastCheckInMap.get(e.studentUid) : undefined;
        if (!last) return true; // nunca fez check-in
        const daysSinceLast = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLast > 14;
      })
      .map(e => ({
        studentUid: e.studentUid,
        studentName: e.studentName,
        daysSinceLastCheckIn: e.studentUid
          ? Math.floor((now.getTime() - (lastCheckInMap.get(e.studentUid)?.getTime() ?? now.getTime())) / (1000 * 60 * 60 * 24))
          : 999,
      }))
      .sort((a, b) => b.daysSinceLastCheckIn - a.daysSinceLastCheckIn);

    const enrollmentEvolution = enrollmentMonthly.map(r => ({
      month: r.month,
      newEnrollments: Number(r.count),
    }));

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
      leads: leadPipeline.map(l => ({ status: l.status, count: Number(l.count) })),
      revenueMonthly: revenueMonthly.map(r => ({ month: r.month, total: Number(r.total), count: Number(r.count) })),
      recentPayments: recentPayments.map(p => ({
        id: p.id,
        studentName: p.studentName,
        studentUid: p.studentUid,
        amount: Number(p.amount),
        status: p.status,
        dueDate: p.dueDate,
        paidAt: p.paidAt,
      })),
      leadsDetail: leadsDetail.map(l => ({
        id: l.id,
        studentName: l.studentName,
        studentEmail: l.studentEmail,
        studentBelt: l.studentBelt,
        studentPhoto: l.studentPhoto,
        studentUid: l.studentUid,
        status: l.status,
        createdAt: l.createdAt?.toISOString(),
      })),
      studentStats: {
        active: Number(studentStatusCounts.find(s => s.status === 'active')?.count ?? 0),
        suspended: Number(studentStatusCounts.find(s => s.status === 'suspended')?.count ?? 0),
        cancelled: Number(studentStatusCounts.find(s => s.status === 'cancelled')?.count ?? 0),
        total: totalStudentsCount,
      },
      enrollmentEvolution,
      studentsByBelt: beltDist.map(b => ({ belt: b.belt, count: Number(b.count) })),
      attendance: {
        checkInsLast30Days: checkIns30dCount,
        totalStudents: totalStudentsCount,
        rate: attendanceRate,
      },
      inactiveStudents: inactiveStudents.slice(0, 20),
      defaultingStudents: defaultingPayments.map(p => ({
        id: p.id,
        studentUid: p.studentUid,
        studentName: p.studentName,
        amount: Number(p.amount),
        dueDate: p.dueDate,
        status: p.status,
      })),
    });
  }
);

// ─── Community Moderation ─────────────────────────────────────────────────────
// GET /api/admin/community/stats — estatísticas da comunidade
router.get(
  '/community/stats',
  requireAuth,
  requireRole('superadmin', 'admin'),
  async (req: AuthRequest, res) => {
    const [postCount, eventCount, challengeCount, commentCount, topPosters] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(posts),
      db.select({ count: sql<number>`count(*)` }).from(events),
      db.select({ count: sql<number>`count(*)` }).from(challenges),
      db.select({ count: sql<number>`count(*)` }).from(comments),
      db
        .select({
          uid: posts.authorUid,
          count: sql<number>`count(*)`,
        })
        .from(posts)
        .groupBy(posts.authorUid)
        .orderBy(desc(sql`count(*)`))
        .limit(10),
    ]);

    res.json({
      totalPosts: Number(postCount[0]?.count ?? 0),
      totalEvents: Number(eventCount[0]?.count ?? 0),
      totalChallenges: Number(challengeCount[0]?.count ?? 0),
      totalComments: Number(commentCount[0]?.count ?? 0),
      topPosters: topPosters.map(p => ({ uid: p.uid, count: Number(p.count) })),
    });
  }
);

// DELETE /api/admin/community/posts/:id — deletar qualquer post (moderação)
router.delete(
  '/community/posts/:id',
  requireAuth,
  requireRole('superadmin'),
  async (req: AuthRequest, res) => {
    const [existing] = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, req.params.id)).limit(1);
    if (!existing) { res.status(404).json({ error: 'Post não encontrado' }); return; }
    await db.delete(posts).where(eq(posts.id, req.params.id));
    res.json({ success: true });
  }
);

// DELETE /api/admin/community/events/:id — deletar qualquer evento
router.delete(
  '/community/events/:id',
  requireAuth,
  requireRole('superadmin'),
  async (req: AuthRequest, res) => {
    const [existing] = await db.select({ id: events.id }).from(events).where(eq(events.id, req.params.id)).limit(1);
    if (!existing) { res.status(404).json({ error: 'Evento não encontrado' }); return; }
    await db.delete(events).where(eq(events.id, req.params.id));
    res.json({ success: true });
  }
);

// DELETE /api/admin/community/challenges/:id — deletar qualquer desafio
router.delete(
  '/community/challenges/:id',
  requireAuth,
  requireRole('superadmin'),
  async (req: AuthRequest, res) => {
    const [existing] = await db.select({ id: challenges.id }).from(challenges).where(eq(challenges.id, req.params.id)).limit(1);
    if (!existing) { res.status(404).json({ error: 'Desafio não encontrado' }); return; }
    await db.delete(challenges).where(eq(challenges.id, req.params.id));
    res.json({ success: true });
  }
);

// PATCH /api/admin/users/:uid/toggle-moderator — ativar/desativar moderador
router.patch(
  '/users/:uid/toggle-moderator',
  requireAuth,
  requireRole('superadmin'),
  async (req: AuthRequest, res) => {
    const { uid } = req.params;
    const [target] = await db.select({ uid: users.uid, communityModerator: users.communityModerator }).from(users).where(eq(users.uid, uid)).limit(1);
    if (!target) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }
    const newValue = !target.communityModerator;
    await db.update(users).set({ communityModerator: newValue }).where(eq(users.uid, uid));
    res.json({ uid, communityModerator: newValue });
  }
);

// ─── GET /api/admin/plans ────────────────────────────────────────────────────
// Lista todos os planos (superadmin)
router.get(
  '/plans',
  requireAuth,
  requireRole('superadmin'),
  async (_req: AuthRequest, res) => {
    const rows = await db.select().from(plans).orderBy(plans.price);
    res.json(rows);
  }
);

// ─── POST /api/admin/plans ───────────────────────────────────────────────────
// Cria novo plano (superadmin)
router.post(
  '/plans',
  requireAuth,
  requireRole('superadmin'),
  async (req: AuthRequest, res) => {
    const { name, slug, description, price, roleAssigned, features, trialDays } = req.body as {
      name: string; slug: string; description?: string; price: number;
      roleAssigned: string; features?: string[]; trialDays?: number;
    };
    if (!name || !slug || price == null || !roleAssigned) {
      res.status(400).json({ error: 'name, slug, price e roleAssigned são obrigatórios' });
      return;
    }
    const id = nanoid();
    await db.insert(plans).values({ id, name, slug, description, price, roleAssigned, features: features || [], trialDays: trialDays ?? 0 });
    const [plan] = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
    res.status(201).json(plan);
  }
);

// ─── PUT /api/admin/plans/:id ─────────────────────────────────────────────────
// Atualiza plano (superadmin)
router.put(
  '/plans/:id',
  requireAuth,
  requireRole('superadmin'),
  async (req: AuthRequest, res) => {
    const [existing] = await db.select().from(plans).where(eq(plans.id, req.params.id)).limit(1);
    if (!existing) { res.status(404).json({ error: 'Plano não encontrado' }); return; }
    const { name, slug, description, price, roleAssigned, features, trialDays, isActive } = req.body as {
      name?: string; slug?: string; description?: string; price?: number;
      roleAssigned?: string; features?: string[]; trialDays?: number; isActive?: boolean;
    };
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price;
    if (roleAssigned !== undefined) updates.roleAssigned = roleAssigned;
    if (features !== undefined) updates.features = features;
    if (trialDays !== undefined) updates.trialDays = trialDays;
    if (isActive !== undefined) updates.isActive = isActive;
    await db.update(plans).set(updates).where(eq(plans.id, req.params.id));
    const [updated] = await db.select().from(plans).where(eq(plans.id, req.params.id)).limit(1);
    res.json(updated);
  }
);

// ─── DELETE /api/admin/plans/:id ──────────────────────────────────────────────
// Exclui plano (superadmin, bloqueia se houver assinaturas ativas)
router.delete(
  '/plans/:id',
  requireAuth,
  requireRole('superadmin'),
  async (req: AuthRequest, res) => {
    const [existing] = await db.select().from(plans).where(eq(plans.id, req.params.id)).limit(1);
    if (!existing) { res.status(404).json({ error: 'Plano não encontrado' }); return; }
    const [activeCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptions)
      .where(and(eq(subscriptions.planId, req.params.id), eq(subscriptions.status, 'active')));
    if (activeCount.count > 0) {
      res.status(400).json({ error: 'Há assinaturas ativas neste plano. Desative-o em vez de excluir.' });
      return;
    }
    await db.delete(plans).where(eq(plans.id, req.params.id));
    res.json({ success: true });
  }
);

// ─── POST /api/admin/users/:uid/give-trial ───────────────────────────────────
// Concede 30 dias grátis para um usuário (superadmin)
router.post(
  '/users/:uid/give-trial',
  requireAuth,
  requireRole('superadmin'),
  async (req: AuthRequest, res) => {
    const { uid } = req.params;
    const [target] = await db.select({ uid: users.uid, trialEndsAt: users.trialEndsAt }).from(users).where(eq(users.uid, uid)).limit(1);
    if (!target) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);
    await db.update(users).set({ trialEndsAt }).where(eq(users.uid, uid));
    res.json({ uid, trialEndsAt: trialEndsAt.toISOString() });
  }
);

// ─── GET /api/admin/settings ────────────────────────────────────────────────
// Retorna todas as configurações (superadmin)
router.get(
  '/settings',
  requireAuth,
  requireRole('superadmin'),
  async (_req: AuthRequest, res) => {
    const rows = await db.select().from(settings);
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;
    res.json(map);
  }
);

// ─── PUT /api/admin/settings ────────────────────────────────────────────────
// Atualiza configurações (superadmin)
router.put(
  '/settings',
  requireAuth,
  requireRole('superadmin'),
  async (req: AuthRequest, res) => {
    const data = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(data)) {
      await db
        .insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value } });
    }
    const rows = await db.select().from(settings);
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;
    res.json(map);
  }
);

function sanitize(u: typeof users.$inferSelect) {
  const { passwordHash: _, ...rest } = u as any;
  return rest;
}

export default router;
