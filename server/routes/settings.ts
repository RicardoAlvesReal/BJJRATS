// BJJRats — Public settings route (app store links, etc.)

import { Router } from 'express';
import { inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { settings } from '../db/schema.js';

const router = Router();

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

export default router;
