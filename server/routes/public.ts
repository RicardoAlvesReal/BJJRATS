import { Router } from 'express';
import { eq, and, ilike, or, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

const router = Router();

// GET /api/public/professors?search=term&role=professor
router.get('/professors', async (req, res) => {
  const { search, role } = req.query as Record<string, string>;
  const roleFilter = role === 'admin' ? eq(users.role, 'admin')
    : role === 'professor' ? eq(users.role, 'professor')
    : or(eq(users.role, 'professor'), eq(users.role, 'admin'));
  const conditions = [ne(users.role, 'superadmin'), roleFilter];
  if (search) {
    conditions.push(
      or(
        ilike(users.academyName, `%${search}%`),
        ilike(users.academy, `%${search}%`),
        ilike(users.name, `%${search}%`),
        ilike(users.academyCity, `%${search}%`),
      )
    );
  }
  const result = await db
    .select({
      uid: users.uid,
      name: users.name,
      academy: users.academy,
      academyName: users.academyName,
      academyCity: users.academyCity,
    })
    .from(users)
    .where(and(...conditions))
    .limit(50);
  res.json(result);
});

export default router;
