import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { signToken, requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

function toNullableNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role = 'student', belt = 'Branca', ...rest } = req.body as Record<string, string>;
  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email e password são obrigatórios' });
    return;
  }
  const existing = await db.select({ uid: users.uid }).from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (existing.length) {
    res.status(409).json({ error: 'E-mail já cadastrado' });
    return;
  }
  const uid = nanoid();
  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({
    uid,
    name,
    email: email.toLowerCase(),
    passwordHash,
    belt,
    role,
    academy:       rest.academy        || '',
    academyId:     rest.academyId      || null,
    professor:     rest.professor      || '',
    dob:           rest.dob            || null,
    sex:           rest.sex            || null,
    weightKg:      rest.weightKg       || null,
    heightCm:      rest.heightCm       || null,
    bjjSince:      rest.bjjSince       || null,
    stripes:       Number(rest.stripes) || 0,
    academyName:   rest.academyName    || null,
    academyAddress:rest.academyAddress || null,
    academyCity:   rest.academyCity    || null,
    academyState:  rest.academyState   || null,
    academyLatitude:  toNullableNumber(rest.academyLatitude),
    academyLongitude: toNullableNumber(rest.academyLongitude),
  });
  const [user] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
  const token = signToken(uid, user.role ?? 'student', user.communityModerator ?? false);
  res.status(201).json({ token, user: sanitize(user) });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ error: 'email e password são obrigatórios' });
    return;
  }
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!user) {
    res.status(401).json({ error: 'Credenciais inválidas' });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Credenciais inválidas' });
    return;
  }
  const token = signToken(user.uid, user.role ?? 'student', user.communityModerator ?? false);
  res.json({ token, user: sanitize(user) });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select().from(users).where(eq(users.uid, req.userId!)).limit(1);
  if (!user) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }
  res.json(sanitize(user));
});

// POST /api/auth/reset-password  (stub — implementar via emailService)
router.post('/reset-password', async (req, res) => {
  const { email } = req.body as { email: string };
  if (!email) { res.status(400).json({ error: 'email é obrigatório' }); return; }
  // TODO: gerar token temporário e enviar por e-mail
  res.json({ message: 'Se o e-mail existir, um link de redefinição será enviado.' });
});

// Não expõe passwordHash ao cliente
function sanitize(user: typeof users.$inferSelect) {
  const { passwordHash: _, ...safe } = user as any;
  return safe;
}

export default router;
