import { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { events } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function toInt(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNumber(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function read(body: any, ...keys: string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(body, key)) return body[key];
  }
  return undefined;
}

function nullable(value: unknown) {
  return value === undefined ? undefined : value ?? null;
}

function normalizeEventPayload(body: any, create = false) {
  const title = read(body, 'title');
  const type = read(body, 'type');
  return compact({
    academyId: read(body, 'academyId'),
    title: typeof title === 'string' ? title.trim() : title,
    description: nullable(read(body, 'description')),
    type: type ?? (create ? 'outro' : undefined),
    eventDate: read(body, 'date', 'eventDate'),
    eventTime: nullable(read(body, 'time', 'eventTime')),
    location: nullable(read(body, 'location')),
    slots: toInt(read(body, 'slots')),
    price: nullable(read(body, 'price')),
    duration: nullable(read(body, 'duration')),
    academyName: nullable(read(body, 'academyName')),
    academyLogo: nullable(read(body, 'academyLogo')),
    registrationNames: read(body, 'registrationNames'),
    registrationBelts: read(body, 'registrationBelts'),
    registrationsClosed: read(body, 'registrationsClosed'),
    locationCep: nullable(read(body, 'locationCep')),
    locationAddress: nullable(read(body, 'locationAddress')),
    locationNumber: nullable(read(body, 'locationNumber')),
    locationNeighborhood: nullable(read(body, 'locationNeighborhood')),
    locationCity: nullable(read(body, 'locationCity')),
    locationState: nullable(read(body, 'locationState')),
    locationLatitude: toNumber(read(body, 'locationLatitude')),
    locationLongitude: toNumber(read(body, 'locationLongitude')),
    mediaUrl: nullable(read(body, 'mediaUrl', 'photoURL')),
    isPublic: read(body, 'isPublic'),
    rsvps: read(body, 'registrations', 'rsvps'),
  });
}

function serializeEvent(row: any) {
  const registrations = Array.isArray(row.rsvps) ? row.rsvps : [];
  return {
    ...row,
    uid: row.creatorUid,
    authorUid: row.creatorUid,
    createdByUid: row.creatorUid,
    date: row.eventDate ?? '',
    time: row.eventTime ?? '',
    type: row.type ?? 'outro',
    registrations,
    registrationNames: row.registrationNames ?? {},
    registrationBelts: row.registrationBelts ?? {},
    createdAtStr: row.createdAt ? new Date(row.createdAt).toLocaleDateString('pt-BR') : undefined,
  };
}

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { academyId, authorUid } = req.query as Record<string, string>;
  const where = academyId && authorUid
    ? and(eq(events.academyId, academyId), eq(events.creatorUid, authorUid))
    : academyId
      ? eq(events.academyId, academyId)
      : authorUid
        ? eq(events.creatorUid, authorUid)
        : undefined;

  const rows = where
    ? await db.select().from(events).where(where).orderBy(desc(events.eventDate))
    : await db.select().from(events).orderBy(desc(events.eventDate));

  res.json(rows.map(serializeEvent));
});

router.get('/:id', async (req, res) => {
  const [row] = await db.select().from(events).where(eq(events.id, req.params.id)).limit(1);
  if (!row) { res.status(404).json({ error: 'Evento nao encontrado' }); return; }
  res.json(serializeEvent(row));
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const payload = normalizeEventPayload(req.body, true);
  const [row] = await db.insert(events).values({ id, creatorUid: req.userId!, ...payload }).returning();
  res.status(201).json(serializeEvent(row));
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ creatorUid: events.creatorUid, academyId: events.academyId }).from(events).where(eq(events.id, req.params.id)).limit(1);
  if (!existing) { res.status(404).json({ error: 'Evento nao encontrado' }); return; }
  const isModOrSuper = req.userRole === 'superadmin' || (req as any).isCommunityModerator;
  const isAcademyOwner = (req.userRole === 'academy' || req.userRole === 'admin') && existing.academyId === req.userId;
  if (!isModOrSuper && !isAcademyOwner && existing.creatorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  const data = normalizeEventPayload(req.body);
  const [row] = await db.update(events).set(data).where(eq(events.id, req.params.id)).returning();
  res.json(serializeEvent(row));
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ creatorUid: events.creatorUid, academyId: events.academyId }).from(events).where(eq(events.id, req.params.id)).limit(1);
  if (!existing) { res.status(404).json({ error: 'Evento nao encontrado' }); return; }
  const isModOrSuper = req.userRole === 'superadmin' || (req as any).isCommunityModerator;
  const isAcademyOwner = (req.userRole === 'academy' || req.userRole === 'admin') && existing.academyId === req.userId;
  if (!isModOrSuper && !isAcademyOwner && existing.creatorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  await db.delete(events).where(eq(events.id, req.params.id));
  res.json({ success: true });
});

export default router;
