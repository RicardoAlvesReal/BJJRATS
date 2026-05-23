import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import {
  requireAuth,
  requireRole,
  ROLE_HIERARCHY,
  type AuthRequest,
} from '../middleware/auth.js';

const router = Router();

// Retorna true se o ator pode gerenciar o targetRole
function canManage(actorRole: string, targetRole: string): boolean {
  return (ROLE_HIERARCHY[actorRole] ?? 0) > (ROLE_HIERARCHY[targetRole] ?? 0);
}

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// Lista usuários com role abaixo do solicitante
router.get(
  '/users',
  requireAuth,
  requireRole('superadmin', 'admin', 'professor'),
  async (req: AuthRequest, res) => {
    const actorRole = req.userRole!;
    const all = await db
      .select({
        uid:         users.uid,
        name:        users.name,
        email:       users.email,
        role:        users.role,
        belt:        users.belt,
        stripes:     users.stripes,
        academyId:   users.academyId,
        academyName: users.academyName,
        phone:       users.phone,
        createdAt:   users.createdAt,
      })
      .from(users);

    const filtered = all.filter((u) => canManage(actorRole, u.role ?? 'student'));
    res.json({ users: filtered });
  }
);

// ─── POST /api/admin/users ────────────────────────────────────────────────────
// Cria um usuário com role abaixo do solicitante
router.post(
  '/users',
  requireAuth,
  requireRole('superadmin', 'admin', 'professor'),
  async (req: AuthRequest, res) => {
    const actorRole = req.userRole!;
    const {
      name, email, password,
      role = 'student',
      belt = 'Branca',
      ...rest
    } = req.body as Record<string, string>;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'name, email e password são obrigatórios' });
      return;
    }

    if (!canManage(actorRole, role)) {
      res.status(403).json({ error: `Você não pode criar usuários com role "${role}"` });
      return;
    }

    const existing = await db
      .select({ uid: users.uid })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing.length) {
      res.status(409).json({ error: 'E-mail já cadastrado' });
      return;
    }

    const uid          = nanoid();
    const inviteCode   = uid.substring(0, 6).toUpperCase();
    const passwordHash = await bcrypt.hash(password, 10);

    await db.insert(users).values({
      uid,
      name,
      email:          email.toLowerCase(),
      passwordHash,
      belt,
      role,
      inviteCode,
      academy:        rest.academy        || '',
      academyId:      rest.academyId      || null,
      professor:      rest.professor      || '',
      academyName:    rest.academyName    || null,
      academyCity:    rest.academyCity    || null,
      academyState:   rest.academyState   || null,
      phone:          rest.phone          || null,
    });

    const [user] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    res.status(201).json({ user: sanitize(user) });
  }
);

// ─── PATCH /api/admin/users/:uid ─────────────────────────────────────────────
// Edita dados ou role de um usuário
router.patch(
  '/users/:uid',
  requireAuth,
  requireRole('superadmin', 'admin'),
  async (req: AuthRequest, res) => {
    const actorRole = req.userRole!;
    const { uid } = req.params;

    const [target] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (!target) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }
    if (!canManage(actorRole, target.role ?? 'student')) {
      res.status(403).json({ error: 'Sem permissão para editar este usuário' });
      return;
    }

    const { password, role: newRole, ...fields } = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { ...fields };

    if (password) {
      updates.passwordHash = await bcrypt.hash(password as string, 10);
    }
    if (newRole) {
      if (!canManage(actorRole, newRole as string)) {
        res.status(403).json({ error: `Você não pode atribuir o role "${newRole}"` });
        return;
      }
      updates.role = newRole;
    }

    await db.update(users).set(updates).where(eq(users.uid, uid));
    const [updated] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    res.json({ user: sanitize(updated) });
  }
);

// ─── DELETE /api/admin/users/:uid ────────────────────────────────────────────
router.delete(
  '/users/:uid',
  requireAuth,
  requireRole('superadmin', 'admin'),
  async (req: AuthRequest, res) => {
    const actorRole = req.userRole!;
    const { uid } = req.params;

    if (uid === req.userId) {
      res.status(400).json({ error: 'Você não pode deletar a si mesmo' });
      return;
    }

    const [target] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (!target) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }
    if (!canManage(actorRole, target.role ?? 'student')) {
      res.status(403).json({ error: 'Sem permissão para deletar este usuário' });
      return;
    }

    await db.delete(users).where(eq(users.uid, uid));
    res.json({ success: true });
  }
);

function sanitize(u: typeof users.$inferSelect) {
  const { passwordHash: _, ...rest } = u as any;
  return rest;
}

export default router;
