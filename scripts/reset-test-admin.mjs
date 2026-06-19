import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: '.env.development' });
const prisma = new PrismaClient();

const email = process.env.ADMIN_EMAIL || 'admin@admin.com';
const password = process.env.ADMIN_PASSWORD || 'admin123';
const hash = await bcrypt.hash(password, 10);

await prisma.user.update({
  where: { email },
  data: { passwordHash: hash, isActive: true, role: 'admin' },
});

console.log(`Updated password for ${email}`);
await prisma.$disconnect();
