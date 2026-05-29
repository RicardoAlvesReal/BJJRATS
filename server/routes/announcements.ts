import { Router } from 'express';
import { nanoid } from 'nanoid';
import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { announcements, announcementDismissals } from '../db/schema.js';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/announcements — list announcements
// ?all=true — returns all (including inactive), superadmin only
// default — returns active, excluding dismissed by current user
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const showAll = req.query.all === 'true';

    if (showAll) {
      if (req.userRole !== 'superadmin') {
        res.status(403).json({ error: 'Apenas superadmin pode ver todos.' });
        return;
      }
      const rows = await db.select().from(announcements)
        .orderBy(desc(announcements.createdAt));
      res.json(rows);
      return;
    }

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

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar avisos.' });
  }
});

// POST /api/announcements — create (superadmin only)
router.post('/', requireAuth, requireRole('superadmin'), async (req: AuthRequest, res) => {
  try {
    const { title, content, imageUrl, linkUrl, linkText } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: 'title e content são obrigatórios.' });
      return;
    }
    const id = nanoid(12);
    const row = await db.insert(announcements).values({
      id, title, content, imageUrl, linkUrl, linkText,
    }).returning();
    res.json(row[0]);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao criar aviso.' });
  }
});

// PUT /api/announcements/:id — update (superadmin only)
router.put('/:id', requireAuth, requireRole('superadmin'), async (req: AuthRequest, res) => {
  try {
    const { title, content, imageUrl, linkUrl, linkText, isActive } = req.body;
    const row = await db.update(announcements)
      .set({ title, content, imageUrl, linkUrl, linkText, isActive, updatedAt: sql`now()` })
      .where(eq(announcements.id, req.params.id))
      .returning();
    if (!row.length) {
      res.status(404).json({ error: 'Aviso não encontrado.' });
      return;
    }
    res.json(row[0]);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar aviso.' });
  }
});

// DELETE /api/announcements/:id — delete (superadmin only)
router.delete('/:id', requireAuth, requireRole('superadmin'), async (req: AuthRequest, res) => {
  try {
    await db.delete(announcements).where(eq(announcements.id, req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao excluir aviso.' });
  }
});

// POST /api/announcements/:id/dismiss — mark as dismissed (any auth user)
router.post('/:id/dismiss', requireAuth, async (req: AuthRequest, res) => {
  try {
    const exists = await db.select().from(announcements)
      .where(and(eq(announcements.id, req.params.id), eq(announcements.isActive, true)))
      .limit(1);
    if (!exists.length) {
      res.status(404).json({ error: 'Aviso não encontrado.' });
      return;
    }
    await db.insert(announcementDismissals).values({
      id: nanoid(12),
      announcementId: req.params.id,
      userUid: req.userId!,
    }).onConflictDoNothing();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao dispensar aviso.' });
  }
});

export default router;
