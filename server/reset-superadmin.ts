// Script para redefinir senha do superadmin
// Uso: npx tsx server/reset-superadmin.ts <email> <nova-senha>
// Exemplo: npx tsx server/reset-superadmin.ts admin@bjjrats.com NovaSenha@123

import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './db/index.js';
import { users } from './db/schema.js';

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error('Uso: npx tsx server/reset-superadmin.ts <email> <nova-senha>');
    console.error('Exemplo: npx tsx server/reset-superadmin.ts admin@bjjrats.com NovaSenha@123');
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error('A senha deve ter pelo menos 6 caracteres.');
    process.exit(1);
  }

  const [user] = await db
    .select({ uid: users.uid, role: users.role, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    console.error(`Usuário com email "${email}" não encontrado.`);
    process.exit(1);
  }

  if (user.role !== 'superadmin') {
    console.error(`O usuário "${email}" não é superadmin (role: ${user.role}). Use este script apenas para superadmins.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.uid, user.uid));

  console.log(`✓ Senha do superadmin "${user.name || email}" redefinida com sucesso.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
