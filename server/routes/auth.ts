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

function toBoolean(value: unknown) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

function normalizeEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

function normalizeWhatsApp(value: unknown) {
  return String(value ?? '').trim();
}

function isValidWhatsApp(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function normalizePublicRole(role: unknown): 'student' | 'professor' | 'academy' {
  if (role === 'academy' || role === 'admin') return 'academy';
  if (role === 'professor') return 'professor';
  return 'student';
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role = 'student', belt = 'Branca', ...rest } = req.body as Record<string, unknown>;
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizeWhatsApp(rest.phone);

  if (!name || !normalizedEmail || !password || !normalizedPhone) {
    res.status(400).json({ error: 'name, email, password e WhatsApp sao obrigatorios' });
    return;
  }

  if (!isValidEmail(normalizedEmail)) {
    res.status(400).json({ error: 'Informe um e-mail valido.' });
    return;
  }

  if (!isValidWhatsApp(normalizedPhone)) {
    res.status(400).json({ error: 'Informe um WhatsApp valido com DDD.' });
    return;
  }

  const requestedAcademy = role === 'academy' || role === 'admin' || toBoolean(rest.isAcademyAdmin);
  const normalizedRole = requestedAcademy ? 'academy' : normalizePublicRole(role);
  const isAcademyAdmin = normalizedRole === 'academy';

  const existing = await db.select({ uid: users.uid }).from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (existing.length) {
    res.status(409).json({ error: 'E-mail ja cadastrado' });
    return;
  }

  const uid = nanoid();
  const passwordHash = await bcrypt.hash(String(password), 10);
  await db.insert(users).values({
    uid,
    name: String(name),
    email: normalizedEmail,
    passwordHash,
    belt: String(belt || 'Branca'),
    phone: normalizedPhone,
    role: normalizedRole,
    isAcademyAdmin,
    academy: String(rest.academy || ''),
    academyId: rest.academyId ? String(rest.academyId) : null,
    professor: String(rest.professor || ''),
    dob: rest.dob ? String(rest.dob) : null,
    sex: rest.sex ? String(rest.sex) : null,
    weightKg: rest.weightKg ? String(rest.weightKg) : null,
    heightCm: rest.heightCm ? String(rest.heightCm) : null,
    bjjSince: rest.bjjSince ? String(rest.bjjSince) : null,
    stripes: Number(rest.stripes) || 0,
    academyName: rest.academyName ? String(rest.academyName) : null,
    academyAddress: rest.academyAddress ? String(rest.academyAddress) : null,
    academyCity: rest.academyCity ? String(rest.academyCity) : null,
    academyState: rest.academyState ? String(rest.academyState) : null,
    academyLatitude: toNullableNumber(rest.academyLatitude),
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
    res.status(400).json({ error: 'email e password sao obrigatorios' });
    return;
  }
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!user) {
    res.status(401).json({ error: 'Credenciais invalidas' });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Credenciais invalidas' });
    return;
  }
  const token = signToken(user.uid, user.role ?? 'student', user.communityModerator ?? false);
  res.json({ token, user: sanitize(user) });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select().from(users).where(eq(users.uid, req.userId!)).limit(1);
  if (!user) {
    res.status(404).json({ error: 'Usuario nao encontrado' });
    return;
  }
  res.json(sanitize(user));
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { email } = req.body as { email: string };
  if (!email) {
    res.status(400).json({ error: 'email e obrigatorio' });
    return;
  }
  res.json({ message: 'Se o e-mail existir, um link de redefinicao sera enviado.' });
});

function sanitize(user: typeof users.$inferSelect) {
  const { passwordHash: _, ...safe } = user as any;
  return safe;
}

export default router;
