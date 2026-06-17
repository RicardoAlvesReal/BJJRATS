import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { notifications, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { sendSuperadminEmail } from '../services/superadminEmail.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimit = new Map<string, { count: number; resetAt: number }>();

function text(value: unknown, max = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function notifySuperadmins(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
  category?: string;
}) {
  const admins = await db
    .select({ uid: users.uid })
    .from(users)
    .where(eq(users.role, 'superadmin'));

  if (admins.length === 0) return;

  await db.insert(notifications).values(admins.map((admin) => ({
    id: nanoid(),
    toUid: admin.uid,
    fromName: input.name,
    type: 'support_email',
    message: `${input.subject} - ${input.message}`.slice(0, 1200),
    data: {
      source: 'support_api',
      email: input.email,
      category: input.category || null,
    },
    read: false,
  })));
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = rateLimit.get(key);
  if (!current || current.resetAt <= now) {
    rateLimit.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
}

router.post('/superadmin-email', async (req, res) => {
  const rateKey = req.ip || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(rateKey)) {
    res.status(429).json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' });
    return;
  }

  const honeypot = text(req.body?.website, 200);
  if (honeypot) {
    res.status(202).json({ success: true, ignored: true });
    return;
  }

  const name = text(req.body?.name, 120);
  const email = text(req.body?.email, 180).toLowerCase();
  const subject = text(req.body?.subject, 160);
  const message = text(req.body?.message, 4000);
  const category = text(req.body?.category, 80);
  const pageUrl = text(req.body?.pageUrl, 500);

  if (!name || !email || !subject || !message) {
    res.status(400).json({ error: 'Nome, e-mail, assunto e mensagem sao obrigatorios.' });
    return;
  }

  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'E-mail invalido.' });
    return;
  }

  if (message.length < 10) {
    res.status(400).json({ error: 'Mensagem muito curta.' });
    return;
  }

  try {
    await notifySuperadmins({ name, email, subject, message, category });
    const delivery = await sendSuperadminEmail({
      name,
      email,
      subject,
      message,
      category,
      pageUrl,
      userAgent: req.get('user-agent') || undefined,
      metadata: {
        ip: req.ip,
        source: 'support_api',
      },
    });

    res.status(202).json({
      success: true,
      delivery: {
        provider: delivery.provider,
        sent: delivery.sent,
        recipients: delivery.recipients.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao enviar e-mail.';
    const status = message.includes('configurado') ? 503 : 500;
    res.status(status).json({ error: message });
  }
});

export default router;
