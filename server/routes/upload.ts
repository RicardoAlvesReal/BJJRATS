import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || 'uploads');

/** Categorias válidas de upload */
const VALID_CATEGORIES = new Set([
  'perfil', 'comunidade', 'treinos', 'mensalidades', 'desafios', 'geral',
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
function roleFolderName(role: string): string {
  if (role === 'professor') return 'professores';
  if (role === 'admin' || role === 'superadmin') return 'academias';
  return 'alunos';
}

const storage = multer.diskStorage({
  destination: (req: AuthRequest, _file, cb) => {
    (async () => {
      const userId   = req.userId!;
      const userRole = req.userRole ?? 'student';
      const rawCat   = (req.query.category as string) || 'geral';
      const category = VALID_CATEGORIES.has(rawCat) ? rawCat : 'geral';

      // Busca nome do usuário no banco para criar pasta legível
      const [user] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.uid, userId))
        .limit(1);

      const folderName = sanitizeName(user?.name ?? userId);
      const roleFolder = roleFolderName(userRole);

      // uploads/{alunos|professores|academias}/{nome}/{categoria}/
      const dir = path.join(UPLOADS_DIR, roleFolder, folderName, category);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    })().catch(err => cb(err as Error, ''));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${nanoid()}${ext}`);
  },
});

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4']);
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido'));
  },
});

const router = Router();

// POST /api/upload?category=perfil
// Retorna { url: '/uploads/alunos/joao-silva/perfil/<filename>' }
router.post('/', requireAuth, upload.single('file'), (req: AuthRequest, res) => {
  if (!req.file) { res.status(400).json({ error: 'Nenhum arquivo enviado' }); return; }
  const relPath = path.relative(UPLOADS_DIR, req.file.path).replace(/\\/g, '/');
  res.json({ url: `/uploads/${relPath}` });
});

export default router;
