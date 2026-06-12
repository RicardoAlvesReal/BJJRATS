import { Router } from 'express';
import { nanoid } from 'nanoid';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { announcementDismissals, announcements, enrollments, users, whatsappInstances } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import * as evolution from '../services/evolutionApi.js';

const router = Router();

const AUDIENCES = new Set(['all', 'students', 'professors']);
const WHATSAPP_SEND_CONCURRENCY = 4;

type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;
type AnnouncementRow = typeof announcements.$inferSelect;
type WhatsAppRecipient = {
  uid: string;
  name: string | null;
  phone: string | null;
  role: string | null;
};

async function getViewer(uid: string) {
  const [viewer] = await db
    .select({
      uid: users.uid,
      name: users.name,
      role: users.role,
      isAcademyAdmin: users.isAcademyAdmin,
      academyId: users.academyId,
      academy: users.academy,
      academyName: users.academyName,
      professor: users.professor,
    })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);

  return viewer;
}

function audienceAllowed(audience: string | null | undefined, role?: string | null) {
  const value = audience || 'all';
  if (value === 'all') return true;
  if (value === 'students') return role === 'student';
  if (value === 'professors') return role === 'professor' || role === 'admin' || role === 'superadmin';
  return true;
}

function hasPhone(recipient: WhatsAppRecipient) {
  return Boolean(recipient.phone?.replace(/\D/g, ''));
}

function dedupeRecipients(rows: WhatsAppRecipient[], sourceUid: string) {
  const byUid = new Map<string, WhatsAppRecipient>();
  for (const row of rows) {
    if (row.uid === sourceUid || !hasPhone(row)) continue;
    if (!byUid.has(row.uid)) byUid.set(row.uid, row);
  }
  return Array.from(byUid.values());
}

function buildWhatsAppAnnouncementMessage(row: AnnouncementRow) {
  const title = row.urgent ? `URGENTE: ${row.title}` : row.title;
  const content = String(row.content || '').replace(/<[^>]*>/g, '').trim();
  const source = row.sourceName ? `\n\nEnviado por: ${row.sourceName}` : '';
  const link = row.linkUrl ? `\n${row.linkText || 'Link'}: ${row.linkUrl}` : '';
  return `*${title}*\n\n${content}${link}${source}`.trim();
}

async function getAnnouncementRecipients(
  author: Viewer,
  scope: string,
  audience: string,
  targetAcademyId?: string,
  targetProfessorUid?: string,
): Promise<WhatsAppRecipient[]> {
  if (scope === 'global') {
    const rows = await db.select({
      uid: users.uid,
      name: users.name,
      phone: users.phone,
      role: users.role,
    }).from(users);

    return dedupeRecipients(rows.filter(row => audienceAllowed(audience, row.role)), author.uid);
  }

  if (scope === 'academy') {
    const academyId = targetAcademyId || author.uid;
    const rows = await db.select({
      uid: users.uid,
      name: users.name,
      phone: users.phone,
      role: users.role,
    })
      .from(users)
      .where(eq(users.academyId, academyId));

    return dedupeRecipients(rows.filter(row => audienceAllowed(audience, row.role)), author.uid);
  }

  if (scope === 'professor') {
    const professorUid = targetProfessorUid || author.uid;
    const rows = await db.select({
      studentUid: enrollments.studentUid,
    })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.professorUid, professorUid),
          sql`${enrollments.status} IS DISTINCT FROM 'cancelled'`,
          sql`${enrollments.status} IS DISTINCT FROM 'rejected'`,
        ),
      );
    const studentUids = Array.from(new Set(rows.map(row => row.studentUid).filter(Boolean)));
    if (!studentUids.length) return [];

    const recipients = await db.select({
      uid: users.uid,
      name: users.name,
      phone: users.phone,
      role: users.role,
    })
      .from(users)
      .where(inArray(users.uid, studentUids));

    return dedupeRecipients(recipients.filter(row => audienceAllowed(audience || 'students', row.role)), author.uid);
  }

  return [];
}

