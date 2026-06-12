// BJJRats — Public settings route (app store links, etc.)

import { Router } from 'express';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { settings } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();
const DEFAULT_AUTO_SUSPEND_AFTER_DAYS = 10;

function financialSettingsKey(uid: string) {
  return `professor:${uid}:financial:auto_suspend_after_days`;
}

function normalizeAutoSuspendAfterDays(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_AUTO_SUSPEND_AFTER_DAYS;
  return Math.max(0, Math.min(365, Math.floor(parsed)));
}

// ─── GET /api/settings/public ───────────────────────────────────────────────
// Retorna configurações públicas (sem autenticação)
router.get('/public', async (_req, res) => {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, ['app_store_url', 'play_store_url']));
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  res.json(map);
});

router.get('/financial', requireAuth, async (req: AuthRequest, res) => {
  const key = financialSettingsKey(req.userId!);
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  res.json({
    autoSuspendAfterDays: normalizeAutoSuspendAfterDays(row?.value),
    defaultAutoSuspendAfterDays: DEFAULT_AUTO_SUSPEND_AFTER_DAYS,
  });
});

router.put('/financial', requireAuth, async (req: AuthRequest, res) => {
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

export default router;
