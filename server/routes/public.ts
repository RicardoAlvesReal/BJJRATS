import { Router } from 'express';
import { eq, and, ilike, or, ne, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { classSchedules, enrollments, notifications, users } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getPaymentIntegration, toPublicPaymentIntegration } from '../services/paymentIntegrations.js';

const router = Router();

const WEEKDAYS = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

// GET /api/public/professors?search=term&role=professor
router.get('/professors', async (req, res) => {
  const { search, role } = req.query as Record<string, string>;
  const roleFilter = role === 'academy' || role === 'admin' ? or(eq(users.role, 'academy'), eq(users.role, 'admin'), eq(users.isAcademyAdmin, true))
    : role === 'professor' ? and(eq(users.role, 'professor'), or(eq(users.isAcademyAdmin, false), isNull(users.isAcademyAdmin)))
    : or(eq(users.role, 'professor'), eq(users.role, 'academy'), eq(users.role, 'admin'), eq(users.isAcademyAdmin, true));
  const conditions = [ne(users.role, 'superadmin'), roleFilter];
  if (search) {
    conditions.push(
      or(
        ilike(users.academyName, `%${search}%`),
        ilike(users.academy, `%${search}%`),
        ilike(users.name, `%${search}%`),
        ilike(users.academyCity, `%${search}%`),
      )
    );
  }
  const result = await db
    .select({
      uid: users.uid,
      name: users.name,
      academy: users.academy,
      academyName: users.academyName,
      academyCity: users.academyCity,
      academyState: users.academyState,
      academyCep: users.academyCep,
      academyAddress: users.academyAddress,
      academyNumber: users.academyNumber,
      academyNeighborhood: users.academyNeighborhood,
      photo: users.photo,
      academyLogoUrl: users.academyLogoUrl,
      professorPhotoUrl: users.professorPhotoUrl,
      trialRequestsEnabled: users.trialRequestsEnabled,
      role: users.role,
      isAcademyAdmin: users.isAcademyAdmin,
    })
    .from(users)
    .where(and(...conditions))
    .limit(50);
  res.json(result);
});

// GET /api/public/trial/:kind/:uid
router.get('/trial/:kind/:uid', async (req, res) => {
  const kind = req.params.kind === 'professor' ? 'professor' : 'academy';
  const [target] = await db
    .select({
      uid: users.uid,
      name: users.name,
      photo: users.photo,
      phone: users.phone,
      address: users.address,
      role: users.role,
      isAcademyAdmin: users.isAcademyAdmin,
      academy: users.academy,
      academyName: users.academyName,
      academyAddress: users.academyAddress,
      academyCity: users.academyCity,
      academyState: users.academyState,
      academyLogoUrl: users.academyLogoUrl,
      professorPhotoUrl: users.professorPhotoUrl,
      trialRequestsEnabled: users.trialRequestsEnabled,
    })
    .from(users)
    .where(and(eq(users.uid, req.params.uid), ne(users.role, 'superadmin')))
    .limit(1);

  if (!target) {
    res.status(404).json({ error: 'Destino nao encontrado' });
    return;
  }

  const isAcademy = kind === 'academy';
  const displayName = isAcademy
    ? (target.academyName || target.academy || target.name)
    : target.name;

  if (!displayName) {
    res.status(404).json({ error: 'Destino nao encontrado' });
    return;
  }

  if (target.trialRequestsEnabled === false) {
    res.status(403).json({ error: 'Aula experimental indisponivel no momento' });
    return;
  }

  const scheduleRows = await db
    .select({
      dayOfWeek: classSchedules.dayOfWeek,
      startTime: classSchedules.startTime,
      endTime: classSchedules.endTime,
      className: classSchedules.className,
      modality: classSchedules.modality,
    })
    .from(classSchedules)
    .where(isAcademy ? eq(classSchedules.academyId, target.uid) : eq(classSchedules.professorUid, target.uid))
    .limit(12);

  res.json({
    id: target.uid,
    kind,
    ownerUid: target.uid,
    name: displayName,
    logo: isAcademy ? (target.academyLogoUrl || target.photo) : (target.professorPhotoUrl || target.photo),
    address: isAcademy ? (target.academyAddress || target.address) : target.address,
    city: target.academyCity,
    state: target.academyState,
    phone: target.phone,
    schedules: scheduleRows.map(row => ({
      day: row.dayOfWeek === null || row.dayOfWeek === undefined ? 'Dia a combinar' : WEEKDAYS[row.dayOfWeek] || 'Dia a combinar',
      time: [row.startTime, row.endTime].filter(Boolean).join(' - '),
      modality: row.modality || row.className || undefined,
    })),
  });
});

// POST /api/public/trial-requests
router.post('/trial-requests', async (req, res) => {
  const body = req.body as {
    targetKind?: string;
    targetUid?: string;
    name?: string;
    email?: string;
    phone?: string;
    belt?: string;
    age?: string;
    message?: string;
    preferredDay?: string;
  };

  const targetKind = body.targetKind === 'professor' ? 'professor' : 'academy';
  const name = body.name?.trim();
  const phone = body.phone?.trim();

  if (!body.targetUid || !name || !phone) {
    res.status(400).json({ error: 'Nome, telefone e destino sao obrigatorios' });
    return;
  }

  const [target] = await db
    .select({
      uid: users.uid,
      name: users.name,
      role: users.role,
      academy: users.academy,
      academyName: users.academyName,
      trialRequestsEnabled: users.trialRequestsEnabled,
    })
    .from(users)
    .where(and(eq(users.uid, body.targetUid), ne(users.role, 'superadmin')))
    .limit(1);

  if (!target) {
    res.status(404).json({ error: 'Destino nao encontrado' });
    return;
  }

  if (target.trialRequestsEnabled === false) {
    res.status(403).json({ error: 'Aula experimental indisponivel no momento' });
    return;
  }

  const targetName = targetKind === 'academy'
    ? (target.academyName || target.academy || target.name)
    : target.name;

  const message = targetKind === 'academy'
    ? `${name} solicitou aula experimental na academia ${targetName}. WhatsApp: ${phone}`
    : `${name} solicitou aula experimental com o professor ${targetName}. WhatsApp: ${phone}`;

  await db.insert(notifications).values({
    id: nanoid(),
    toUid: target.uid,
    fromName: name,
    type: 'trial_request',
    message,
    data: {
      source: 'public_trial',
      targetKind,
      targetName,
      name,
      email: body.email?.trim() || null,
      phone,
      belt: body.belt || null,
      age: body.age?.trim() || null,
      preferredDay: body.preferredDay?.trim() || null,
      message: body.message?.trim() || null,
      status: 'pending',
    },
    read: false,
  });

  res.status(201).json({ success: true });
});

// GET /api/public/payment-methods/:ownerUid
// Retorna métodos de pagamento públicos de uma academia/professor
// Requer autenticação — o aluno precisa ter matrícula ativa com o owner
router.get('/payment-methods/:ownerUid', requireAuth, async (req: AuthRequest, res) => {
  const ownerUid = req.params.ownerUid;

  // Verifica se o aluno logado tem matrícula ativa com este professor/academia
  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.studentUid, req.userId!),
        eq(enrollments.professorUid, ownerUid),
        eq(enrollments.status, 'active'),
      ),
    )
    .limit(1);

  if (!enrollment) {
    res.status(403).json({ error: 'Sem matrícula ativa com este professor/academia' });
    return;
  }

  const integration = await getPaymentIntegration(ownerUid);
  res.json(toPublicPaymentIntegration(integration));
});

export default router;