async function ensureWhatsAppSenderConnected(sourceUid: string) {
  const expectedInstanceName = `bjjrats_${sourceUid}`;
  const [instance] = await db.select().from(whatsappInstances)
    .where(eq(whatsappInstances.professorUid, sourceUid))
    .limit(1);

  const instanceName = instance?.instanceName || expectedInstanceName;
  try {
    const state = await evolution.getConnectionState(instanceName);
    if (state.instance.state !== 'open') return false;

    if (!instance) {
      await db.insert(whatsappInstances).values({
        id: nanoid(),
        professorUid: sourceUid,
        instanceName,
        status: 'connected',
        phone: state.instance.ownerJid?.split('@')[0] || null,
      }).onConflictDoNothing();
    } else if (instance.status !== 'connected') {
      await db.update(whatsappInstances)
        .set({ status: 'connected', phone: state.instance.ownerJid?.split('@')[0] || instance.phone })
        .where(eq(whatsappInstances.id, instance.id));
    }

    return true;
  } catch {
    return false;
  }
}

async function sendWithConcurrency<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
) {
  let sent = 0;
  let failed = 0;
  let index = 0;

  const runners = Array.from({ length: Math.min(WHATSAPP_SEND_CONCURRENCY, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      try {
        await worker(item);
        sent++;
      } catch {
        failed++;
      }
    }
  });

  await Promise.all(runners);
  return { sent, failed };
}

async function sendAnnouncementOverWhatsApp(row: AnnouncementRow, author: Viewer) {
  const connected = await ensureWhatsAppSenderConnected(author.uid);
  if (!connected) {
    return { enabled: false, recipients: 0, sent: 0, failed: 0 };
  }

  const recipients = await getAnnouncementRecipients(
    author,
    row.scope || 'global',
    row.audience || 'all',
    row.targetAcademyId || undefined,
    row.targetProfessorUid || undefined,
  );
  if (!recipients.length) {
    return { enabled: true, recipients: 0, sent: 0, failed: 0 };
  }

  const message = buildWhatsAppAnnouncementMessage(row);
  const result = await sendWithConcurrency(recipients, recipient =>
    evolution.sendMessage(author.uid, recipient.phone!, message).then(() => undefined),
  );

  return {
    enabled: true,
    recipients: recipients.length,
    ...result,
  };
}

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const showAll = req.query.all === 'true';
    const mineOnly = req.query.mine === 'true';

    if (showAll) {
      if (req.userRole !== 'superadmin') {
        res.status(403).json({ error: 'Apenas superadmin pode ver todos.' });
        return;
      }

      const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
      res.json(rows);
      return;
    }

    if (mineOnly) {
      const rows = await db
        .select()
        .from(announcements)
        .where(eq(announcements.sourceUid, req.userId!))
        .orderBy(desc(announcements.createdAt));
      res.json(rows);
      return;
    }

    const viewer = await getViewer(req.userId!);
    if (!viewer) {
      res.status(404).json({ error: 'Usuario nao encontrado.' });
      return;
    }

    const studentEnrollments = viewer.role === 'student'
      ? await db
        .select({ professorUid: enrollments.professorUid })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.studentUid, req.userId!),
            sql`${enrollments.status} IS DISTINCT FROM 'cancelled'`,
          ),
        )
      : [];
    const professorUids = new Set(studentEnrollments.map(row => row.professorUid));

    const rows = await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.isActive, true),
          sql`${announcements.id} NOT IN (
            SELECT announcement_id FROM ${announcementDismissals}
            WHERE user_uid = ${req.userId!}
          )`,
        ),
      )
      .orderBy(desc(announcements.createdAt));

    const filtered = rows.filter(row => {
      const scope = row.scope || 'global';
      if (scope === 'global') return true;

      if (scope === 'academy') {
        const targetAcademyId = row.targetAcademyId || row.sourceUid;
        const sameAcademy =
          !!targetAcademyId &&
          (viewer.uid === targetAcademyId || viewer.academyId === targetAcademyId);
        return sameAcademy && audienceAllowed(row.audience, viewer.role);
      }

      if (scope === 'professor') {
        const targetProfessorUid = row.targetProfessorUid || row.sourceUid;
        if (!targetProfessorUid) return false;
        if (viewer.uid === targetProfessorUid) return true;
        return professorUids.has(targetProfessorUid) && audienceAllowed(row.audience || 'students', viewer.role);
      }

      return false;
    });

    res.json(filtered);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar notificações.' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { title, content, imageUrl, linkUrl, linkText, urgent } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: 'title e content sao obrigatorios.' });
      return;
    }

    const author = await getViewer(req.userId!);
    if (!author) {
      res.status(404).json({ error: 'Usuario nao encontrado.' });
      return;
    }

    const role = author.role || req.userRole || 'student';
    const isAcademy = role === 'admin' || !!author.isAcademyAdmin;
    const audience = AUDIENCES.has(String(req.body.audience || '')) ? String(req.body.audience) : 'all';
    let scope = 'global';
    let targetAcademyId: string | undefined;
    let targetProfessorUid: string | undefined;

    if (role === 'superadmin') {
      scope = 'global';
    } else if (isAcademy) {
      scope = 'academy';
      targetAcademyId = author.uid;
    } else if (role === 'professor') {
      scope = 'professor';
      targetProfessorUid = author.uid;
    } else {
      res.status(403).json({ error: 'Apenas superadmin, academias e professores podem criar notificações.' });
      return;
    }

    const id = nanoid(12);
    const [row] = await db.insert(announcements).values({
      id,
      title,
      content,
      imageUrl,
      linkUrl,
      linkText,
      sourceUid: author.uid,
      sourceName: author.academyName || author.academy || author.name,
      sourceRole: role,
      scope,
      audience: role === 'superadmin' ? 'all' : audience,
      targetAcademyId,
      targetProfessorUid,
      urgent: !!urgent,
    }).returning();

    let whatsapp = { enabled: false, recipients: 0, sent: 0, failed: 0 };
    try {
      whatsapp = await sendAnnouncementOverWhatsApp(row, author);
    } catch (err) {
      console.warn('[announcements] whatsapp automation failed', err);
    }

    res.status(201).json({ ...row, whatsapp });
  } catch {
    res.status(500).json({ error: 'Erro ao criar notificação.' });
  }
});

