import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || 'uploads');

/** Categorias válidas de upload */
const VALID_CATEGORIES = new Set([
  'perfil', 'comunidade', 'treinos', 'videos', 'mensalidades', 'desafios', 'geral', 'comprovantes', 'avisos', 'pix',
]);

/** Sanitiza nome para uso em paths de diretório (remove acentos e chars especiais) */
function sanitizeName(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    || 'sem-nome'
  );
}

/** Mapeia role para pasta raiz */
function roleFolderName(role: string, isAcademyAdmin = false): string {
  if (role === 'academy' || role === 'admin' || role === 'superadmin' || isAcademyAdmin) return 'academias';
  if (role === 'professor') return 'professores';
  return 'alunos';
}

// Multer em memória para permitir compressão com sharp antes de gravar em disco
const storage = multer.memoryStorage();

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v',
]);
const upload = multer({
  storage,
  limits: { fileSize: 60 * 1024 * 1024 }, // 60 MB (suficiente para vídeos comprimidos de 2min)
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido'));
  },
});

const router = Router();

// POST /api/upload?category=treinos
// Comprime imagens para WebP com sharp (max 1920px) e salva em disco com economia de até 90%
router.post('/', requireAuth, upload.single('file'), async (req: AuthRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Nenhum arquivo enviado' });
    return;
  }

  try {
    const userId   = req.userId!;
    const userRole = req.userRole ?? 'student';
    const rawCat   = (req.query.category as string) || 'geral';
    const category = VALID_CATEGORIES.has(rawCat) ? rawCat : 'geral';

    // Busca nome do usuário no banco para criar pasta legível
    const [user] = await db
      .select({ name: users.name, isAcademyAdmin: users.isAcademyAdmin })
      .from(users)
      .where(eq(users.uid, userId))
      .limit(1);

    const folderName = sanitizeName(user?.name ?? userId);
    const roleFolder = roleFolderName(userRole, user?.isAcademyAdmin === true);

    // uploads/{alunos|professores|academias}/{nome}/{categoria}/
    const dir = path.join(UPLOADS_DIR, roleFolder, folderName, category);
    await fs.promises.mkdir(dir, { recursive: true });

    const isCompressibleImage =
      req.file.mimetype.startsWith('image/') && req.file.mimetype !== 'image/gif';

    let outputFilename: string;
    let outputPath: string;

    if (isCompressibleImage) {
      // Converte e comprime para WebP otimizado (80% qualidade, max 1920x1920)
      outputFilename = `${nanoid()}.webp`;
      outputPath = path.join(dir, outputFilename);

      await sharp(req.file.buffer)
        .rotate() // orienta automaticamente conforme EXIF (evita fotos de celular viradas)
        .resize({
          width: 1920,
          height: 1920,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80, effort: 4 })
        .toFile(outputPath);
    } else {
      const extMap: Record<string, string> = {
        'video/mp4': '.mp4',
        'video/webm': '.webm',
        'video/quicktime': '.mov',
        'video/x-m4v': '.m4v',
        'image/gif': '.gif',
      };
      const ext =
        path.extname(req.file.originalname).toLowerCase() ||
        extMap[req.file.mimetype] ||
        '.bin';
      outputFilename = `${nanoid()}${ext}`;
      outputPath = path.join(dir, outputFilename);
      await fs.promises.writeFile(outputPath, req.file.buffer);
    }

    const relPath = path.relative(UPLOADS_DIR, outputPath).replace(/\\/g, '/');
    res.json({ url: `/uploads/${relPath}` });
  } catch (err) {
    console.error('[Upload error]', err);
    res.status(500).json({ error: 'Erro ao processar e salvar arquivo' });
  }
});

export default router;
