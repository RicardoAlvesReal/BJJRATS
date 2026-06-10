import { Router } from 'express';
import { eq, ne, and, or, ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/users?role=professor&search=term
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { role, search, academyId } = req.query as Record<string, string>;
  let query = db.select({
    uid: users.uid, name: users.name, email: users.email, phone: users.phone, photo: users.photo,
    belt: users.belt, stripes: users.stripes, academy: users.academy,
    academyId: users.academyId, role: users.role, xp: users.xp,
    totalTrainings: users.totalTrainings, totalMinutes: users.totalMinutes,
    streak: users.streak, academyName: users.academyName, academyCity: users.academyCity,
    academyState: users.academyState, academyAddress: users.academyAddress,
    academyLatitude: users.academyLatitude, academyLongitude: users.academyLongitude,
    academyLogoUrl: users.academyLogoUrl, professorPhotoUrl: users.professorPhotoUrl,
    trialRequestsEnabled: users.trialRequestsEnabled,
    isAcademyAdmin: users.isAcademyAdmin,
    athleteType: users.athleteType, bjjSince: users.bjjSince,
  }).from(users).$dynamic();

  const conditions = [ne(users.role, 'superadmin')];
  if (role)      conditions.push(eq(users.role, role));
  if (academyId) conditions.push(eq(users.academyId, academyId));
  if (search) {
    const searchCondition = or(ilike(users.name, `%${search}%`), ilike(users.academyName, `%${search}%`), ilike(users.academyCity, `%${search}%`));
    if (searchCondition) conditions.push(searchCondition);
  }

  if (conditions.length > 0) {
    const result = await query.where(and(...conditions));
    res.json(result);
  } else {
    res.json(await query);
  }
});

// GET /api/users/:uid
router.get('/:uid', requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select().from(users).where(eq(users.uid, req.params.uid)).limit(1);
  if (!user) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }
  const { passwordHash: _, ...safe } = user as any;
  res.json(safe);
});

// PATCH /api/users/:uid
router.patch('/:uid', requireAuth, async (req: AuthRequest, res) => {
  if (req.userId !== req.params.uid) {
    res.status(403).json({ error: 'Proibido' });
    return;
  }
  const {
    passwordHash: _ph, uid: _uid, email: _email, createdAt: _c, ...allowed
  } = req.body;
  await db.update(users).set(allowed).where(eq(users.uid, req.params.uid));
  const [updated] = await db.select().from(users).where(eq(users.uid, req.params.uid)).limit(1);
  const { passwordHash: __, ...safe } = updated as any;
  res.json(safe);
});

export default router;
