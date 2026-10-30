import { Router } from 'express';
import { eq, and, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { posts, comments } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { requireFeature } from '../middleware/features.js';
import { getCache, setCache, invalidateFeedCache } from '../services/redis.js';

const router = Router();

// Mapeamento de campos: cliente usa nomes legados do Firestore; DB usa nomes do schema Drizzle
function toClientPost(row: Record<string, any>) {
  const trainingData = row.trainingData && typeof row.trainingData === 'object' && !Array.isArray(row.trainingData)
    ? row.trainingData
    : {};
  const category = trainingData.category || row.category || (row.postType === 'training' ? 'treino' : 'geral');
  return {
    ...row,
    type:          category,
    text:          row.content,
    photoURL:      row.mediaUrl,
    authorPhotoURL: row.authorPhoto,
    feedTarget:    row.postType,
    uid:           row.authorUid,
  };
}

function fromClientPost(body: Record<string, any>) {
  const { uid: _uid, text, photoURL, authorPhotoURL, feedTarget, type,
          createdAt: _ca, updatedAt: _ua, commentCount: _cc, ...rest } = body;
  const trainingData = rest.trainingData && typeof rest.trainingData === 'object' && !Array.isArray(rest.trainingData)
    ? rest.trainingData
    : {};
  const postCategory = typeof type === 'string' && type.trim() ? type.trim() : undefined;
  delete rest.trainingData;

  return {
    ...(text           !== undefined && { content:     text }),
    ...(photoURL       !== undefined && { mediaUrl:    photoURL }),
    ...(authorPhotoURL !== undefined && { authorPhoto: authorPhotoURL }),
    ...(feedTarget     !== undefined && { postType:    feedTarget }),
    ...((postCategory || Object.keys(trainingData).length > 0) && {
      trainingData: postCategory ? { ...trainingData, category: postCategory } : trainingData,
    }),
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

// GET /api/posts?academyId=...&type=academy&limit=...&page=...&cursor=...
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { academyId, type, limit, page, cursor } = req.query as Record<string, string>;

  // Limite seguro de paginação para suportar escala de 100k - 200k usuários (default 50, máx 100)
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const pageNum = parseInt(page, 10);
  const offsetNum = pageNum && pageNum > 1 ? (pageNum - 1) * limitNum : 0;

  // Chave de cache individualizada por filtro de feed
  const cacheKey = `feed:${type || 'all'}:${academyId || 'all'}:lim${limitNum}:p${pageNum || 1}:cur${cursor || 'none'}`;

  // 1. Tenta recuperar do Redis (latência de sub-milissegundo)
  const cached = await getCache<any[]>(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  // 2. Se não estiver em cache, consulta Postgres com índices otimizados
  let query = db.select().from(posts).$dynamic().orderBy(desc(posts.createdAt));
  const conditions: any[] = [];
  if (type)      conditions.push(eq(posts.postType, type));
  if (academyId) conditions.push(eq(posts.academyId, academyId));
  if (cursor) {
    const cursorDate = new Date(cursor);
    if (!isNaN(cursorDate.getTime())) {
      conditions.push(sql`${posts.createdAt} < ${cursorDate}`);
    }
  }

  if (conditions.length) {
    query = query.where(and(...conditions)) as any;
  }

  query = query.limit(limitNum).offset(offsetNum) as any;

  const rows = await query;
  const result = rows.map(toClientPost);

  // 3. Salva no Redis (TTL de 60s para manter consistência)
  await setCache(cacheKey, result, 60);

  res.json(result);
});

// GET /api/posts/:id
router.get('/:id', requireAuth, async (req, res) => {
  const cacheKey = `post:${req.params.id}`;
  const cached = await getCache<any>(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const [row] = await db.select().from(posts).where(eq(posts.id, req.params.id)).limit(1);
  if (!row) { res.status(404).json({ error: 'Post não encontrado' }); return; }
  const result = toClientPost(row);
  await setCache(cacheKey, result, 120);
  res.json(result);
});

// POST /api/posts
router.post('/', requireAuth, requireFeature('community'), async (req: AuthRequest, res) => {
  const id = nanoid();
  const data = fromClientPost(req.body);
  const [row] = await db.insert(posts).values({ id, authorUid: req.userId!, ...data }).returning();

  // Invalida cache do feed para publicação instantânea
  await invalidateFeedCache();

  res.status(201).json(toClientPost(row));
});

// PATCH /api/posts/:id
router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ authorUid: posts.authorUid }).from(posts).where(eq(posts.id, req.params.id)).limit(1);
  if (!existing) { res.status(404).json({ error: 'Post não encontrado' }); return; }
  const isModOrSuper = req.userRole === 'superadmin' || (req as any).isCommunityModerator;
  const { id: _id, authorUid: _au, ...rest } = req.body;

  // Curtir (likes) e comentar (commentCount) — qualquer usuário logado pode
  const isLikeOrCommentUpdate = rest.likes !== undefined || rest.commentCount !== undefined;
  const onlyLikesOrComments = Object.keys(rest).every(k => k === 'likes' || k === 'commentCount');

  if (!isModOrSuper && existing.authorUid !== req.userId) {
    if (!isLikeOrCommentUpdate || !onlyLikesOrComments) {
      res.status(403).json({ error: 'Proibido' });
      return;
    }
  }

  const data = fromClientPost(rest);
  if (Object.keys(data).length === 0) { res.json(toClientPost(existing)); return; }
  const [row] = await db.update(posts).set(data).where(eq(posts.id, req.params.id)).returning();

  // Invalida cache do post e do feed
  await invalidateFeedCache();
  await setCache(`post:${req.params.id}`, toClientPost(row), 120);

  res.json(toClientPost(row));
});

