// BJJRats — Public settings route (app store links, etc.)

import { Router } from 'express';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { settings } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { isInternalAcademyProfessor } from '../services/academyProfessorAccess.js';
import {
  DEFAULT_AUTO_SUSPEND_AFTER_DAYS,
  financialSettingsKey,
  normalizeAutoSuspendAfterDays,
} from '../services/financialAutomation.js';
import {
  getPaymentIntegration,
  savePaymentIntegration,
  toPublicPaymentIntegration,
} from '../services/paymentIntegrations.js';
import { testConnection as testAsaasConnection } from '../services/asaas.js';

const router = Router();

async function blockInternalProfessorFinancialAccess(req: AuthRequest, res: any) {
  if (!await isInternalAcademyProfessor(req.userId!, req.userRole)) return false;
  res.status(403).json({ error: 'Financeiro gerenciado pela academia.' });
  return true;
}

// ─── GET /api/settings/public ───────────────────────────────────────────────
// Retorna configurações públicas (sem autenticação)
router.get('/public', async (_req, res) => {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, ['app_store_url', 'play_store_url', 'past_due_grace_days', 'popular_plan_slug']));
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  // Garante fallback se não estiver configurado
  if (!map.past_due_grace_days) map.past_due_grace_days = '3';
  if (!map.popular_plan_slug) map.popular_plan_slug = 'professor';
  res.json(map);
});

router.get('/financial', requireAuth, async (req: AuthRequest, res) => {
  if (await blockInternalProfessorFinancialAccess(req, res)) return;

  const key = financialSettingsKey(req.userId!);
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  res.json({
    autoSuspendAfterDays: normalizeAutoSuspendAfterDays(row?.value),
    defaultAutoSuspendAfterDays: DEFAULT_AUTO_SUSPEND_AFTER_DAYS,
  });
});

router.put('/financial', requireAuth, async (req: AuthRequest, res) => {
  if (await blockInternalProfessorFinancialAccess(req, res)) return;

  const autoSuspendAfterDays = normalizeAutoSuspendAfterDays(req.body?.autoSuspendAfterDays);
  const key = financialSettingsKey(req.userId!);
  await db.insert(settings)
    .values({ key, value: String(autoSuspendAfterDays) })
    .onConflictDoUpdate({ target: settings.key, set: { value: String(autoSuspendAfterDays) } });

  res.json({
    autoSuspendAfterDays,
    defaultAutoSuspendAfterDays: DEFAULT_AUTO_SUSPEND_AFTER_DAYS,
  });
});

function paymentWebhookUrl(req: AuthRequest) {
  const base = process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
  return `${base.replace(/\/$/, '')}/api/payments/asaas/webhook`;
}

router.get('/payment-integration', requireAuth, async (req: AuthRequest, res) => {
  if (await blockInternalProfessorFinancialAccess(req, res)) return;

  const integration = await getPaymentIntegration(req.userId!);
  res.json({
    ...toPublicPaymentIntegration(integration),
    webhookUrl: paymentWebhookUrl(req),
  });
});

router.put('/payment-integration', requireAuth, async (req: AuthRequest, res) => {
  if (await blockInternalProfessorFinancialAccess(req, res)) return;

  const integration = await savePaymentIntegration(req.userId!, req.body || {});
  res.json({
    ...toPublicPaymentIntegration(integration),
    webhookUrl: paymentWebhookUrl(req),
  });
});

router.post('/payment-integration/test', requireAuth, async (req: AuthRequest, res) => {
  if (await blockInternalProfessorFinancialAccess(req, res)) return;

  const stored = await getPaymentIntegration(req.userId!, true);
  const apiKey = typeof req.body?.asaasApiKey === 'string' && req.body.asaasApiKey.trim()
    ? req.body.asaasApiKey.trim()
    : stored.asaasApiKey;
  const sandbox = typeof req.body?.asaasSandbox === 'boolean'
    ? req.body.asaasSandbox
    : stored.asaasSandbox;

  if (!apiKey) {
    res.status(400).json({ error: 'Informe uma chave Asaas para testar.' });
    return;
  }

  await testAsaasConnection({ apiKey, sandbox });
  res.json({ success: true, sandbox });
});

export default router;
