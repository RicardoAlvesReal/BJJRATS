import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from './index.js';
import { users } from './schema.js';

const EMAIL    = process.env.SUPERADMIN_EMAIL    || 'admin@bjjrats.com';
const PASSWORD = process.env.SUPERADMIN_PASSWORD || 'Admin@123';
const NAME     = process.env.SUPERADMIN_NAME     || 'Super Admin';

async function seed() {
  const existing = await db
    .select({ uid: users.uid })
    .from(users)
    .where(eq(users.email, EMAIL.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    console.log(`✓ Superadmin já existe: ${EMAIL}`);
    process.exit(0);
  }

  const uid          = nanoid();
  const inviteCode   = uid.substring(0, 6).toUpperCase();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  await db.insert(users).values({
    uid,
    name:           NAME,
    email:          EMAIL.toLowerCase(),
    passwordHash,
    belt:           'Preta',
    role:           'superadmin',
    inviteCode,
    isAcademyAdmin: true,
  });

  console.log('✓ Superadmin criado com sucesso!');
  console.log(`  Email : ${EMAIL}`);
  console.log(`  Senha : ${PASSWORD}`);
  console.log('\n⚠️  Altere a senha após o primeiro login!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Erro ao criar superadmin:', err);
  process.exit(1);
});
