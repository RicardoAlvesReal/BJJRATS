import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from './index.js';
import { users, plans } from './schema.js';

const EMAIL    = process.env.SUPERADMIN_EMAIL    || 'admin@bjjrats.com';
const PASSWORD = process.env.SUPERADMIN_PASSWORD || 'Admin@123';
const NAME     = process.env.SUPERADMIN_NAME     || 'Super Admin';

async function seed() {
  // ─── Superadmin ──────────────────────────────────────────────────────────
  const existing = await db
    .select({ uid: users.uid })
    .from(users)
    .where(eq(users.email, EMAIL.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    console.log(`✓ Superadmin já existe: ${EMAIL}`);
  } else {
    const uid          = nanoid();
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    await db.insert(users).values({
      uid,
      name:              NAME,
      email:             EMAIL.toLowerCase(),
      passwordHash,
      belt:              'Preta',
      role:              'superadmin',
      isAcademyAdmin:    true,
      subscriptionExempt: true,
    });

    console.log('✓ Superadmin criado com sucesso!');
    console.log(`  Email : ${EMAIL}`);
    console.log(`  Senha : ${PASSWORD}`);
  }

  // ─── Planos de assinatura ────────────────────────────────────────────────
  const planos = [
    {
      slug: 'aluno',
      name: 'Aluno',
      description: 'Registre seus treinos, acompanhe sua evolução, participe da comunidade.',
      price: 19.90,
      roleAssigned: 'student',
      features: [
        'training_tracking',
        'training_history',
        'streak',
        'community',
        'achievements',
        'competitions',
        'goals',
        'challenges',
        'events',
        'profile_stats',
      ],
    },
    {
      slug: 'professor',
      name: 'Professor Particular',
      description: 'Gerencie seus alunos com exclusividade e acompanhe o desenvolvimento de cada um.',
      price: 47.90,
      roleAssigned: 'academy',
      features: [
        'professor_panel',
        'student_management',
        'unlimited_students',
        'enrollments',
        'payments',
        'promotions',
        'class_schedules',
        'class_checkins',
        'training_analytics',
        'exclusive_student_attention',
      ],
    },
    {
      slug: 'academia',
      name: 'Academia',
      description: 'Gestão completa da sua academia com múltiplos professores, CRM e relatórios.',
      price: 97.90,
      roleAssigned: 'professor',
      features: [
        'admin_dashboard',
        'user_management',
        'crm',
        'multiple_professors',
        'class_schedules',
        'class_checkins',
        'reports',
        'enrollments',
        'payments',
        'promotions',
        'revenue_analytics',
      ],
    },
  ];

  for (const p of planos) {
    const exists = await db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.slug, p.slug))
      .limit(1);

    if (exists.length > 0) {
      console.log(`✓ Plano já existe: ${p.name}`);
    } else {
      await db.insert(plans).values({
        id: nanoid(),
        ...p,
      });
      console.log(`✓ Plano criado: ${p.name} (R$ ${p.price.toFixed(2)})`);
    }
  }

  console.log('\nSeed finalizado!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
