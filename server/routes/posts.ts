import { Router } from 'express';
import { eq, and, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { posts, comments } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// Mapeamento de campos: cliente usa nomes legados do Firestore; DB usa nomes do schema Drizzle
function toClientPost(row: Record<string, any>) {
  return {
    ...row,
    text:          row.content,
    photoURL:      row.mediaUrl,
    authorPhotoURL: row.authorPhoto,
    feedTarget:    row.postType,
    uid:           row.authorUid,
  };
}

function fromClientPost(body: Record<string, any>) {
  const { uid: _uid, text, photoURL, authorPhotoURL, feedTarget,
          createdAt: _ca, updatedAt: _ua, commentCount: _cc, ...rest } = body;
  return {
    ...(text           !== undefined && { content:     text }),
    ...(photoURL       !== undefined && { mediaUrl:    photoURL }),
    ...(authorPhotoURL !== undefined && { authorPhoto: authorPhotoURL }),
    ...(feedTarget     !== undefined && { postType:    feedTarget }),
    ...rest,
  };
}

function toClientComment(row: Record<string, any>) {
  return {
    ...row,
    uid:           row.authorUid,
    text:          row.content,
    authorPhotoURL: row.authorPhoto,
  };
}

// GET /api/posts?academyId=...&type=academy
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { academyId, type } = req.query as Record<string, string>;
  let query = db.select().from(posts).$dynamic().orderBy(desc(posts.createdAt));
  const conditions = [sql`NOT EXISTS (SELECT 1 FROM users WHERE uid = ${posts.authorUid} AND role = 'superadmin')`];
  if (type)      conditions.push(eq(posts.postType, type));
  if (academyId) conditions.push(eq(posts.academyId, academyId));
  const rows = conditions.length
    ? await query.where(and(...conditions))
    : await query;
  res.json(rows.map(toClientPost));
});

// GET /api/posts/:id
router.get('/:id', requireAuth, async (req, res) => {
  const [row] = await db.select().from(posts).where(eq(posts.id, req.params.id)).limit(1);
  if (!row) { res.status(404).json({ error: 'Post não encontrado' }); return; }
  res.json(toClientPost(row));
});

// POST /api/posts
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const data = fromClientPost(req.body);
  const [row] = await db.insert(posts).values({ id, authorUid: req.userId!, ...data }).returning();
  res.status(201).json(toClientPost(row));
});

// PATCH /api/posts/:id
router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ authorUid: posts.authorUid }).from(posts).where(eq(posts.id, req.params.id)).limit(1);
  if (!existing || existing.authorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  const { id: _id, authorUid: _au, ...rest } = req.body;
  const data = fromClientPost(rest);
  const [row] = await db.update(posts).set(data).where(eq(posts.id, req.params.id)).returning();
  res.json(toClientPost(row));
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
    .where(and(
      eq(comments.postId, req.params.id),
      sql`NOT EXISTS (SELECT 1 FROM users WHERE uid = ${comments.authorUid} AND role = 'superadmin')`
    ))
    .orderBy(desc(comments.createdAt));
  res.json(rows.map(toClientComment));
});

// POST /api/posts/:id/comments
router.post('/:id/comments', requireAuth, async (req: AuthRequest, res) => {
  const id = nanoid();
  const { text, authorPhotoURL, uid: _uid, createdAt: _ca, ...rest } = req.body;
  const [row] = await db.insert(comments).values({
    id,
    postId:    req.params.id,
    authorUid: req.userId!,
    ...(text           !== undefined && { content:     text }),
    ...(authorPhotoURL !== undefined && { authorPhoto: authorPhotoURL }),
    ...rest,
  }).returning();
  res.status(201).json(toClientComment(row));
});

// DELETE /api/posts/:postId/comments/:commentId
router.delete('/:postId/comments/:commentId', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ authorUid: comments.authorUid }).from(comments).where(eq(comments.id, req.params.commentId)).limit(1);
  if (!existing || existing.authorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  await db.delete(comments).where(eq(comments.id, req.params.commentId));
  res.json({ success: true });
});

export default router;
