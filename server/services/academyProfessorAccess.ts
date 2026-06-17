import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { academyProfessorLinks } from '../db/schema.js';

export async function isInternalAcademyProfessor(userId: string, role?: string | null) {
  if (role !== 'professor') return false;

  const [link] = await db
    .select({ id: academyProfessorLinks.id })
    .from(academyProfessorLinks)
    .where(and(
      eq(academyProfessorLinks.professorUid, userId),
      eq(academyProfessorLinks.relationType, 'internal'),
      eq(academyProfessorLinks.status, 'active'),
    ))
    .limit(1);

  return Boolean(link);
}