// DELETE /api/posts/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ authorUid: posts.authorUid }).from(posts).where(eq(posts.id, req.params.id)).limit(1);
  if (!existing) { res.status(404).json({ error: 'Post não encontrado' }); return; }
  const isModOrSuper = req.userRole === 'superadmin' || (req as any).isCommunityModerator;
  if (!isModOrSuper && existing.authorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  await db.delete(posts).where(eq(posts.id, req.params.id));

  // Invalida cache do feed e do post removido
  await invalidateFeedCache();

  res.json({ success: true });
});

// ─── Comments ────────────────────────────────────────────────────────────────
// GET /api/posts/:id/comments
router.get('/:id/comments', requireAuth, async (req, res) => {
  const rows = await db.select().from(comments)
    .where(eq(comments.postId, req.params.id))
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

  // Atualizar commentCount no post
  const [cnt] = await db.select({ count: sql<number>`count(*)` }).from(comments).where(eq(comments.postId, req.params.id));
  await db.update(posts).set({ commentCount: cnt.count }).where(eq(posts.id, req.params.id));

  // Invalida cache do feed para refletir o commentCount atualizado
  await invalidateFeedCache();

  res.status(201).json(toClientComment(row));
});

// DELETE /api/posts/:postId/comments/:commentId
router.delete('/:postId/comments/:commentId', requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select({ authorUid: comments.authorUid }).from(comments).where(eq(comments.id, req.params.commentId)).limit(1);
  if (!existing) { res.status(404).json({ error: 'Comentário não encontrado' }); return; }
  const isModOrSuper = req.userRole === 'superadmin' || (req as any).isCommunityModerator;
  if (!isModOrSuper && existing.authorUid !== req.userId) { res.status(403).json({ error: 'Proibido' }); return; }
  await db.delete(comments).where(eq(comments.id, req.params.commentId));

  // Atualizar commentCount no post
  const [cnt] = await db.select({ count: sql<number>`count(*)` }).from(comments).where(eq(comments.postId, req.params.postId));
  await db.update(posts).set({ commentCount: cnt.count }).where(eq(posts.id, req.params.postId));

  // Invalida cache do feed para refletir o commentCount atualizado
  await invalidateFeedCache();

  res.json({ success: true });
});

export default router;
