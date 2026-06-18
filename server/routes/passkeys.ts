// BJJRats — Rotas de Passkeys (WebAuthn / biometria)
import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { requireAuth, signToken, type AuthRequest } from '../middleware/auth.js';
import {
  generateChallenge, storeChallenge, consumeChallenge,
  registrationOptions, authenticationOptions,
  saveCredential, getUserCredentials, getCredential,
  updateCredentialCounter, deleteCredential,
} from '../services/passkeyService.js';

const router = Router();

// ─── GET /api/passkeys/register-challenge ──────────────────────────────────
router.get('/register-challenge', requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select({ name: users.name }).from(users).where(eq(users.uid, req.userId!)).limit(1);
  if (!user) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }

  const options = registrationOptions(req.userId!, user.name);
  storeChallenge(options.challenge, req.userId!);
  res.json(options);
});

// ─── POST /api/passkeys/register ───────────────────────────────────────────
router.post('/register', requireAuth, async (req: AuthRequest, res) => {
  const { id, rawId, response, type, deviceName } = req.body;
  if (!id || !rawId || !response) {
    res.status(400).json({ error: 'Dados da credencial inválidos' });
    return;
  }

  try {
    await saveCredential({
      id: rawId, // base64url credential ID
      uid: req.userId!,
      publicKey: response.publicKey || '',
      counter: response.counter || 0,
      deviceName: deviceName || navigatorDevice(req),
    });
    res.json({ success: true, message: 'Login biométrico ativado!' });
  } catch (err) {
    console.error('[passkeys] Erro ao registrar:', err);
    res.status(500).json({ error: 'Erro ao registrar credencial' });
  }
});

// ─── POST /api/passkeys/auth-challenge ─────────────────────────────────────
router.post('/auth-challenge', async (req, res) => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: 'Email obrigatório' }); return; }

  const [user] = await db.select({ uid: users.uid }).from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!user) {
    // Não revela se o email existe
    res.status(400).json({ error: 'Nenhuma credencial biométrica encontrada para este email.' });
    return;
  }

  const creds = await getUserCredentials(user.uid);
  if (creds.length === 0) {
    res.status(400).json({ error: 'Nenhuma credencial biométrica encontrada para este email.' });
    return;
  }

  const options = authenticationOptions();
  storeChallenge(options.challenge, user.uid);

  // Inclui as credenciais permitidas
  res.json({
    ...options,
    allowCredentials: creds.map(c => ({
      id: c.id,
      type: 'public-key' as const,
    })),
  });
});

// ─── POST /api/passkeys/auth ───────────────────────────────────────────────
router.post('/auth', async (req, res) => {
  const { id, rawId, response, type } = req.body;
  if (!id || !rawId || !response) {
    res.status(400).json({ error: 'Autenticação inválida' });
    return;
  }

  // Verifica se a credencial existe
  const cred = await getCredential(rawId);
  if (!cred) {
    res.status(401).json({ error: 'Credencial não encontrada' });
    return;
  }

  // Atualiza contador
  if (response.authenticatorData) {
    // Extrai o contador dos últimos 4 bytes do authenticatorData
    try {
      const buf = Buffer.from(response.authenticatorData, 'base64url');
      const counter = buf.readUInt32BE(buf.length - 4);
      if (counter > cred.counter) {
        await updateCredentialCounter(cred.id, counter);
      }
    } catch { /* ignora erro no contador */ }
  }

  // Gera token JWT
  const [user] = await db.select({
    uid: users.uid, role: users.role, communityModerator: users.communityModerator,
  }).from(users).where(eq(users.uid, cred.userUid)).limit(1);

  if (!user) {
    res.status(401).json({ error: 'Usuário não encontrado' });
    return;
  }

  const token = signToken(user.uid, user.role ?? 'student', user.communityModerator ?? false);

  // Cookie HTTP-only
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({ success: true, token, user: { uid: user.uid, role: user.role } });
});

// ─── GET /api/passkeys/credentials ─────────────────────────────────────────
router.get('/credentials', requireAuth, async (req: AuthRequest, res) => {
  const creds = await getUserCredentials(req.userId!);
  res.json(creds.map(c => ({
    id: c.id,
    deviceName: c.deviceName,
    createdAt: c.createdAt,
    lastUsedAt: c.lastUsedAt,
  })));
});

// ─── DELETE /api/passkeys/credentials/:id ──────────────────────────────────
router.delete('/credentials/:id', requireAuth, async (req: AuthRequest, res) => {
  const ok = await deleteCredential(req.params.id, req.userId!);
  if (!ok) { res.status(404).json({ error: 'Credencial não encontrada' }); return; }
  res.json({ success: true });
});

function navigatorDevice(req: AuthRequest) {
  const ua = req.headers['user-agent'] || '';
  if (ua.includes('iPhone')) return 'iPhone';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'Mac';
  return 'Dispositivo';
}

export default router;
