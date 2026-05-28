import 'dotenv/config';
import { db } from './db/index.js';
import { users } from './db/schema.js';
import { ne } from 'drizzle-orm';

async function main() {
  const all = await db.select({
    uid: users.uid, name: users.name, email: users.email,
    role: users.role, academy: users.academy,
    academyName: users.academyName, academyCity: users.academyCity
  }).from(users).where(ne(users.role, 'superadmin'));
  console.log(JSON.stringify(all, null, 2));
  process.exit(0);
}
main();
