import { Router } from 'express';
import { eq, and, ilike, or, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

const router = Router();

// GET /api/public/professors?search=term
router.get('/professors', async (req, res) => {
  const { search } = req.query as Record<string, string>;
  const conditions = [ne(users.role, 'superadmin'), or(eq(users.role, 'professor'), eq(users.role, 'admin'))];
  if (search) {
    conditions.push(
      or(
        ilike(users.academyName, `%${search}%`),
        ilike(users.name, `%${search}%`),
        ilike(users.academyCity, `%${search}%`),
      )
    );
  }
  const result = await db
    .select({
      uid: users.uid,
      name: users.name,
      academyName: users.academyName,
      academyCity: users.academyCity,
    })
    .from(users)
    .where(and(...conditions))
    .limit(20);
  res.json(result);
});

// GET /api/public/invite/:code
router.get('/invite/:code', async (req, res) => {
  const code = req.params.code.toUpperCase();
  if (code.length !== 6) {
    res.status(400).json({ error: 'Código deve ter 6 caracteres' });
    return;
  }
  const [user] = await db
    .select({
      uid: users.uid,
      name: users.name,
      academyName: users.academyName,
    })
    .from(users)
    .where(and(ne(users.role, 'student'), ne(users.role, 'superadmin'), ilike(users.uid, `${code}%`)))
    .limit(1);
  if (!user) {
    res.status(404).json({ error: 'Código inválido' });
    return;
  }
  res.json(user);
});

export default router;
