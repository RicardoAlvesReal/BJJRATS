import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { eq, sql, and, or, gte, lt, desc, isNotNull, ilike, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, trainings, classCheckIns, payments, enrollments, academyRequests, posts, comments, events, challenges, plans, subscriptions, settings } from '../db/schema.js';
import {
  requireAuth,
  requireRole,
  ROLE_HIERARCHY,
  type AuthRequest,
} from '../middleware/auth.js';
import {
  getCompanyEmailSettings,
  saveCompanyEmailSettings,
  sendCompanyEmail,
} from '../services/companyEmail.js';

const router = Router();

// Retorna true se o ator pode gerenciar o targetRole
function canManage(actorRole: string, targetRole: string): boolean {
  return (ROLE_HIERARCHY[actorRole] ?? 0) > (ROLE_HIERARCHY[targetRole] ?? 0);
}

function toBoolean(value: unknown) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

function normalizeAssignableRole(role: unknown): string {
  if (role === 'admin') return 'academy';
  if (role === 'superadmin' || role === 'academy' || role === 'professor' || role === 'student') return role;
  return 'student';
}

function normalizePlanRole(role: unknown): 'academy' | 'professor' | 'student' | null {
  if (role === 'admin') return 'academy';
  if (role === 'academy' || role === 'professor' || role === 'student') return role;
  return null;
}

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// Lista usuários com role abaixo do solicitante
router.get(
  '/users',
  requireAuth,
  requireRole('superadmin'),
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
        isAcademyAdmin: users.isAcademyAdmin,
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

router.get(
  '/email-automation',
  requireAuth,
  requireRole('superadmin'),
  async (_req: AuthRequest, res) => {
    const config = await getCompanyEmailSettings();
    res.json(config);
  },
);

router.put(
  '/email-automation',
  requireAuth,
  requireRole('superadmin'),
  async (req: AuthRequest, res) => {
    const config = await saveCompanyEmailSettings(req.body || {});
    res.json(config);
  },
);

router.post(
  '/email-automation/test',
  requireAuth,
  requireRole('superadmin'),
  async (req: AuthRequest, res) => {
    const to = typeof req.body?.to === 'string' && req.body.to.trim()
      ? req.body.to.trim()
      : '';

    const [admin] = await db.select({ email: users.email }).from(users).where(eq(users.uid, req.userId!)).limit(1);
    const recipient = to || admin?.email;

    if (!recipient) {
      res.status(400).json({ error: 'Informe um e-mail para teste.' });
      return;
    }

    const result = await sendCompanyEmail({
      to: [recipient],
      subject: 'BJJRats - Teste de automacao de e-mail',
      text: 'Este e um e-mail de teste enviado pela automacao da empresa no BJJRats.',
      html: '<p>Este e um e-mail de teste enviado pela automacao da empresa no BJJRats.</p>',
      metadata: { source: 'admin_email_automation_test', adminUid: req.userId },
    });

    res.json({
      success: result.sent,
      provider: result.provider,
      recipients: result.recipients.length,
    });
  },
);

// ─── POST /api/admin/users ────────────────────────────────────────────────────
// Cria um usuário com role abaixo do solicitante
router.post(
  '/users',
  requireAuth,
  requireRole('superadmin'),
  async (req: AuthRequest, res) => {
    const actorRole = req.userRole!;
    const {
      name, email, password,
      role = 'student',
      belt = 'Branca',
      ...rest
    } = req.body as Record<string, unknown>;
    const requestedAcademy = role === 'academy' || role === 'admin' || toBoolean(rest.isAcademyAdmin);
    const normalizedRole = requestedAcademy ? 'academy' : normalizeAssignableRole(role);
    const isAcademyAdmin = normalizedRole === 'academy';

    if (!name || !email || !password) {
      res.status(400).json({ error: 'name, email e password são obrigatórios' });
      return;
    }

    if (!canManage(actorRole, normalizedRole)) {
      res.status(403).json({ error: `Você não pode criar usuários com role "${role}"` });
      return;
    }

    const existing = await db
      .select({ uid: users.uid })
      .from(users)
      .where(eq(users.email, String(email).toLowerCase()))
      .limit(1);

    if (existing.length) {
      res.status(409).json({ error: 'E-mail já cadastrado' });
      return;
    }

    const uid          = nanoid();
    const passwordHash = await bcrypt.hash(String(password), 10);

    await db.insert(users).values({
      uid,
      name:           String(name),
      email:          String(email).toLowerCase(),
      passwordHash,
      belt:           String(belt || 'Branca'),
      role:           normalizedRole,
      isAcademyAdmin,
      academy:        rest.academy ? String(rest.academy) : '',
      academyId:      rest.academyId ? String(rest.academyId) : null,
      professor:      rest.professor ? String(rest.professor) : '',
      academyName:    rest.academyName ? String(rest.academyName) : null,
      academyAddress: rest.academyAddress ? String(rest.academyAddress) : null,
      academyCity:    rest.academyCity ? String(rest.academyCity) : null,
      academyState:   rest.academyState ? String(rest.academyState) : null,
      academyCnpj:    rest.academyCnpj ? String(rest.academyCnpj) : null,
      academyCep:     rest.academyCep ? String(rest.academyCep) : null,
      academyNumber:  rest.academyNumber ? String(rest.academyNumber) : null,
      academyNeighborhood: rest.academyNeighborhood ? String(rest.academyNeighborhood) : null,
      academyComplement:    rest.academyComplement ? String(rest.academyComplement) : null,
      phone:          rest.phone ? String(rest.phone) : null,
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
  requireRole('superadmin'),
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
      const normalizedNewRole = normalizeAssignableRole(newRole);
      if (!canManage(actorRole, normalizedNewRole)) {
        res.status(403).json({ error: `Você não pode atribuir o role "${newRole}"` });
        return;
      }
      updates.role = normalizedNewRole;
      updates.isAcademyAdmin = normalizedNewRole === 'academy';
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
  requireRole('superadmin'),
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
  requireRole('superadmin'),
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
// CRM do superadmin: métricas de assinatura da plataforma (receita SaaS)
router.get(
  '/crm',
  requireAuth,
  requireRole('superadmin'),
  async (_req: AuthRequest, res) => {
    const now = new Date();

    const [
      subCounts,
      activeSubs,
      revenueMonthly,
      recentSubPayments,
      pastDueSubs,
      allSubs,
    ] = await Promise.all([
      // 1. Contagem de assinaturas por status
      db
        .select({
          status: subscriptions.status,
          count: sql<number>`count(*)`,
        })
        .from(subscriptions)
        .groupBy(subscriptions.status),

      // 2. Assinaturas ativas para MRR (com plano)
      db
        .select({
          id: subscriptions.id,
          userUid: subscriptions.userUid,
          planId: subscriptions.planId,
          status: subscriptions.status,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
          planPrice: plans.price,
          planName: plans.name,
        })
        .from(subscriptions)
        .innerJoin(plans, eq(plans.id, subscriptions.planId))
        .where(or(
          eq(subscriptions.status, 'active'),
          eq(subscriptions.status, 'trial'),
        )),

      // 3. Faturamento mensal de assinaturas (pagos)
      (() => {
        // Como subscriptions não tem payment history local, usamos os períodos
        // Agrupamos por mês de criação para evolução de assinantes
        return db
          .select({
            month: sql<string>`to_char(${subscriptions.createdAt}, 'YYYY-MM')`,
            count: sql<number>`count(*)`,
          })
          .from(subscriptions)
          .where(eq(subscriptions.status, 'active'))
          .groupBy(sql`to_char(${subscriptions.createdAt}, 'YYYY-MM')`)
          .orderBy(sql`to_char(${subscriptions.createdAt}, 'YYYY-MM')`);
      })(),

      // 4. Assinaturas recentes (últimas 20)
      db
        .select({
          id: subscriptions.id,
          userUid: subscriptions.userUid,
          planId: subscriptions.planId,
          status: subscriptions.status,
          planName: plans.name,
          planPrice: plans.price,
          createdAt: subscriptions.createdAt,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
        })
        .from(subscriptions)
        .leftJoin(plans, eq(plans.id, subscriptions.planId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(20),

      // 5. Assinaturas inadimplentes (past_due)
      db
        .select({
          id: subscriptions.id,
          userUid: subscriptions.userUid,
          planId: subscriptions.planId,
          status: subscriptions.status,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
          planName: plans.name,
          planPrice: plans.price,
        })
        .from(subscriptions)
        .leftJoin(plans, eq(plans.id, subscriptions.planId))
        .where(eq(subscriptions.status, 'past_due'))
        .orderBy(desc(subscriptions.currentPeriodEnd)),

      // 6. Todas as assinaturas (para calcular totais)
      db
        .select({
          id: subscriptions.id,
          status: subscriptions.status,
          planId: subscriptions.planId,
          planPrice: plans.price,
        })
        .from(subscriptions)
        .leftJoin(plans, eq(plans.id, subscriptions.planId)),
    ]);

    // MRR = soma dos preços dos planos ativos
    const mrr = activeSubs
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + (Number(s.planPrice) || 0), 0);

    // Total de assinantes (active + trial + past_due)
    const activeCount = Number(subCounts.find(s => s.status === 'active')?.count ?? 0);
    const trialCount = Number(subCounts.find(s => s.status === 'trial')?.count ?? 0);
    const pastDueCount = Number(subCounts.find(s => s.status === 'past_due')?.count ?? 0);
    const cancelledCount = Number(subCounts.find(s => s.status === 'cancelled')?.count ?? 0);

    res.json({
      revenue: {
        mrr,
        projectedAnnual: mrr * 12,
        totalBilled: 0, // Não aplicável para plataforma
        totalPaid: 0,
        totalPending: 0,
        totalOverdue: 0,
        projectedMonthly: mrr,
        activeEnrollments: activeCount + trialCount,
      },
      subscribers: {
        active: activeCount,
        trial: trialCount,
        pastDue: pastDueCount,
        cancelled: cancelledCount,
        total: activeCount + trialCount + pastDueCount,
      },
      revenueMonthly: revenueMonthly.map(r => ({
        month: r.month,
        total: 0, // sem dados de pagamento local
        count: Number(r.count),
      })),
      recentSubscriptions: recentSubPayments.map(s => ({
        id: s.id,
        userUid: s.userUid,
        planName: s.planName || '—',
        planPrice: Number(s.planPrice) || 0,
        status: s.status,
        createdAt: s.createdAt?.toISOString() || null,
        periodEnd: s.currentPeriodEnd?.toISOString() || null,
      })),
      defaultingSubscribers: pastDueSubs.map(s => ({
        id: s.id,
        userUid: s.userUid,
        planName: s.planName || '—',
        planPrice: Number(s.planPrice) || 0,
        periodEnd: s.currentPeriodEnd?.toISOString() || null,
      })),
      // Campos mantidos para compatibilidade com tipo existente (não usados pelo superadmin)
      leads: [],
      revenueMonthly: revenueMonthly.map(r => ({ month: r.month, total: 0, count: Number(r.count) })),
      recentPayments: [],
      leadsDetail: [],
      studentStats: { active: activeCount, suspended: pastDueCount, cancelled: cancelledCount, total: activeCount + trialCount + pastDueCount },
      enrollmentEvolution: revenueMonthly.map(r => ({ month: r.month, newEnrollments: Number(r.count) })),
      studentsByBelt: [],
      attendance: { checkInsLast30Days: 0, totalStudents: activeCount + trialCount, rate: 0 },
      inactiveStudents: [],
      defaultingStudents: [],
    });
  }
);

// ─── GET /api/admin/metrics ────────────────────────────────────────────────────
// Métricas de economia da plataforma: quanto academias/professores estão lucrando
router.get(
  '/metrics',
  requireAuth,
  requireRole('superadmin'),
  async (_req: AuthRequest, res) => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [
      paymentTotals,
      coveredCombos,
      duplicateAmounts,
      monthlyRevenue,
      topEarners,
      enrollmentStats,
      totalRowCount,
    ] = await Promise.all([
      // Totais gerais de pagamentos (bruto, sem deduplicar)
      db
        .select({
          totalPending: sql<number>`coalesce(sum(${payments.amount}::double precision) filter (where ${payments.status} = 'pending'), 0)`,
          totalPaid:    sql<number>`coalesce(sum(${payments.amount}::double precision) filter (where ${payments.status} = 'paid'), 0)`,
          totalOverdue: sql<number>`coalesce(sum(${payments.amount}::double precision) filter (where ${payments.status} = 'overdue'), 0)`,
          countPaid:    sql<number>`count(*) filter (where ${payments.status} = 'paid')`,
          countPending: sql<number>`count(*) filter (where ${payments.status} = 'pending')`,
          countOverdue: sql<number>`count(*) filter (where ${payments.status} = 'overdue')`,
        })
        .from(payments),

      // Combinações (student+prof+month) que já têm pagamento pago — overdue/pending do mesmo mês são duplicatas
      db
        .select({
          studentUid: payments.studentUid,
          professorUid: payments.professorUid,
          month: sql<string>`to_char(${payments.dueDate}, 'YYYY-MM')`,
        })
        .from(payments)
        .where(eq(payments.status, 'paid'))
        .groupBy(payments.studentUid, payments.professorUid, sql`to_char(${payments.dueDate}, 'YYYY-MM')`),

      // Soma dos overdue/pending que são duplicatas (já têm pago no mesmo mês)
      db.execute(sql`
        SELECT
          coalesce(sum(p.amount) filter (where p.status = 'overdue'), 0) as total_overdue_dup,
          coalesce(sum(p.amount) filter (where p.status = 'pending'), 0) as total_pending_dup,
          count(*) filter (where p.status = 'overdue') as count_overdue_dup,
          count(*) filter (where p.status = 'pending') as count_pending_dup
        FROM payments p
        INNER JOIN (
          SELECT student_uid, professor_uid, to_char(due_date, 'YYYY-MM') as m
          FROM payments
          WHERE status = 'paid'
          GROUP BY student_uid, professor_uid, to_char(due_date, 'YYYY-MM')
        ) paid ON paid.student_uid = p.student_uid
              AND paid.professor_uid = p.professor_uid
              AND to_char(p.due_date, 'YYYY-MM') = paid.m
        WHERE p.status IN ('overdue', 'pending')
      `),

      // Receita mensal (pagos) por mês
      db
        .select({
          month: sql<string>`to_char(${payments.paidAt}, 'YYYY-MM')`,
          total: sql<number>`coalesce(sum(${payments.amount}::double precision), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(payments)
        .where(and(eq(payments.status, 'paid'), isNotNull(payments.paidAt)))
        .groupBy(sql`to_char(${payments.paidAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${payments.paidAt}, 'YYYY-MM')`),

      // Top earners (professores e academias)
      db
        .select({
          professorUid: payments.professorUid,
          totalPaid: sql<number>`coalesce(sum(${payments.amount}::double precision), 0)`,
          countPaid: sql<number>`count(*)`,
        })
        .from(payments)
        .where(eq(payments.status, 'paid'))
        .groupBy(payments.professorUid)
        .orderBy(desc(sql`coalesce(sum(${payments.amount}::double precision), 0)`))
        .limit(20),

      // Estatísticas de matrículas
      db
        .select({
          status: enrollments.status,
          count: sql<number>`count(*)`,
          totalMonthly: sql<number>`coalesce(sum(${enrollments.monthlyFee}::double precision), 0)`,
        })
        .from(enrollments)
        .groupBy(enrollments.status),

      // Contagem total de pagamentos (para debug)
      db
        .select({ count: sql<number>`count(*)` })
        .from(payments),
    ]);

    // Busca nomes dos top earners
    const topEarnerUids = topEarners.map(e => e.professorUid);
    const earnersMap = new Map<string, { name: string; academyName: string | null; role: string | null }>();
    if (topEarnerUids.length > 0) {
      const earnerUsers = await db
        .select({
          uid: users.uid,
          name: users.name,
          academyName: users.academyName,
          role: users.role,
        })
        .from(users)
        .where(inArray(users.uid, topEarnerUids));
      for (const u of earnerUsers) {
        earnersMap.set(u.uid, { name: u.name, academyName: u.academyName, role: u.role });
      }
    }

    const totalRawPending = Number(paymentTotals[0]?.totalPending ?? 0);
    const totalPaidAll = Number(paymentTotals[0]?.totalPaid ?? 0);
    const totalRawOverdue = Number(paymentTotals[0]?.totalOverdue ?? 0);
    const rawCountOverdue = Number(paymentTotals[0]?.countOverdue ?? 0);
    const rawCountPending = Number(paymentTotals[0]?.countPending ?? 0);

    // Deduplica: remove overdue/pending que já têm pago no mesmo mês
    const dupRow = (duplicateAmounts as any[])?.[0] || {};
    const dupOverdue = Number(dupRow?.total_overdue_dup ?? 0);
    const dupPending = Number(dupRow?.total_pending_dup ?? 0);
    const dupCountOverdue = Number(dupRow?.count_overdue_dup ?? 0);
    const dupCountPending = Number(dupRow?.count_pending_dup ?? 0);

    const totalPendingAll = totalRawPending - dupPending;
    const totalOverdueAll = totalRawOverdue - dupOverdue;
    const countPendingAll = rawCountPending - dupCountPending;
    const countOverdueAll = rawCountOverdue - dupCountOverdue;

    // Faturado = apenas pago
    const totalBilledAll = totalPaidAll;
    const monthlyProjected = Number(enrollmentStats.find(s => s.status === 'active')?.totalMonthly ?? 0);

    res.json({
      overview: {
        totalBilled: totalBilledAll,
        totalPaid: totalPaidAll,
        totalPending: totalPendingAll,
        totalOverdue: totalOverdueAll,
        countPaid: Number(paymentTotals[0]?.countPaid ?? 0),
        countPending: countPendingAll,
        countOverdue: countOverdueAll,
        totalRows: Number(totalRowCount[0]?.count ?? 0),
        dupOverdue: dupOverdue,
        dupPending: dupPending,
        monthlyProjected,
        paidRate: totalBilledAll > 0 ? Math.round((totalPaidAll / totalBilledAll) * 100) : 0,
      },
      monthlyRevenue: monthlyRevenue.map(r => ({
        month: r.month,
        total: Number(r.total),
        count: Number(r.count),
      })),
      topEarners: topEarners.map(e => {
        const info = earnersMap.get(e.professorUid);
        const displayName = (info?.academyName) || info?.name || e.professorUid;
        return {
          professorUid: e.professorUid,
          name: displayName,
          role: info?.role || null,
          totalPaid: Number(e.totalPaid),
          countPaid: Number(e.countPaid),
        };
      }),
      enrollmentBreakdown: enrollmentStats.map(s => ({
        status: s.status,
        count: Number(s.count),
        monthly: Number(s.totalMonthly),
      })),
    });
  }
);

// ─── Community Moderation ─────────────────────────────────────────────────────
// GET /api/admin/community/stats — estatísticas da comunidade
router.get(
  '/community/stats',
  requireAuth,
  requireRole('superadmin'),
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
    const normalizedRoleAssigned = normalizePlanRole(roleAssigned);
    if (!normalizedRoleAssigned) {
      res.status(400).json({ error: 'roleAssigned invalido' });
      return;
    }
    const id = nanoid();
    await db.insert(plans).values({ id, name, slug, description, price, roleAssigned: normalizedRoleAssigned, features: features || [], trialDays: trialDays ?? 0 });
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
    if (roleAssigned !== undefined) {
      const normalizedRoleAssigned = normalizePlanRole(roleAssigned);
      if (!normalizedRoleAssigned) {
        res.status(400).json({ error: 'roleAssigned invalido' });
        return;
      }
      updates.roleAssigned = normalizedRoleAssigned;
    }
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
