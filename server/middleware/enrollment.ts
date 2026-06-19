// BJJRats — Middleware que bloqueia alunos suspensos de acessar recursos da academia

import { Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { enrollments } from '../db/schema.js';
import { AuthRequest } from './auth.js';

/**
 * Bloqueia acesso se o aluno estiver suspenso da academia/professor.
 * Só afeta recursos da academia — a plataforma BJJRats continua funcionando.
 * 
 * O professorUid/studentUid são extraídos dos parâmetros da rota ou do body.
 */
export function requireActiveEnrollment(getIds: (req: AuthRequest) => { professorUid?: string; studentUid?: string } | null) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const ids = getIds(req);
      if (!ids?.professorUid || !ids?.studentUid) {
        // Se não tem os IDs, permite (rota pública ou auto-referenciada)
        next();
        return;
      }

      const [enrollment] = await db
        .select({ status: enrollments.status })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.professorUid, ids.professorUid),
            eq(enrollments.studentUid, ids.studentUid),
          ),
        )
        .limit(1);

      if (enrollment && enrollment.status === 'suspended') {
        res.status(403).json({
          error: 'Sua matrícula nesta academia está suspensa. Entre em contato com o professor.',
          code: 'enrollment_suspended',
        });
        return;
      }

      next();
    } catch (err) {
      console.error('[enrollments] Erro ao verificar suspensão:', err);
      next(); // falha aberta — não bloqueia por erro
    }
  };
}
