import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { posts, comments } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/posts?academyId=...&type=academy
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { academyId, type } = req.query as Record<string, string>;
  let query = db.select().from(posts).$dynamic().orderBy(desc(posts.createdAt));
  const conditions = [];
  if (type)      conditions.push(eq(posts.postType, type));
  if (academyId) conditions.push(eq(posts.academyId, academyId));
  const rows = conditions.length
    ? await query.where(and(...conditions))
    : await query;
  res.json(rows);
});

// GET /api/posts/:id
router.get('/:id', requireAuth, async (req, res) => {
  const [row] = await db.select().from(posts).where(eq(posts.id, req.params.id)).limit(1);
  if (!row) { res.status(404).json({ error: 'Post não encontrado' }); return; }
  res.json(row);
});

// POST /api/posts
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const [row] = await db.insert(posts).values({ id, authorUid: req.userId!, ...req.body }).returning();
  res.status(201).json(row);
});

// PATCH /api/posts/:id
router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ authorUid: posts.authorUid }).from(posts).where(eq(posts.id, req.params.id)).limit(1);
  if (!existing || existing.authorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  const { id: _id, authorUid: _au, ...data } = req.body;
  const [row] = await db.update(posts).set(data).where(eq(posts.id, req.params.id)).returning();
  res.json(row);
});

// DELETE /api/posts/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ authorUid: posts.authorUid }).from(posts).where(eq(posts.id, req.params.id)).limit(1);
  if (!existing || existing.authorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  await db.delete(posts).where(eq(posts.id, req.params.id));
  res.json({ success: true });
});

// ─── Comments ────────────────────────────────────────────────────────────────
// GET /api/posts/:id/comments
router.get('/:id/comments', requireAuth, async (req, res) => {
  const rows = await db.select().from(comments)
    .where(eq(comments.postId, req.params.id))
    .orderBy(desc(comments.createdAt));
  res.json(rows);
});

// POST /api/posts/:id/comments
router.post('/:id/comments', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const [row] = await db.insert(comments).values({
    id, postId: req.params.id, authorUid: req.userId!, ...req.body
  }).returning();
  res.status(201).json(row);
});

// DELETE /api/posts/:postId/comments/:commentId
router.delete('/:postId/comments/:commentId', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ authorUid: comments.authorUid }).from(comments).where(eq(comments.id, req.params.commentId)).limit(1);
  if (!existing || existing.authorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  await db.delete(comments).where(eq(comments.id, req.params.commentId));
  res.json({ success: true });
});

export default router;
