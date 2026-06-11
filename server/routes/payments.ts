import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { payments } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

function normalizePaymentDate(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return value;
}

function normalizePaymentPayload(payload: Record<string, unknown>) {
  const data: Record<string, unknown> = { ...payload };
  if ('dueDate' in data) data['dueDate'] = normalizePaymentDate(data['dueDate']);
  if ('paidAt' in data) data['paidAt'] = normalizePaymentDate(data['paidAt']);
  return data;
}

function formatDateOnly(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function serializePayment<T extends Record<string, unknown>>(payment: T) {
  return {
    ...payment,
    dueDate: formatDateOnly(payment['dueDate']),
    paidAt: formatDateOnly(payment['paidAt']),
  };
}

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { professorUid, studentUid } = req.query as Record<string, string>;
  const conditions = [];
  if (professorUid) conditions.push(eq(payments.professorUid, professorUid));
  if (studentUid)   conditions.push(eq(payments.studentUid, studentUid));
  const rows = conditions.length
    ? await db.select().from(payments).where(and(...conditions)).orderBy(desc(payments.dueDate))
    : await db.select().from(payments).where(eq(payments.professorUid, req.userId!)).orderBy(desc(payments.dueDate));
  res.json(rows.map(serializePayment));
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const data = normalizePaymentPayload(req.body);
  const [row] = await db.insert(payments).values({ id, ...data } as any).returning();
  res.status(201).json(serializePayment(row));
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ professorUid: payments.professorUid }).from(payments).where(eq(payments.id, req.params.id)).limit(1);
  if (!existing || existing.professorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  const { id: _id, ...data } = normalizePaymentPayload(req.body);
  const [row] = await db.update(payments).set(data as any).where(eq(payments.id, req.params.id)).returning();
  res.json(serializePayment(row));
});

export default router;
