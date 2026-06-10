const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe("UPDATE teams SET status = 'pending' WHERE status::text NOT IN ('pending', 'approved')");
    console.log('Updated teams successfully');
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
