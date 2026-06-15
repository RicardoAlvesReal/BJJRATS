import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { promotions, users } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

const asText = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const asInteger = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
};

const asDate = (value: unknown) => {
  if (!value) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const formatDate = (value: unknown) => {
  const date = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : undefined;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('pt-BR') : '';
};

const serializePromotion = (row: typeof promotions.$inferSelect) => ({
  ...row,
  previousBelt: row.fromBelt,
  previousStripes: row.fromStripes,
  newBelt: row.toBelt,
  newStripes: row.toStripes,
  promotedAtStr: formatDate(row.promotedAt),
});

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { professorUid, studentUid } = req.query as Record<string, string>;
  const rows = professorUid
    ? await db.select().from(promotions).where(eq(promotions.professorUid, professorUid)).orderBy(desc(promotions.promotedAt))
    : studentUid
    ? await db.select().from(promotions).where(eq(promotions.studentUid, studentUid)).orderBy(desc(promotions.promotedAt))
    : await db.select().from(promotions).orderBy(desc(promotions.promotedAt));

  res.json(rows.map(serializePromotion));
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const body = req.body as Record<string, unknown>;
  const studentUid = asText(body.studentUid);
  const toBelt = asText(body.toBelt ?? body.newBelt);
  const toStripes = asInteger(body.toStripes ?? body.newStripes) ?? 0;

  if (!studentUid || !toBelt) {
    return res.status(400).json({ error: 'studentUid e toBelt/newBelt sao obrigatorios' });
  }

  const [row] = await db.insert(promotions).values({
    id,
    professorUid: req.userId!,
    studentUid,
    studentName: asText(body.studentName),
    fromBelt: asText(body.fromBelt ?? body.previousBelt),
    toBelt,
    fromStripes: asInteger(body.fromStripes ?? body.previousStripes),
    toStripes,
    notes: asText(body.notes),
    promotedAt: asDate(body.promotedAt),
  }).returning();

  // Aplica promocao no perfil do atleta.
  await db.update(users).set({ belt: toBelt, stripes: toStripes }).where(eq(users.uid, studentUid));

  res.status(201).json(serializePromotion(row));
});

export default router;
