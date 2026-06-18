import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_production';

// Hierarquia: superadmin > academy/admin legado > professor > student
export const ROLE_HIERARCHY: Record<string, number> = {
  superadmin: 4,
  academy:    3,
  admin:      3,
  professor:  2,
  student:    1,
};

export interface AuthRequest extends Request {
  userId?:   string;
  userRole?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  // Lê token do cookie HTTP-only primeiro (mais seguro), fallback para header
  const cookieToken = (req as any).cookies?.token;
  const headerToken = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  const token = cookieToken || headerToken;
  if (!token) {
    res.status(401).json({ error: 'Não autorizado' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { uid: string; role?: string; communityModerator?: boolean };
    req.userId   = payload.uid;
    req.userRole = payload.role ?? 'student';
    (req as any).isCommunityModerator = payload.communityModerator ?? false;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

/** Middleware que exige um dos roles listados (use APÓS requireAuth) */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }
    next();
  };
}

export function signToken(uid: string, role: string, communityModerator?: boolean): string {
  return jwt.sign({ uid, role, communityModerator }, JWT_SECRET, { expiresIn: '30d' });
}
