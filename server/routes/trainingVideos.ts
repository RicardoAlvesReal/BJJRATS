import { Router } from 'express';
import { eq, desc, and, ilike } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { trainingVideos, users } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// ─── GET /api/training-videos ────────────────────────────────────────────────
// Lista vídeos de treinamentos compartilhados ou do próprio usuário
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { my, category, belt } = req.query as { my?: string; category?: string; belt?: string };

    let query = db.select().from(trainingVideos);

    const conditions = [];
    if (my === 'true') {
      conditions.push(eq(trainingVideos.userUid, req.userId!));
    }
    if (category && category !== 'all') {
      conditions.push(eq(trainingVideos.category, category));
    }
    if (belt && belt !== 'all') {
      conditions.push(ilike(trainingVideos.userBelt, `%${belt}%`));
    }

    const rows = await (conditions.length > 0
      ? query.where(and(...conditions)).orderBy(desc(trainingVideos.createdAt))
      : query.orderBy(desc(trainingVideos.createdAt)));

    res.json(rows);
  } catch (err) {
    console.error('[training-videos list error]', err);
    res.status(500).json({ error: 'Erro ao listar vídeos de treino' });
  }
});

// ─── POST /api/training-videos ───────────────────────────────────────────────
// Salva novo vídeo de treino (com validação de até 120 segundos)
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { title, description, videoUrl, thumbnailUrl, durationSeconds, category, techniques } = req.body as {
    title?: string;
    description?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
    category?: string;
    techniques?: string[];
  };

  if (!title?.trim() || !videoUrl?.trim()) {
    res.status(400).json({ error: 'Título e URL do vídeo são obrigatórios.' });
    return;
  }

  // Validação rígida de 2 minutos (120 segundos)
  const duration = Math.round(Number(durationSeconds) || 0);
  if (duration > 120) {
    res.status(400).json({
      error: 'O vídeo não pode ultrapassar 2 minutos (120 segundos).',
      maxSeconds: 120,
      receivedSeconds: duration,
    });
    return;
  }

  try {
    const [user] = await db
      .select({
        role: users.role,
        isAcademyAdmin: users.isAcademyAdmin,
        name: users.name,
        photo: users.photo,
        belt: users.belt,
        academyId: users.academyId,
        academyName: users.academyName,
        academy: users.academy,
      })
      .from(users)
      .where(eq(users.uid, req.userId!))
      .limit(1);

    const userRole = (user?.role || '').toLowerCase();
    const beltLower = (user?.belt || '').toLowerCase();

    const isMasterOrProfessor =
      userRole === 'professor' ||
      userRole === 'academy' ||
      userRole === 'admin' ||
      userRole === 'superadmin' ||
      userRole === 'mestre' ||
      user?.isAcademyAdmin === true;

    const isBlackBeltOrAbove =
      beltLower.includes('pret') ||
      beltLower.includes('coral') ||
      beltLower.includes('vermelh') ||
      beltLower.includes('mestre');

    if (!isMasterOrProfessor && !isBlackBeltOrAbove) {
      res.status(403).json({
        error: 'Apenas professores, academias e alunos faixa-preta para cima têm permissão para publicar vídeos de treino.',
      });
      return;
    }

    const videoId = nanoid();
    const [created] = await db
      .insert(trainingVideos)
      .values({
        id: videoId,
        userUid: req.userId!,
        userName: user?.name || 'Atleta',
        userPhoto: user?.photo || null,
        userBelt: user?.belt || 'Branca',
        academyId: user?.academyId || null,
        academyName: user?.academyName || user?.academy || null,
        title: title.trim(),
        description: description?.trim() || null,
        videoUrl: videoUrl.trim(),
        thumbnailUrl: thumbnailUrl?.trim() || null,
        durationSeconds: duration,
        category: category || 'posicao',
        techniques: techniques || [],
        likes: [],
        commentCount: 0,
      })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    console.error('[training-videos create error]', err);
    res.status(500).json({ error: 'Erro ao salvar vídeo de treino' });
  }
});

// ─── DELETE /api/training-videos/:id ─────────────────────────────────────────
// Exclui vídeo de treino (apenas autor ou superadmin)
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const [video] = await db
      .select()
      .from(trainingVideos)
      .where(eq(trainingVideos.id, id))
      .limit(1);

    if (!video) {
      res.status(404).json({ error: 'Vídeo não encontrado' });
      return;
    }

    if (video.userUid !== req.userId && req.userRole !== 'superadmin') {
      res.status(403).json({ error: 'Sem permissão para excluir este vídeo' });
      return;
    }

    await db.delete(trainingVideos).where(eq(trainingVideos.id, id));
    res.json({ success: true, id });
  } catch (err) {
    console.error('[training-videos delete error]', err);
    res.status(500).json({ error: 'Erro ao excluir vídeo de treino' });
  }
});

// ─── POST /api/training-videos/:id/like ───────────────────────────────────────
// Alterna curtida em um vídeo
router.post('/:id/like', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const uid = req.userId!;

  try {
    const [video] = await db
      .select()
      .from(trainingVideos)
      .where(eq(trainingVideos.id, id))
      .limit(1);

    if (!video) {
      res.status(404).json({ error: 'Vídeo não encontrado' });
      return;
    }

    const currentLikes = Array.isArray(video.likes) ? (video.likes as string[]) : [];
    const alreadyLiked = currentLikes.includes(uid);
    const updatedLikes = alreadyLiked
      ? currentLikes.filter(u => u !== uid)
      : [...currentLikes, uid];

    await db
      .update(trainingVideos)
      .set({ likes: updatedLikes })
      .where(eq(trainingVideos.id, id));

    res.json({
      success: true,
      liked: !alreadyLiked,
      likesCount: updatedLikes.length,
      likes: updatedLikes,
    });
  } catch (err) {
    console.error('[training-videos like error]', err);
    res.status(500).json({ error: 'Erro ao curtir vídeo' });
  }
});

export default router;