router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const [existing] = await db
      .select({ sourceUid: announcements.sourceUid })
      .from(announcements)
      .where(eq(announcements.id, req.params.id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: 'Notificação nao encontrada.' });
      return;
    }
    if (req.userRole !== 'superadmin' && existing.sourceUid !== req.userId) {
      res.status(403).json({ error: 'Acesso negado.' });
      return;
    }

    const { title, content, imageUrl, linkUrl, linkText, isActive, urgent } = req.body;
    const [row] = await db.update(announcements)
      .set({ title, content, imageUrl, linkUrl, linkText, isActive, urgent, updatedAt: sql`now()` })
      .where(eq(announcements.id, req.params.id))
      .returning();

    res.json(row);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar notificação.' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const [existing] = await db
      .select({ sourceUid: announcements.sourceUid })
      .from(announcements)
      .where(eq(announcements.id, req.params.id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: 'Notificação nao encontrada.' });
      return;
    }
    if (req.userRole !== 'superadmin' && existing.sourceUid !== req.userId) {
      res.status(403).json({ error: 'Acesso negado.' });
      return;
    }

    await db.delete(announcements).where(eq(announcements.id, req.params.id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir notificação.' });
  }
});

router.post('/:id/dismiss', requireAuth, async (req: AuthRequest, res) => {
  try {
    const exists = await db.select().from(announcements)
      .where(and(eq(announcements.id, req.params.id), eq(announcements.isActive, true)))
      .limit(1);
    if (!exists.length) {
      res.status(404).json({ error: 'Notificação nao encontrada.' });
      return;
    }

    await db.insert(announcementDismissals).values({
      id: nanoid(12),
      announcementId: req.params.id,
      userUid: req.userId!,
    }).onConflictDoNothing();

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erro ao dispensar notificação.' });
  }
});

export default router;
