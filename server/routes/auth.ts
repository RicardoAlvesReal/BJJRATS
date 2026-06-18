import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, settings } from '../db/schema.js';
import { signToken, requireAuth, type AuthRequest } from '../middleware/auth.js';
import { verifyTurnstile } from '../middleware/turnstile.js';
import { sendCompanyEmail } from '../services/companyEmail.js';

const router = Router();

/** Cookie HTTP-only seguro — mesma duração do JWT (30 dias) */
function setTokenCookie(res: any, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
    path: '/',
  });
}

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
  const { name, email, password, role = 'student', belt = 'Branca', turnstileToken, ...rest } = req.body as Record<string, unknown>;
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizeWhatsApp(rest.phone);

  if (!name || !normalizedEmail || !password || !normalizedPhone) {
    res.status(400).json({ error: 'name, email, password e WhatsApp sao obrigatorios' });
    return;
  }

  // Verifica Turnstile
  const turnstileEnabled = !!process.env.TURNSTILE_SECRET_KEY;
  if (turnstileEnabled) {
    const valid = await verifyTurnstile(String(turnstileToken || ''));
    if (!valid) {
      res.status(400).json({ error: 'Falha na verificação de segurança. Recarregue a página.' });
      return;
    }
  }

  if (!isValidEmail(normalizedEmail)) {
    res.status(400).json({ error: 'Informe um e-mail valido.' });
    return;
  }

  if (!isValidWhatsApp(normalizedPhone)) {
    res.status(400).json({ error: 'Informe um WhatsApp valido com DDD.' });
    return;
  }

  // Validação de senha forte
  if (typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });
    return;
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  if (!hasLetter || !hasNumber) {
    res.status(400).json({ error: 'A senha deve conter letras e números.' });
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
  setTokenCookie(res, token);
  res.status(201).json({ token, user: sanitize(user) });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password, turnstileToken } = req.body as { email: string; password: string; turnstileToken?: string };

  // Verifica Turnstile
  const turnstileEnabled = !!process.env.TURNSTILE_SECRET_KEY;
  if (turnstileEnabled) {
    const valid = await verifyTurnstile(turnstileToken || '');
    if (!valid) {
      res.status(400).json({ error: 'Falha na verificação de segurança. Recarregue a página.' });
      return;
    }
  }
  if (!email || !password) {
    res.status(400).json({ error: 'email e password sao obrigatorios' });
    return;
  }
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!user) {
    res.status(401).json({ error: 'Email não encontrado', code: 'auth/user-not-found' });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Senha incorreta', code: 'auth/wrong-password' });
    return;
  }
  const token = signToken(user.uid, user.role ?? 'student', user.communityModerator ?? false);
  setTokenCookie(res, token);
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

// POST /api/auth/logout — Limpa o cookie HTTP-only
router.post('/logout', (_req, res) => {
  res.clearCookie('token', { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
  res.json({ success: true });
});

// POST /api/auth/reset-password — Solicita redefinição de senha
router.post('/reset-password', async (req, res) => {
  const { email } = req.body as { email: string };
  if (!email) {
    res.status(400).json({ error: 'email e obrigatorio' });
    return;
  }

  // Busca o usuário
  const [user] = await db.select({ uid: users.uid, name: users.name, phone: users.phone })
    .from(users).where(eq(users.email, email.toLowerCase())).limit(1);

  // Sempre retorna sucesso (não revela se email existe)
  if (!user) {
    res.json({ message: 'Se o e-mail existir, um link de redefinicao sera enviado.' });
    return;
  }

  // Gera token único e expira em 1 hora
  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await db.insert(settings).values({ key: `pwd_reset:${token}`, value: `${user.uid}|${expiresAt}` })
    .onConflictDoUpdate({ target: settings.key, set: { value: `${user.uid}|${expiresAt}` } });

  const resetLink = `${process.env.CLIENT_URL || 'https://thebjjrats.com'}/reset-password?token=${token}`;

  console.log(`[PASSWORD RESET] Usuário: ${user.name} (${email})`);

  // Envia email via Resend (se configurado) ou loga no console
  sendCompanyEmail({
    to: [email],
    subject: 'BJJRats — Redefinição de Senha',
    text: `Olá ${user.name}! Acesse este link para redefinir sua senha: ${resetLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0A0A0A; color: #CCC; padding: 2rem; border-radius: 8px; border: 1px solid #222;">
        <h1 style="color: #CC0000; font-size: 1.5rem; text-transform: uppercase;">BJJ<span style="color: #FFF;">RATS</span></h1>
        <p>Olá, <strong style="color: #FFF;">${user.name}</strong>!</p>
        <p>Você solicitou a redefinição da sua senha. Clique no botão abaixo:</p>
        <a href="${resetLink}" style="display: inline-block; background: #CC0000; color: #FFF; text-decoration: none; padding: 0.75rem 1.5rem; font-weight: bold; text-transform: uppercase; font-size: 0.9rem; margin: 1rem 0;">
          REDEFINIR SENHA
        </a>
        <p style="font-size: 0.8rem; color: #555;">Este link expira em 1 hora.</p>
      </div>
    `,
  }).catch(err => console.error('[PASSWORD RESET] Erro ao enviar email:', err));

  console.log(`[PASSWORD RESET] Link: ${resetLink}`);

  // TODO: enviar por email/WhatsApp quando o serviço estiver configurado
  res.json({ message: 'Se o e-mail existir, um link de redefinicao sera enviado.' });
});

// POST /api/auth/reset-password/confirm — Confirma redefinição com token
router.post('/reset-password/confirm', async (req, res) => {
  const { token, newPassword } = req.body as { token: string; newPassword: string };
  if (!token || !newPassword) {
    res.status(400).json({ error: 'Token e nova senha sao obrigatorios.' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres.' });
    return;
  }
  if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    res.status(400).json({ error: 'A senha deve conter letras e números.' });
    return;
  }

  // Busca o token
  const [row] = await db.select().from(settings).where(eq(settings.key, `pwd_reset:${token}`)).limit(1);
  if (!row) {
    res.status(400).json({ error: 'Token inválido ou expirado.' });
    return;
  }

  const [uid, expiresAt] = row.value.split('|');
  if (new Date() > new Date(expiresAt)) {
    await db.delete(settings).where(eq(settings.key, `pwd_reset:${token}`));
    res.status(400).json({ error: 'Token expirado. Solicite um novo link.' });
    return;
  }

  // Atualiza a senha
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(users).set({ passwordHash }).where(eq(users.uid, uid));

  // Remove o token usado
  await db.delete(settings).where(eq(settings.key, `pwd_reset:${token}`));

  console.log(`[PASSWORD RESET] Senha redefinida para uid: ${uid}`);
  res.json({ success: true, message: 'Senha redefinida com sucesso! Faça login.' });
});

function sanitize(user: typeof users.$inferSelect) {
  const { passwordHash: _, ...safe } = user as any;
  return safe;
}

export default router;
