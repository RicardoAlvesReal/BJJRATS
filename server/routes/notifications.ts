import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { notifications } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { sendNotificationWhatsApp } from '../services/notificationWhatsApp.js';
import { sendNotificationEmail } from '../services/notificationEmail.js';
import { isInternalAcademyProfessor } from '../services/academyProfessorAccess.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const rows = await db.select().from(notifications)
    .where(eq(notifications.toUid, req.userId!))
    .orderBy(desc(notifications.createdAt));
  res.json(rows);
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  if (await isInternalAcademyProfessor(req.userId!, req.userRole)) {
    res.status(403).json({ error: 'Notificacoes deste professor sao gerenciadas pela academia.' });
    return;
  }

  const id = nanoid();
  const { id: _id, fromUid: _fromUid, createdAt: _createdAt, whatsapp: _whatsapp, ...body } = req.body || {};
  const [row] = await db.insert(notifications).values({ id, ...body, fromUid: req.userId! }).returning();

  let whatsapp = { enabled: false, recipients: 0, sent: 0, failed: 0 };
  let email = { enabled: false, recipients: 0, sent: 0, failed: 0 };
  try {
    whatsapp = await sendNotificationWhatsApp(row, req.userId!);
  } catch (err) {
    console.warn('[notifications] whatsapp automation failed', err);
  }
  try {
    email = await sendNotificationEmail(row, req.userId!);
  } catch (err) {
    console.warn('[notifications] email automation failed', err);
  }

  res.status(201).json({ ...row, whatsapp, email });
});

// PATCH /api/notifications/read-all  — marca todas como lidas
router.patch('/read-all', requireAuth, async (req: AuthRequest, res) => {
  await db.update(notifications).set({ read: true }).where(
    and(eq(notifications.toUid, req.userId!), eq(notifications.read, false))
  );
  res.json({ success: true });
});

router.delete('/', requireAuth, async (req: AuthRequest, res) => {
  await db.delete(notifications).where(eq(notifications.toUid, req.userId!));
  res.json({ success: true });
});

// PATCH /api/notifications/:id  — marca como lida
router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ toUid: notifications.toUid }).from(notifications).where(eq(notifications.id, req.params.id)).limit(1);
  if (!existing || existing.toUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  const { id: _id, ...data } = req.body;
  const [row] = await db.update(notifications).set(data).where(eq(notifications.id, req.params.id)).returning();
  res.json(row);
});

export default router;
