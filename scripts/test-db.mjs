import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: '.env.development' });

const prisma = new PrismaClient();

try {
  await prisma.$connect();
  const count = await prisma.user.count();
  console.log('DB OK, users:', count);
} catch (e) {
  console.error('DB FAIL:', e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
